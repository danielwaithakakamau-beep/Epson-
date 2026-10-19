# Daniel Print Hub (PWA) – Updated

## Changes in this package (19 Oct 2026)

### Balloon styles
Replaced the old set with the shapes you requested:

- Speech (classic oval)
- Rectangle
- Thought (cloud + dots)
- Whisper (dotted)
- Rounded
- Scream (starburst)
- Caption (plain box, no tail)
- Pointer (rectangle with angled arrow)

### Crop fixes
- Manual Crop now works reliably on mobile (touch + pointer events)
- Apply Crop no longer disappears without doing anything
- Coordinate mapping fixed for scaled canvases
- Auto Crop is more tolerant of dark / uneven backgrounds
- Overlay z-index and touch-action improved

## How to deploy

1. Download / extract this zip
2. Go to your GitHub repo: https://github.com/danielwaithakakamau-beep/Epson-
3. Upload (or replace) these files:
   - index.html
   - styles.css
   - app.js
   - (optional) the other files if you want a clean set
4. Commit and push to `main`
5. Wait ~1 minute for GitHub Pages
6. Hard-refresh the app or clear site data so the service worker picks up the new files

Live URL: https://danielwaithakakamau-beep.github.io/Epson-/
