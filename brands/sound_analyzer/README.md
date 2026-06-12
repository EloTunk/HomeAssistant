# Sound Analyzer Brand Assets

This folder keeps source artwork for Home Assistant brands submission.

## Source files

- icon.svg
- logo.svg

Both SVG files currently use the same artwork and can be refined later.

## Home Assistant brands requirement

Home Assistant brands uses PNG files in the brands repository. The SVG files here are source files for generating those PNGs.

Required outputs for submission:

- icon.png (256x256)
- logo.png (256x256)

## Export commands

If you have Inkscape installed:

```bash
inkscape brands/sound_analyzer/icon.svg --export-type=png --export-filename=brands/sound_analyzer/icon.png --export-width=256 --export-height=256
inkscape brands/sound_analyzer/logo.svg --export-type=png --export-filename=brands/sound_analyzer/logo.png --export-width=256 --export-height=256
```

If you have rsvg-convert installed:

```bash
rsvg-convert -w 256 -h 256 brands/sound_analyzer/icon.svg -o brands/sound_analyzer/icon.png
rsvg-convert -w 256 -h 256 brands/sound_analyzer/logo.svg -o brands/sound_analyzer/logo.png
```

## Notes

- Keep transparent background.
- Keep enough padding so the icon is readable in small tiles.
- If you redesign later, update SVG first, then regenerate PNG files.
