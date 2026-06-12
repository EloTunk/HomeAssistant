"""DataUpdateCoordinator for Sound Analyzer integration."""

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
            name="Sound Analyzer",
            update_interval=update_interval,
        )
        self.netatmo_account = netatmo_account

    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch sound sensor data from Netatmo."""
        try:
            # Get all home data from Netatmo
            await self.hass.async_add_executor_job(
                self.netatmo_account.update
            )

            sound_data = {}

            # Extract sound sensor data from homes
            for home in self.netatmo_account.homes:
                for module in home.modules:
                    # Check if module has sound sensor capability
                    if hasattr(module, "sound") and module.sound is not None:
                        sound_data[module.name] = {
                            "sound_level": module.sound,
                            "device_id": module.entity_id,
                            "home_name": home.name,
                        }

            return sound_data

        except Exception as err:
            raise UpdateFailed(f"Error updating sound data: {err}") from err
