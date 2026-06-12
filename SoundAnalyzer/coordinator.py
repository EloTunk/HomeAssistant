"""DataUpdateCoordinator for SoundAnalyzer for Netatmo integration."""

import inspect
import logging
from datetime import timedelta
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

_LOGGER = logging.getLogger(__name__)


class SoundAnalyzerCoordinator(DataUpdateCoordinator):
    """Class to manage fetching data from Netatmo soundsensor."""

    def __init__(
        self,
        hass: HomeAssistant,
        netatmo_account: Any,
        update_interval: timedelta,
    ) -> None:
        """Initialize coordinator.
        
        Args:
            hass: HomeAssistant instance
            netatmo_account: Netatmo account instance
            update_interval: Interval between updates
        """
        super().__init__(
            hass,
            _LOGGER,
            name="SoundAnalyzer for Netatmo",
            update_interval=update_interval,
        )
        self.netatmo_account = netatmo_account

    async def _async_refresh_account(self) -> None:
        """Refresh account data for both sync and async pyatmo variants."""
        if callable(getattr(self.netatmo_account, "update", None)):
            await self.hass.async_add_executor_job(self.netatmo_account.update)
            return

        if callable(getattr(self.netatmo_account, "async_update", None)):
            result = self.netatmo_account.async_update()
            if inspect.isawaitable(result):
                await result
            return

        if callable(
            getattr(self.netatmo_account, "async_update_topology", None)
        ):
            result = self.netatmo_account.async_update_topology()
            if inspect.isawaitable(result):
                await result
            return

        raise UpdateFailed(
            "Unsupported Netatmo account object: no update method available"
        )

    @staticmethod
    def _iter_items(container: Any):
        """Yield objects from list/tuple/set or dict values."""
        if container is None:
            return []
        if isinstance(container, dict):
            return container.values()
        if isinstance(container, (list, tuple, set)):
            return container
        return []

    def _read_sound_data_from_states(self) -> dict[str, Any]:
        """Read Netatmo sound sensors directly from Home Assistant states."""
        sound_data: dict[str, Any] = {}

        for state in self.hass.states.async_all("sensor"):
            attrs = state.attributes
            device_class = attrs.get("device_class")
            unit = attrs.get("unit_of_measurement")
            attribution = str(attrs.get("attribution", ""))

            if device_class != "sound_pressure":
                continue

            if unit != "dB":
                continue

            # Limit to Netatmo-provided sensors to avoid unrelated noise sensors.
            if "netatmo" not in attribution.lower() and not state.entity_id.startswith(
                "sensor.netatmo"
            ):
                continue

            try:
                sound_level = float(state.state)
            except (TypeError, ValueError):
                continue

            display_name = attrs.get("friendly_name", state.entity_id)
            sound_data[display_name] = {
                "sound_level": sound_level,
                "device_id": state.entity_id,
                "home_name": attrs.get("home_name", "Netatmo"),
            }

        return sound_data

    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch sound sensor data from Netatmo."""
        try:
            # Preferred path: use already-available HA entity states.
            sound_data = self._read_sound_data_from_states()
            if sound_data:
                return sound_data

            # Fallback path: use pyatmo account runtime data when available.
            if self.netatmo_account is not None:
                await self._async_refresh_account()

                for home in self._iter_items(
                    getattr(self.netatmo_account, "homes", None)
                ):
                    for module in self._iter_items(getattr(home, "modules", None)):
                        if hasattr(module, "sound") and module.sound is not None:
                            module_name = getattr(
                                module,
                                "name",
                                getattr(module, "id", "unknown_module"),
                            )
                            sound_data[module_name] = {
                                "sound_level": module.sound,
                                "device_id": getattr(
                                    module,
                                    "entity_id",
                                    getattr(module, "id", module_name),
                                ),
                                "home_name": getattr(home, "name", "Unknown Home"),
                            }

            return sound_data

        except Exception as err:
            raise UpdateFailed(f"Error updating sound data: {err}") from err
