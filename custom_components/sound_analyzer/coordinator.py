"""DataUpdateCoordinator for SoundAnalyzer for Netatmo integration."""

import inspect
import asyncio
import logging
import time
from datetime import timedelta
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


class SoundAnalyzerCoordinator(DataUpdateCoordinator):
    """Class to manage fetching data from Netatmo soundsensor."""

    def __init__(
        self,
        hass: HomeAssistant,
        netatmo_account: Any,
        update_interval: timedelta,
        prefer_ha_states: bool = True,
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
        self.prefer_ha_states = prefer_ha_states

        # Shared resources (set in __init__.py) for coordinated pyatmo updates
        shared = hass.data.get(DOMAIN, {}).get("_shared", {})
        self._shared = shared
        self._shared_lock: asyncio.Lock | None = shared.get("update_lock")
        # Minimum seconds between direct pyatmo updates when performed
        self._min_update_interval = 5

    async def _async_refresh_account(self) -> None:
        """Refresh account data for both sync and async pyatmo variants."""
        if self.netatmo_account is None:
            raise UpdateFailed("No Netatmo account available for refresh")

        shared = self._shared or self.hass.data.get(DOMAIN, {}).get("_shared", {})
        lock: asyncio.Lock | None = shared.get("update_lock")

        now = time.monotonic()
        last = shared.get("last_update", 0)
        if now - last < self._min_update_interval:
            _LOGGER.debug(
                "Skipping pyatmo update; last update %.1fs ago", now - last
            )
            return

        # Use shared lock when available to prevent concurrent pyatmo updates
        if lock is not None:
            async with lock:
                last = shared.get("last_update", 0)
                now = time.monotonic()
                if now - last < self._min_update_interval:
                    _LOGGER.debug(
                        "Skipping pyatmo update inside lock; last update %.1fs ago",
                        now - last,
                    )
                    return

                try:
                    _LOGGER.debug("Performing pyatmo account update (locked)")
                    if callable(getattr(self.netatmo_account, "update", None)):
                        await self.hass.async_add_executor_job(
                            self.netatmo_account.update
                        )
                    elif callable(getattr(self.netatmo_account, "async_update", None)):
                        result = self.netatmo_account.async_update()
                        if inspect.isawaitable(result):
                            await result
                    elif callable(
                        getattr(self.netatmo_account, "async_update_topology", None)
                    ):
                        result = self.netatmo_account.async_update_topology()
                        if inspect.isawaitable(result):
                            await result
                    else:
                        raise UpdateFailed(
                            "Unsupported Netatmo account object: no update method available"
                        )

                    shared["last_update"] = time.monotonic()

                except Exception as err:  # noqa: BLE001 - log unexpected errors
                    _LOGGER.exception("Error while refreshing pyatmo account: %s", err)
                    raise UpdateFailed(f"Error refreshing Netatmo account: {err}") from err
                return

        # No shared lock available — perform best-effort update with diagnostics
        try:
            _LOGGER.debug("Performing pyatmo account update (no shared lock)")
            if callable(getattr(self.netatmo_account, "update", None)):
                await self.hass.async_add_executor_job(self.netatmo_account.update)
                shared["last_update"] = time.monotonic()
                return

            if callable(getattr(self.netatmo_account, "async_update", None)):
                result = self.netatmo_account.async_update()
                if inspect.isawaitable(result):
                    await result
                shared["last_update"] = time.monotonic()
                return

            if callable(
                getattr(self.netatmo_account, "async_update_topology", None)
            ):
                result = self.netatmo_account.async_update_topology()
                if inspect.isawaitable(result):
                    await result
                shared["last_update"] = time.monotonic()
                return

            raise UpdateFailed(
                "Unsupported Netatmo account object: no update method available"
            )
        except Exception as err:
            _LOGGER.exception("Error while refreshing pyatmo account without lock: %s", err)
            raise UpdateFailed(f"Error refreshing Netatmo account: {err}") from err

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

            # Fallback path: use pyatmo account runtime data when available
            # unless the integration is configured to prefer Home Assistant states
            # (to avoid conflicts with other Netatmo consumers).
            if not self.prefer_ha_states and self.netatmo_account is not None:
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
