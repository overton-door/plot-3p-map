# Plot 3P planting planner

An interactive, scale-aware planting planner and seasonal sun/shade model for
triangular allotment Plot 3P at CERES Community Garden in Melbourne, Australia.

## Features

- Triangular Plot 3P geometry traced from the June 2026 community garden plan
- 1 metre scale grid and a labelled 6.6 m climbing-fence edge
- Correct immediate context: Plot 3O to the south and an access path to the east
- Melbourne solar position and projected shade through the day and year
- Melbourne vegetable, herb, and flower library with seasonal filters and mature spacing
- Explainable automatic layouts balancing sun, access, height, supports, and space
- Intensive spacing, interplanting, and draggable mature plant footprints
- Editable plants, trees, and structures
- Automatic on-device saving plus JSON import/export

Changes are stored in the browser on the device being used. Use **Export JSON**
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
