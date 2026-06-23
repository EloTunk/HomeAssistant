# SoundAnalyzer for Netatmo Integration

A HomeAssistant integration that monitors Netatmo soundsensor devices and provides threshold-based alerts.

## Features

- **Real-time Sound Level Monitoring**: Tracks sound levels from Netatmo soundsensors
- **Threshold Alerting**: Alerts when sound levels fall below a configured threshold
- **Multiple Device Support**: Monitor multiple sound sensors across different rooms
- **Dynamic Threshold Configuration**: Adjust thresholds via service calls

## Requirements

- HomeAssistant 2023.6+
- Netatmo integration configured
- Python 3.9+

## Installation

### Via HACS (Recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=EloTunk&repository=HomeAssistant&category=integration)

1. Click the HACS button above, or:
2. Go to HACS → Integrations → ⋯ → Custom repositories
3. Add: `https://github.com/EloTunk/HomeAssistant`
4. Select category: **Integration**
5. Search for "SoundAnalyzer for Netatmo" and install
6. Restart HomeAssistant
7. Go to Settings → Devices & Services → Add Integration
8. Add the SoundAnalyzer for Netatmo integration

### Manual Installation

1. Place the `sound_analyzer` folder in your `custom_components` directory:
   ```
  /config/custom_components/sound_analyzer/
   ```
2. Restart HomeAssistant
3. Go to Settings → Devices & Services → Add Integration
4. Add the SoundAnalyzer for Netatmo integration

## Configuration

### Basic Setup

The integration requires an active Netatmo account integration in HomeAssistant.

### Service: `sound_analyzer.set_sound_threshold`

Set the sound level threshold for alerts:

```yaml
service: sound_analyzer.set_sound_threshold
data:
  threshold: 35
```

## Automations

### Alert When Sound Goes Below Threshold

```yaml
alias: Sound Level Alert
trigger:
  - platform: numeric_state
    entity_id: sensor.living_room_sound_level
    below: 35
action:
  - service: notify.notify
    data:
      message: "Sound level dropped below threshold in living room"
      title: "Sound Alert"
```

### Daily Quiet Hours

```yaml
alias: Quiet Hours Alert
trigger:
  - platform: numeric_state
    entity_id: sensor.bedroom_sound_level
    below: 25
  - platform: time
    at: "22:00:00"
condition:
  - condition: numeric_state
    entity_id: sensor.bedroom_sound_level
    below: 25
action:
  - service: light.turn_off
    entity_id: light.bedroom
```

## Available Sensors

For each Netatmo soundsensor device, the integration creates:

- `sensor.<device_name>_sound_level`: Current sound level in dB

### Sensor Attributes

- `home_name`: Name of the home/location
- `device_id`: Netatmo device identifier
- `sound_threshold`: Current alert threshold in dB
- `below_threshold`: Boolean indicating if current level is below threshold

## Troubleshooting

### Integration Not Showing Up

1. Verify Netatmo integration is configured
2. Check HomeAssistant logs for errors
3. Restart HomeAssistant after install/update so dependencies are installed
4. Confirm `requirements` in `manifest.json` includes `pyatmo>=8.0.0`

### No Sound Sensors Found

1. Verify Netatmo account has sound sensors
2. Check that sensors are properly added to Netatmo app
3. Refresh the integration or restart HomeAssistant

### Threshold Not Working

1. Verify the service call syntax
2. Check automation triggers are properly configured
3. Monitor sensor state changes in developer tools

## Development

The integration uses:
- `DataUpdateCoordinator` for efficient data fetching
- `SensorEntity` for sensor representation
- Service-based configuration for runtime adjustments

## Changelog

- **v1.0.1** — 2026-06-23: Added diagnostic logging and a shared update lock
  to coordinate `pyatmo` account updates, and a `prefer_ha_states` option
  (default: true) to prefer Home Assistant sensor states and avoid direct
  `pyatmo` calls. These changes improve stability when the Netatmo UI or
  other Netatmo consumers are active.

## Branding Assets

Branding sources and exported files are available in this repository:

- `brands/sound_analyzer/icon.svg`
- `brands/sound_analyzer/logo.svg`
- `brands/sound_analyzer/icon.png`
- `brands/sound_analyzer/logo.png`

To regenerate PNG files from SVG, run:

```bash
bash brands/sound_analyzer/export_png.sh
```

## License

MIT License - See LICENSE file for details
