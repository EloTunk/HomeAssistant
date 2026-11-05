"""SoundAnalyzer for Netatmo integration for HomeAssistant."""

import asyncio
import logging
from datetime import timedelta
from types import ModuleType
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .const import (
    DOMAIN,
    SCAN_INTERVAL,
    CONF_QUIET_THRESHOLD,
    CONF_NOISY_THRESHOLD,
    CONF_SENSOR_THRESHOLDS,
    DEFAULT_QUIET_THRESHOLD,
    DEFAULT_NOISY_THRESHOLD,
    CONF_PREFER_HA_STATES,
    DEFAULT_PREFER_HA_STATES,
)
from .coordinator import SoundAnalyzerCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.SENSOR]


def _looks_like_netatmo_account(candidate: Any) -> bool:
    """Return True if object behaves like a Netatmo account."""
    if candidate is None or isinstance(candidate, ModuleType):
        return False
    try:
        return hasattr(candidate, "homes") and any(
            callable(getattr(candidate, n, None))
            for n in ("update", "async_update", "async_update_topology")
        )
    except Exception:  # noqa: BLE001 - foreign objects may raise anything on getattr
        return False


def _find_netatmo_account(root: Any, depth: int = 3) -> Any | None:
    """Look for the account via known paths only (never walk arbitrary objects)."""
    if root is None or depth < 0:
        return None
    if _looks_like_netatmo_account(root):
        return root
    if isinstance(root, dict):
        children = list(root.values())
    else:
        # shortcut: only known Netatmo attribute names, add more if Netatmo renames them
        try:
            children = [getattr(root, n, None) for n in ("account", "data_handler")]
        except Exception:  # noqa: BLE001 - foreign objects may raise anything
            return None
    for child in children:
        found = _find_netatmo_account(child, depth - 1)
        if found is not None:
            return found
    return None


def _find_netatmo_account_from_hass(hass: HomeAssistant) -> Any | None:
    """Find Netatmo account object from Home Assistant runtime state."""
    if "netatmo" in hass.data:
        account = _find_netatmo_account(hass.data["netatmo"])
        if account is not None:
            return account

    for netatmo_entry in hass.config_entries.async_entries("netatmo"):
        runtime_data = getattr(netatmo_entry, "runtime_data", None)
        account = _find_netatmo_account(runtime_data)
        if account is not None:
            return account

    return None


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up SoundAnalyzer for Netatmo integration.
    
    Args:
        hass: HomeAssistant instance
        entry: ConfigEntry
        
    Returns:
        True if setup was successful
    """
    try:
        netatmo_account = _find_netatmo_account_from_hass(hass)
        if not netatmo_account:
            _LOGGER.warning(
                "Netatmo account object not found; falling back to Home Assistant "
                "sensor states for sound data."
            )

        # Ensure integration shared data (lock, last_update) exists before
        # creating coordinators so they can use the shared update lock.
        if DOMAIN not in hass.data:
            hass.data[DOMAIN] = {}

        shared = hass.data[DOMAIN].setdefault("_shared", {})
        if "update_lock" not in shared:
            shared["update_lock"] = asyncio.Lock()
        if "last_update" not in shared:
            shared["last_update"] = 0.0

        # Create coordinator
        coordinator = SoundAnalyzerCoordinator(
            hass,
            netatmo_account,
            timedelta(seconds=SCAN_INTERVAL),
            prefer_ha_states=entry.options.get(
                CONF_PREFER_HA_STATES, DEFAULT_PREFER_HA_STATES
            ),
        )

        # Initial refresh
        await coordinator.async_config_entry_first_refresh()

        # Store data per config entry
        hass.data[DOMAIN][entry.entry_id] = {
            "coordinator": coordinator,
            CONF_QUIET_THRESHOLD: entry.options.get(
                CONF_QUIET_THRESHOLD, DEFAULT_QUIET_THRESHOLD
            ),
            CONF_NOISY_THRESHOLD: entry.options.get(
                CONF_NOISY_THRESHOLD, DEFAULT_NOISY_THRESHOLD
            ),
            CONF_SENSOR_THRESHOLDS: entry.options.get(
                CONF_SENSOR_THRESHOLDS, {}
            ),
            CONF_PREFER_HA_STATES: entry.options.get(
                CONF_PREFER_HA_STATES, DEFAULT_PREFER_HA_STATES
            ),
        }

        # Setup platforms
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

        # Register services
        await _async_register_services(hass, entry)

        return True

    except Exception as err:
        _LOGGER.exception("Error setting up SoundAnalyzer for Netatmo: %s", err)
        return False


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload SoundAnalyzer for Netatmo integration.
    
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
