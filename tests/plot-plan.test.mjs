import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the scaled Plot 3P editor and Melbourne solar controls", async () => {
  const [page, planner, layout] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/planner.ts", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);

  assert.match(planner, /const PLOT_3P/);
  assert.match(page, /FENCE · 6\.6 m · CLIMBING SUPPORT/);
  assert.match(planner, /const PLOT_3O/);
  assert.match(planner, /const EAST_PATH/);
  assert.match(planner, /PLOT_3A_BEYOND_PATH/);
  assert.match(page, /solarPosition/);
  assert.match(page, /Australia\/Melbourne/);
  assert.match(page, /Play through day/);
  assert.match(page, /Export JSON/);
  assert.match(page, /Generate planting guide/);
  assert.match(planner, /generateLayout/);
  assert.match(planner, /interplant/);
  assert.match(planner, /ACCESS_PADS/);
  assert.match(layout, /Plot 3P · Intelligent planting planner/);
  assert.doesNotMatch(page + planner + layout, /codex-preview|SkeletonPreview/);
});

test("supports static GitHub Pages export and on-device persistence", async () => {
  const [config, page] = await Promise.all([
    readFile(new URL("next.config.ts", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);

  assert.match(config, /output: isGitHubPages \? "export" : undefined/);
  assert.match(config, /plot-3p-map/);
  assert.match(page, /localStorage/);
  assert.match(page, /plot-3p-plan-v2/);
});
