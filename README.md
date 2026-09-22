# Plot 3K — The veggie patch

A mobile-friendly row and block planting planner for CERES, Melbourne.

- User-confirmed 5.4 m north–south × approximately 2.2 m east–west rectangle.
- Central north–south plank that stops below an editable full-width northern cross-bed, creating the T-shaped plan. Plank width remains provisionally 20 cm.
- Equal lower flower and vegetable/herb halves; west flower side is an interchangeable proposal.
- Direct drag-and-drop movement between north, west and east bed sections, with four corner resize handles, 5 cm snapping and lock-aware undo.
- Intensive default spacing (about 25–30% tighter than supplier guides), with supplier spacing available per block.
- Mature-height planning and redundant low/medium/tall map cues using labels, bar marks and depth shading.
- Compact landscape-plan plant codes (for example, `ZiLi`) keep dense blocks legible while full names remain in the inspector and legend.
- Scaled blocks, separate plant/row pitch, row counts, individual planting dots, zoom and printable legend.
- 27 purchased varieties from 28 invoice entries, plus the previous general crop library. Echinacea pallida purchases are combined; equipment and personal invoice details are excluded.
- Supplier growing guides, sowing methods, depths, temperature ranges, cool-climate sowing windows, perennial reservations, row completion and garden notes.
- Layout locks, undo, overlap/boundary warnings, seed inventory and exact cultivar guidance.
- A plant-count-first block inspector, with intensive/supplier spacing choices, collapsible growing notes, prominent water/feed needs and separate seed-raised, direct-sown and transplanted dates.
- URL-led custom plant entry for new seed purchases, plus a simple dated garden journal stored with the plan.

## Storage and partner access

The GitHub Pages app saves in the browser. Partner links encode a complete snapshot in the URL fragment, without an account or backend. Each opened snapshot has its own local saved copy, so checkbox edits survive refresh and do not overwrite the main plan. Share an updated link to exchange later changes. This is **not live multi-device synchronisation**. Anyone with the link can read its notes.

Export JSON for backups. Old Plot 3P storage is not migrated into the new geometry or deleted; the app offers its export when present. Plot 3K version 3 and 4 plans migrate into the version 5 format automatically. Undo restores earlier local actions; shared snapshots preserve custom plants and journal entries as well as the layout.

The 12 starter blocks are suggestions, not existing planting records. Actual retained plants and preferred flower side remain to be confirmed. Unallocated varieties remain in inventory; the app does not pretend every packet should fit simultaneously. Long-term crop rotation dates remain user-entered, and there is no detailed solar simulation for the new rectangle.

## Development and checks

Node 22 or newer. `npm install`, then `npm run build:pages` for the static GitHub Pages output. `node --test tests/plot-plan.test.mjs` runs the geometry, inventory, import and sharing checks. The GitHub Pages workflow publishes main to the existing `/plot-3p-map/` URL, retained so saved links continue to work.

Sources and checked dates are stored beside each purchased variety in `app/seed-catalog.json`. Supplier plant and row spacing remains visible as the reference baseline; unverified legacy values and height estimates are explicitly labelled. The community garden source map is read-only and is not included in the public app.
