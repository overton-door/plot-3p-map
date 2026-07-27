import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the scaled Plot 3P editor and Melbourne solar controls", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
  ]);

  assert.match(page, /const PLOT_3P/);
  assert.match(page, /FENCE · 6\.6 m · CLIMBING SUPPORT/);
  assert.match(page, /const PLOT_3O/);
  assert.match(page, /const PLOT_3A/);
  assert.match(page, /solarPosition/);
  assert.match(page, /Australia\/Melbourne/);
  assert.match(page, /Play through day/);
  assert.match(page, /Export plan/);
  assert.match(layout, /Plot 3P · Living site plan/);
  assert.doesNotMatch(page + layout, /codex-preview|SkeletonPreview/);
});

test("supports static GitHub Pages export and on-device persistence", async () => {
  const [config, page] = await Promise.all([
    readFile(new URL("next.config.ts", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);

  assert.match(config, /output: "export"/);
  assert.match(config, /plot-3p-map/);
  assert.match(page, /localStorage/);
  assert.match(page, /plot-3p-plan-v1/);
});
