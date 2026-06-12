"""Config flow for Sound Analyzer integration."""

from __future__ import annotations

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback

from .const import CONF_SOUND_THRESHOLD, DEFAULT_SOUND_THRESHOLD, DOMAIN


class SoundAnalyzerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Sound Analyzer."""

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
                    title="Sound Analyzer",
                    data={},
                    options={
                        CONF_SOUND_THRESHOLD: user_input[CONF_SOUND_THRESHOLD],
                    },
                )

        data_schema = vol.Schema(
            {
                vol.Required(
                    CONF_SOUND_THRESHOLD,
                    default=DEFAULT_SOUND_THRESHOLD,
                ): vol.All(vol.Coerce(int), vol.Range(min=0, max=120)),
            }
        )

        return self.async_show_form(
            step_id="user",
            data_schema=data_schema,
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Return the options flow handler."""
        return SoundAnalyzerOptionsFlow(config_entry)


class SoundAnalyzerOptionsFlow(config_entries.OptionsFlow):
    """Handle options for Sound Analyzer."""

    def __init__(self, config_entry):
        """Initialize options flow."""
        self._config_entry = config_entry

    async def async_step_init(self, user_input=None):
        """Manage integration options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        current_threshold = self._config_entry.options.get(
            CONF_SOUND_THRESHOLD,
            DEFAULT_SOUND_THRESHOLD,
        )

        data_schema = vol.Schema(
            {
                vol.Required(
                    CONF_SOUND_THRESHOLD,
                    default=current_threshold,
                ): vol.All(vol.Coerce(int), vol.Range(min=0, max=120)),
            }
        )

        return self.async_show_form(step_id="init", data_schema=data_schema)