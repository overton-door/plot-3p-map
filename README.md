# Plot 3P map

An interactive, scale-aware plan and seasonal sun/shade model for triangular
allotment Plot 3P at CERES Community Garden in Melbourne, Australia.

## Features

- Triangular Plot 3P geometry traced from the June 2026 community garden plan
- 1 metre scale grid and a labelled 6.6 m climbing-fence edge
- Nearby plots, accessible beds, laneway, community hub, and northern trees
- Melbourne solar position and projected shade through the day and year
- Editable plants, trees, and structures
- Automatic on-device saving plus JSON plan export

Changes are stored in the browser on the device being used. Use **Export plan**
to keep a portable backup.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Build the static GitHub Pages site with:

```bash
npm run build:pages
```

The workflow in `.github/workflows/deploy-pages.yml` publishes the static
output whenever `main` changes.
