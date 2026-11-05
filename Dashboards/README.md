# Wall Dashboard

Dark-by-default custom panel for a landscape wall tablet (built from `Instructions`).

- **Home / Grid / EV** cards with one big number; tap for a 24 h detail sheet. EV start/stop needs a second tap.
- **Lights & switches**: every light and switch (settings-type switches are filtered out), grouped by Home Assistant area. The room button toggles the whole room; the small buttons toggle single lights.
- **Car**: charge %, charging power/time left, odometer, range and (if configured) location.
- **Security**: lock buttons (locking is one tap, unlocking needs a second tap) and live camera thumbnails; tap a camera for the live stream.
- Amber/red banner only for high grid import. Respects `prefers-reduced-motion`.

On phones and portrait tablets (panel narrower than 900 px) the cards form a scrolling 2-column layout and detail sheets open full screen.

Open `preview.html` in a browser to see it with fake data.

## Install

1. Copy `wall-dashboard.js` to `/config/www/wall-dashboard.js`.
2. Add to `configuration.yaml`, restart, then hard-refresh the tablet (cached JS is the usual reason a panel looks stale):

```yaml
panel_custom:
  - name: wall-dashboard
    sidebar_title: Wall
    sidebar_icon: mdi:view-dashboard
    url_path: wall
    module_url: /local/wall-dashboard.js?v=6   # bump v after each update
    config:
      theme: dark            # dark | light | auto
      entities:
        home_power: sensor.evcc_home_power
        grid_power: sensor.p1_meter_power
        ev_power: sensor.zag143440_charge_power
        ev_switch: switch.zag143440_charging
      # rooms: optional. Without it every light is grouped by its Home Assistant area.
      # rooms:
      #   - name: Stue
      #     lights: [light.stalampe1, light.stalampe2]
      car:
        name: ID.7
        soc: sensor.ute_id_7_battery_level
        odometer: sensor.ute_id_7_odometer
        range: sensor.evcc_hjemmelader_vehicle_range
        power: sensor.ute_id_7_charging_power
        charging: binary_sensor.ute_id_7_currently_charging
        status: sensor.ute_id_7_charging_status
        remaining: sensor.ute_id_7_remaining_charge_time
        location: ""            # e.g. device_tracker.your_car (optional)
      security:
        locks:
          - { name: Front door, entity: lock.front_door, door: binary_sensor.front_door_door }
        cameras:
          - { name: Front, entity: camera.framside_live_view }
          - { name: Back, entity: camera.bakside_live_view }
```

Defaults for everything are at the top of the JS file. If a config key is given, it replaces the default list
(`rooms`, `security.locks`, `security.cameras`), so repeat all items you want to keep.
A small `v6` in the bottom-right corner shows which build the tablet loaded.
UniFi `rw_*`/`sw_*` LED lights are hidden by default; `light_exclude: "regex"` hides more.
Extra options: `switches: [switch.x]` always includes a switch, `switch_exclude: "regex"` hides more.
Other options: `grid_warn_w`, `grid_crit_w`, `grid_import_positive`, `arm_seconds`, `fonts_css` (self-hosted fonts for offline tablets).
If something fails to render, the panel shows the JavaScript error on screen.
