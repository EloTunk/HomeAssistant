"""SoundAnalyzer for Netatmo integration for HomeAssistant."""

import logging
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .const import DOMAIN, SCAN_INTERVAL, CONF_QUIET_THRESHOLD, CONF_NOISY_THRESHOLD, CONF_SENSOR_THRESHOLDS, DEFAULT_QUIET_THRESHOLD, DEFAULT_NOISY_THRESHOLD
from .coordinator import SoundAnalyzerCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.SENSOR]


def _looks_like_netatmo_account(candidate: Any) -> bool:
    """Return True if object behaves like a Netatmo account."""
    if candidate is None:
        return False

    has_homes = hasattr(candidate, "homes")
    has_update = callable(getattr(candidate, "update", None))
    has_async_update = callable(getattr(candidate, "async_update", None))
    has_async_topology = callable(
        getattr(candidate, "async_update_topology", None)
    )

    return has_homes and (has_update or has_async_update or has_async_topology)


def _find_netatmo_account(domain_data: Any) -> Any | None:
    """Search domain data recursively for a Netatmo account object."""
    stack = [domain_data]
    seen_ids: set[int] = set()

    while stack:
        item = stack.pop()
        item_id = id(item)
        if item_id in seen_ids:
            continue
        seen_ids.add(item_id)

        if _looks_like_netatmo_account(item):
            return item

        if isinstance(item, dict):
            direct_account = item.get("account")
            if _looks_like_netatmo_account(direct_account):
                return direct_account
            stack.extend(item.values())
            continue

        account_attr = getattr(item, "account", None)
        if account_attr is not None:
            stack.append(account_attr)

        if hasattr(item, "__dict__"):
            stack.extend(vars(item).values())

        if isinstance(item, (list, tuple, set)):
            stack.extend(item)

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
            CONF_QUIET_THRESHOLD: entry.options.get(
                CONF_QUIET_THRESHOLD, DEFAULT_QUIET_THRESHOLD
            ),
            CONF_NOISY_THRESHOLD: entry.options.get(
                CONF_NOISY_THRESHOLD, DEFAULT_NOISY_THRESHOLD
            ),
            CONF_SENSOR_THRESHOLDS: entry.options.get(
                CONF_SENSOR_THRESHOLDS, {}
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
