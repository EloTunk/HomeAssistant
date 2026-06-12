"""Sound Analyzer integration for HomeAssistant."""

import logging
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.discovery import async_load_platform

from .const import DOMAIN, SCAN_INTERVAL, CONF_SOUND_THRESHOLD, DEFAULT_SOUND_THRESHOLD
from .coordinator import SoundAnalyzerCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.SENSOR]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Sound Analyzer integration.
    
    Args:
        hass: HomeAssistant instance
        entry: ConfigEntry
        
    Returns:
        True if setup was successful
    """
    try:
        # Get Netatmo account from hass data (should be set up by user)
        if "netatmo" not in hass.data:
            _LOGGER.error(
                "Netatmo integration not found. Please set up Netatmo first."
            )
            return False

        netatmo_account = hass.data["netatmo"].get("account")
        if not netatmo_account:
            _LOGGER.error("Netatmo account not available")
            return False

        # Create coordinator
        coordinator = SoundAnalyzerCoordinator(
            hass,
            netatmo_account,
            timedelta(seconds=SCAN_INTERVAL),
        )

        # Initial refresh
        await coordinator.async_config_entry_first_refresh()

        # Store data
        if DOMAIN not in hass.data:
            hass.data[DOMAIN] = {}

        hass.data[DOMAIN][entry.entry_id] = {
            "coordinator": coordinator,
            "sound_threshold": entry.options.get(
                CONF_SOUND_THRESHOLD, DEFAULT_SOUND_THRESHOLD
            ),
        }

        # Setup platforms
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

        # Register services
        await _async_register_services(hass, entry)

        return True

    except Exception as err:
        _LOGGER.exception("Error setting up Sound Analyzer: %s", err)
        return False


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload Sound Analyzer integration.
    
    Args:
        hass: HomeAssistant instance
        entry: ConfigEntry
        
    Returns:
        True if unload was successful
    """
    if unload_ok := await hass.config_entries.async_unload_platforms(
        entry, PLATFORMS
    ):
        hass.data[DOMAIN].pop(entry.entry_id)

    return unload_ok


async def _async_register_services(
    hass: HomeAssistant, entry: ConfigEntry
) -> None:
    """Register services for the integration.
    
    Args:
        hass: HomeAssistant instance
        entry: ConfigEntry
    """
    from .const import SERVICE_SET_THRESHOLD

    async def set_sound_threshold(call: Any) -> None:
        """Set sound threshold for alerts.
        
        Args:
            call: Service call object
        """
        threshold = call.data.get("threshold", DEFAULT_SOUND_THRESHOLD)
        
        hass.data[DOMAIN][entry.entry_id]["sound_threshold"] = threshold
        
        _LOGGER.info(
            "Sound threshold set to %s dB for entry %s",
            threshold,
            entry.entry_id,
        )

    hass.services.async_register(
        DOMAIN,
        SERVICE_SET_THRESHOLD,
        set_sound_threshold,
    )
