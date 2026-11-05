"""Sound sensor entities for SoundAnalyzer for Netatmo integration."""

import logging
from typing import Any

from homeassistant.components.sensor import (
    SensorEntity,
    SensorStateClass,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN, CONF_QUIET_THRESHOLD, CONF_NOISY_THRESHOLD, CONF_SENSOR_THRESHOLDS, DEFAULT_QUIET_THRESHOLD, DEFAULT_NOISY_THRESHOLD

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: Any,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up sound sensor entities.
    
    Args:
        hass: HomeAssistant instance
        entry: ConfigEntry
        async_add_entities: Callback to add entities
    """
    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]

    sensors: list[SoundLevelSensor] = []
    for device_name in coordinator.data:
        sensors.append(
            SoundLevelSensor(
                coordinator,
                device_name,
                entry.entry_id,
            )
        )

    async_add_entities(sensors)


class SoundLevelSensor(CoordinatorEntity, SensorEntity):
    """Representation of a Netatmo sound level sensor."""

    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "dB"

    def __init__(
        self,
        coordinator: Any,
        device_name: str,
        entry_id: str,
    ) -> None:
        """Initialize sound level sensor.
        
        Args:
            coordinator: DataUpdateCoordinator instance
            device_name: Name of the sound sensor device
            entry_id: ConfigEntry ID
        """
        super().__init__(coordinator)
        self.device_name = device_name
        self._entry_id = entry_id
        self._attr_unique_id = f"sound_analyzer_{device_name}"
        self._attr_name = f"{device_name} Sound Level"

    @property
    def native_value(self) -> float | None:
        """Return the sound level in dB.
        
        Returns:
            Sound level value or None if unavailable
        """
        if self.device_name in self.coordinator.data:
            return self.coordinator.data[self.device_name].get("sound_level")
        return None

    @property
    def available(self) -> bool:
        """Return if entity is available.
        
        Returns:
            True if sensor data is available
        """
        return self.device_name in self.coordinator.data

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return additional attributes.
        
        Returns:
            Dictionary of extra attributes
        """
        if self.device_name not in self.coordinator.data:
            return {}

        data = self.coordinator.data[self.device_name]
        
        # Get thresholds from config
        quiet_threshold = self.hass.data[DOMAIN][self._entry_id].get(
            CONF_QUIET_THRESHOLD, DEFAULT_QUIET_THRESHOLD
        )
        noisy_threshold = self.hass.data[DOMAIN][self._entry_id].get(
            CONF_NOISY_THRESHOLD, DEFAULT_NOISY_THRESHOLD
        )
        
        sound_level = data.get("sound_level", 0)
        below_quiet = sound_level < quiet_threshold
        above_noisy = sound_level > noisy_threshold

        return {
            "home_name": data.get("home_name"),
            "device_id": data.get("device_id"),
            "quiet_threshold": quiet_threshold,
            "noisy_threshold": noisy_threshold,
            "below_quiet": below_quiet,
            "above_noisy": above_noisy,
            "alert": "Quiet" if below_quiet else ("Noisy" if above_noisy else "Normal"),
        }
