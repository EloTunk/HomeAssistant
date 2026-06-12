"""Constants for the SoundAnalyzer for Netatmo integration."""

DOMAIN = "sound_analyzer"
SCAN_INTERVAL = 60  # seconds

# Configuration constants
CONF_DEVICES = "devices"
CONF_THRESHOLDS = "thresholds"
CONF_QUIET_THRESHOLD = "quiet_threshold"
CONF_NOISY_THRESHOLD = "noisy_threshold"
CONF_SENSOR_THRESHOLDS = "sensor_thresholds"

# Default values
DEFAULT_QUIET_THRESHOLD = 25  # dB - quiet environment
DEFAULT_NOISY_THRESHOLD = 50  # dB - noisy environment

# Service names
SERVICE_SET_THRESHOLD = "set_sound_threshold"
