"""Config flow for SoundAnalyzer for Netatmo integration."""

from __future__ import annotations

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback

from .const import (
    CONF_QUIET_THRESHOLD,
    CONF_NOISY_THRESHOLD,
    CONF_SENSOR_THRESHOLDS,
    DEFAULT_QUIET_THRESHOLD,
    DEFAULT_NOISY_THRESHOLD,
    DOMAIN,
)


class SoundAnalyzerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for SoundAnalyzer for Netatmo."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        errors = {}

        if user_input is not None:
            if "netatmo" not in self.hass.data:
                errors["base"] = "no_netatmo"
            else:
                await self.async_set_unique_id(DOMAIN)
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title="SoundAnalyzer for Netatmo",
                    data={},
                    options={
                        CONF_QUIET_THRESHOLD: user_input[CONF_QUIET_THRESHOLD],
                        CONF_NOISY_THRESHOLD: user_input[CONF_NOISY_THRESHOLD],
                        CONF_SENSOR_THRESHOLDS: {},
                        # New option: prefer Home Assistant sensor states
                        "prefer_ha_states": user_input.get("prefer_ha_states", True),
                    },
                )

        data_schema = vol.Schema(
            {
                vol.Required(
                    CONF_QUIET_THRESHOLD,
                    default=DEFAULT_QUIET_THRESHOLD,
                ): vol.All(vol.Coerce(int), vol.Range(min=0, max=120)),
                vol.Required(
                    CONF_NOISY_THRESHOLD,
                    default=DEFAULT_NOISY_THRESHOLD,
                ): vol.All(vol.Coerce(int), vol.Range(min=0, max=120)),
                vol.Optional("prefer_ha_states", default=True): bool,
            }
        )

        return self.async_show_form(
            step_id="user",
            data_schema=data_schema,
            errors=errors,
            description_placeholders={
                "quiet_info": "Quiet threshold: alert when sound drops below this level",
                "noisy_info": "Noisy threshold: alert when sound exceeds this level",
            },
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Return the options flow handler."""
        return SoundAnalyzerOptionsFlow(config_entry)


class SoundAnalyzerOptionsFlow(config_entries.OptionsFlow):
    """Handle options for SoundAnalyzer for Netatmo."""

    def __init__(self, config_entry):
        """Initialize options flow."""
        self._config_entry = config_entry

    async def async_step_init(self, user_input=None):
        """Manage integration options - global thresholds."""
        if user_input is not None:
            self._global_quiet = user_input[CONF_QUIET_THRESHOLD]
            self._global_noisy = user_input[CONF_NOISY_THRESHOLD]
            self._prefer_states = user_input.get("prefer_ha_states", True)
            return await self.async_step_sensors()

        current_quiet = self._config_entry.options.get(
            CONF_QUIET_THRESHOLD,
            DEFAULT_QUIET_THRESHOLD,
        )
        current_noisy = self._config_entry.options.get(
            CONF_NOISY_THRESHOLD,
            DEFAULT_NOISY_THRESHOLD,
        )

        data_schema = vol.Schema(
            {
                vol.Required(
                    CONF_QUIET_THRESHOLD,
                    default=current_quiet,
                ): vol.All(vol.Coerce(int), vol.Range(min=0, max=120)),
                vol.Required(
                    CONF_NOISY_THRESHOLD,
                    default=current_noisy,
                ): vol.All(vol.Coerce(int), vol.Range(min=0, max=120)),
                vol.Optional(
                    "prefer_ha_states",
                    default=self._config_entry.options.get(
                        "prefer_ha_states", True
                    ),
                ): bool,
            }
        )

        return self.async_show_form(
            step_id="init",
            data_schema=data_schema,
            description_placeholders={
                "quiet_info": "Default quiet threshold (dB): applies to all sensors",
                "noisy_info": "Default noisy threshold (dB): applies to all sensors",
            },
        )

    async def async_step_sensors(self, user_input=None):
        """Configure per-sensor thresholds."""
        if user_input is not None:
            # Compile all sensor thresholds
            sensor_thresholds = {}
            for key, value in user_input.items():
                if "__quiet__" in key:
                    sensor_name = key.replace("__quiet__", "")
                    if sensor_name not in sensor_thresholds:
                        sensor_thresholds[sensor_name] = {}
                    sensor_thresholds[sensor_name][CONF_QUIET_THRESHOLD] = value
                elif "__noisy__" in key:
                    sensor_name = key.replace("__noisy__", "")
                    if sensor_name not in sensor_thresholds:
                        sensor_thresholds[sensor_name] = {}
                    sensor_thresholds[sensor_name][CONF_NOISY_THRESHOLD] = value

            return self.async_create_entry(
                title="",
                data={
                    CONF_QUIET_THRESHOLD: self._global_quiet,
                    CONF_NOISY_THRESHOLD: self._global_noisy,
                    CONF_SENSOR_THRESHOLDS: sensor_thresholds,
                    "prefer_ha_states": getattr(self, "_prefer_states", True),
                },
            )

        # Get available sensors from coordinator
        coordinator = self.hass.data[DOMAIN][self._config_entry.entry_id][
            "coordinator"
        ]
        sensor_data = coordinator.data or {}

        if not sensor_data:
            # No sensors found, just save global thresholds
            return self.async_create_entry(
                title="",
                data={
                    CONF_QUIET_THRESHOLD: self._global_quiet,
                    CONF_NOISY_THRESHOLD: self._global_noisy,
                    CONF_SENSOR_THRESHOLDS: {},
                },
            )

        # Build schema for per-sensor configuration
        schema_dict = {}
        current_sensor_thresholds = self._config_entry.options.get(
            CONF_SENSOR_THRESHOLDS, {}
        )

        for sensor_name in sorted(sensor_data.keys()):
            sensor_config = current_sensor_thresholds.get(sensor_name, {})
            current_quiet = sensor_config.get(
                CONF_QUIET_THRESHOLD, self._global_quiet
            )
            current_noisy = sensor_config.get(
                CONF_NOISY_THRESHOLD, self._global_noisy
            )

            # Add quiet threshold for this sensor
            schema_dict[
                vol.Required(
                    f"{sensor_name}__quiet__",
                    default=current_quiet,
                )
            ] = vol.All(vol.Coerce(int), vol.Range(min=0, max=120))

            # Add noisy threshold for this sensor
            schema_dict[
                vol.Required(
                    f"{sensor_name}__noisy__",
                    default=current_noisy,
                )
            ] = vol.All(vol.Coerce(int), vol.Range(min=0, max=120))

        data_schema = vol.Schema(schema_dict)
        sensor_list = ", ".join(sorted(sensor_data.keys()))

        return self.async_show_form(
            step_id="sensors",
            data_schema=data_schema,
            description_placeholders={
                "sensor_info": f"Configure thresholds for each sensor: {sensor_list}",
            },
        )