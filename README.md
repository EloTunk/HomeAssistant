# SoundAnalyzer for Netatmo

Custom Home Assistant integration that monitors Netatmo sound sensors and provides threshold-based alerts.

## Installation via HACS

1. Open HACS in Home Assistant.
2. Go to Integrations -> menu -> Custom repositories.
3. Add repository URL: `https://github.com/EloTunk/HomeAssistant`
4. Category: Integration
5. Install SoundAnalyzer for Netatmo.
6. Restart Home Assistant.

## Setup

1. Go to Settings -> Devices & Services.
2. Click Add Integration.
3. Search for SoundAnalyzer for Netatmo.
4. Complete the configuration flow.

## Requirements

- Home Assistant 2023.6+
- Netatmo integration configured
- Python 3.9+

## Project Structure

- Main integration package for HACS: `custom_components/sound_analyzer`
- Source folder used in development: `SoundAnalyzer`

## Documentation

For full usage examples, automations, and troubleshooting, see:

- `SoundAnalyzer/README.md`

## Branding

Branding files prepared for HACS/Home Assistant deployment:

- `custom_components/sound_analyzer/icon.png`
- `custom_components/sound_analyzer/logo.png`
- `brands/sound_analyzer/icon.svg`
- `brands/sound_analyzer/logo.svg`

Regenerate PNG files from SVG with:

```bash
bash brands/sound_analyzer/export_png.sh
```
