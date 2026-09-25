"use client";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  SEEDS,
  initialPlan,
  bedWidth,
  rowLayout,
  points,
  blockErrors,
  makeBlock,
  validatePlan,
  shareEncode,
  shareDecode,
  intensiveSpacing,
  heightTier,
  sectionWidth,
  globalX,
  seedFor,
  fitBlockToCount,
  organisePlan,
  compactPlanBlocks,
  snapResizeToPlantGrid,
  type Plan,
  type Block,
  type Seed,
  type BedSide,
} from "./plot3k";
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const KEY = "plot-3k-plan-v5",
  OLD_KEYS = ["plot-3k-plan-v4", "plot-3k-plan-v3"];
const colours = [
  "#a75a70",
  "#78863c",
  "#cb8750",
  "#8370a4",
  "#bb647e",
  "#457956",
  "#9a6b47",
  "#477b80",
];
const color = (id: string) =>
  colours[
    Math.abs([...id].reduce((n, c) => n + c.charCodeAt(0), 0)) % colours.length
  ];
const heightName = (height: number) =>
  heightTier(height) === "tall"
    ? "Tall"
    : heightTier(height) === "medium"
      ? "Medium"
      : "Low";
const heightMark = (height: number) =>
  heightTier(height) === "tall"
    ? "▮▮▮"
    : heightTier(height) === "medium"
      ? "▮▮"
      : "▮";
const stamp = () => new Date().toISOString();
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
function plantCode(seed: Seed) {
  const clean = (text: string) =>
    text
      .replace(/[’']/g, "")
      .split(/\s+/)
      .find((w) => /[a-z]/i.test(w)) || "";
  const [plant, cultivar] = seed.name.split(/\s*[·–—:]\s*/, 2);
  const plantWords = plant.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  const first = clean(plant).slice(0, 2);
  const detail = (cultivar ? clean(cultivar) : plantWords[1] || "").slice(0, 2);
  return (first + detail).replace(/[^a-z]/gi, "");
}
function care(seed: Seed) {
  const name = seed.name.toLowerCase(),
    moist =
      /cucumber|zucchini|pumpkin|tomato|capsicum|chilli|eggplant|okra|broccoli|basil|dahlia|sunflower|lettuce|mizuna|silverbeet|kale/.test(
        name,
      ),
    dry = /rosemary|thyme|lavender|chilli/.test(name),
    heavy =
      /cucumber|zucchini|pumpkin|tomato|capsicum|chilli|eggplant|okra|broccoli|basil|sunflower/.test(
        name,
      ),
    low = /bean|pea|beet|carrot|radish|herb|chive|lettuce|mizuna/.test(name);
  return {
    water:
      seed.water ||
      (dry
        ? "Let the surface dry slightly between deep waterings."
        : moist
          ? "Prefers even moisture — don’t let it dry out."
          : "Water when the surface dries; avoid waterlogging."),
    feed:
      seed.feed ||
      (heavy
        ? "Heavy feeder — compost plus regular vegetable feed."
        : low
          ? "Light feeder — compost at planting is usually enough."
          : "Moderate feeder — compost at planting; top up if growth slows."),
  };
}
function nameFromUrl(value: string) {
  try {
    const u = new URL(value),
      last = u.pathname.split("/").filter(Boolean).pop() || "";
    return last
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\s+(Seeds?|P)$/i, "")
      .trim();
  } catch {
    return "";
  }
}
function starter() {
  const p = structuredClone(initialPlan);
  for (const id of [
    "cafe",
    "teddy",
    "echinacea",
    "green-wizard",
    "lime",
    "salmon",
    "peach",
    "beetroot",
    "cherokee",
    "roma",
    "holy-basil",
    "chives",
  ]) {
    const b = makeBlock(id, p);
    if (b) p.blocks.push(b);
  }
  return p;
}
function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 2000,
  step = 5,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
        }}
      />
    </label>
  );
}
function CareNotes({
  seed,
  compact = false,
}: {
  seed: Seed;
  compact?: boolean;
}) {
  const needs = care(seed);
  return (
    <div className={compact ? "care-notes compact" : "care-notes"}>
      <div className="care-callout water">
        <strong>Water</strong>
        <span>{needs.water}</span>
      </div>
      <div className="care-callout feed">
        <strong>Feed</strong>
        <span>{needs.feed}</span>
      </div>
    </div>
  );
}
function GrowGuide({ seed }: { seed: Seed }) {
  const dense = intensiveSpacing(seed);
  return (
    <div className="grow-guide">
      <span className="eyebrow">Growing instructions · {plantCode(seed)}</span>
      <h3>{seed.name}</h3>
      <CareNotes seed={seed} />
      <dl>
        <div>
          <dt>Life cycle</dt>
          <dd>{seed.life}</dd>
        </div>
        <div>
          <dt>Sow in Melbourne</dt>
          <dd>{seed.months.map((m) => MONTHS[m - 1]).join(" · ")}</dd>
        </div>
        <div>
          <dt>Start by</dt>
          <dd>{seed.method}</dd>
        </div>
        <div>
          <dt>Sowing depth</dt>
          <dd>{seed.depth}</dd>
        </div>
        <div>
          <dt>Germination</dt>
          <dd>{seed.germination}</dd>
        </div>
        <div>
          <dt>Plant spread</dt>
          <dd>About {seed.spacing} cm</dd>
        </div>
        <div>
          <dt>Row spacing</dt>
          <dd>About {seed.rowSpacing} cm</dd>
        </div>
        <div>
          <dt>Mature height</dt>
          <dd>
            {heightName(seed.height)} · up to {seed.height} cm
          </dd>
        </div>
        <div>
          <dt>Harvest / flowers</dt>
          <dd>
            {seed.days}
            {seed.days !== "Not specified" ? " days (approx.)" : ""}
          </dd>
        </div>
        <div>
          <dt>Position</dt>
          <dd>{seed.position}</dd>
        </div>
      </dl>
      <p>{seed.notes}</p>
      <p className="fine">
        The planner starts about 25–30% closer than supplier guidance, while
        still using mature size and height to shape the plan. Thin, prune,
        support and watch airflow as the canopy closes.
      </p>
      {seed.sources.map((s) => (
        <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
          {s.supplier} growing guide ↗
        </a>
      ))}
      <small>Checked {seed.checked}</small>
    </div>
  );
}
function SeedCard({
  seed,
  added,
  checked,
  month,
  onToggle,
  onGuide,
  onAdd,
}: {
  seed: Seed;
  added: boolean;
  checked: boolean;
  month: number;
  onToggle: () => void;
  onGuide: () => void;
  onAdd: () => void;
}) {
  return (
    <article className={`seed-card${checked ? " selected" : ""}`}>
      <div className="seed-stripe" style={{ background: color(seed.id) }} />
      <label className="seed-select">
        <input
          type="checkbox"
          aria-label={`Select ${seed.name} for batch planning`}
          checked={checked}
          onChange={onToggle}
        />
        <span>{added ? "In garden plan" : "Select for batch add"}</span>
      </label>
      <span className="eyebrow">
        {plantCode(seed)} ·{" "}
        {seed.side === "flowers" ? "Cut flowers" : "Veg & herbs"} · {seed.life}
      </span>
      <h3>{seed.name}</h3>
      <CareNotes seed={seed} compact />
      <p>
        <strong>
          {heightName(seed.height)} {heightMark(seed.height)}
        </strong>{" "}
        · up to {seed.height} cm
        <br />
        About {seed.spacing} cm wide · rows {seed.rowSpacing} cm
        <br />
        <small>{seed.notes}</small>
      </p>
      <div className="tags">
        <span>
          {added
            ? "Already added"
            : seed.id.startsWith("custom-")
              ? "Imported"
              : seed.packets
                ? `${seed.packets} packet${seed.packets > 1 ? "s" : ""}`
                : "General library"}
        </span>
        <span>
          {seed.months.includes(month)
            ? `${MONTHS[month - 1]} sowing window`
            : "Plan for later"}
        </span>
      </div>
      <div className="button-row">
        <button onClick={onGuide}>Growing guide</button>
        <button onClick={onAdd}>
          {added ? "+ Add another" : "+ Add block"}
        </button>
      </div>
    </article>
  );
}
function AddBlockDialog({
  seeds,
  selectedId,
  query,
  count,
  spacing,
  onClose,
  onQuery,
  onSelect,
  onCount,
  onSpacing,
  onAdd,
}: {
  seeds: Seed[];
  selectedId: string;
  query: string;
  count: number;
  spacing: "intensive" | "supplier";
  onClose: () => void;
  onQuery: (value: string) => void;
  onSelect: (seed: Seed) => void;
  onCount: (value: number) => void;
  onSpacing: (value: "intensive" | "supplier") => void;
  onAdd: () => void;
}) {
  const shown = seeds
      .filter((seed) => seed.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name)),
    selected = seeds.find((seed) => seed.id === selectedId);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-block-title"
        className="modal add-block-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button autoFocus className="close" onClick={onClose}>
          Close ×
        </button>
        <span className="eyebrow">Planting plan</span>
        <h2 id="add-block-title">Add a planting block</h2>
        <p className="fine">
          Choose from your collection, then set the quantity and spacing before
          it appears on the plan.
        </p>
        <label className="add-search">
          Find a plant
          <input
            placeholder="Search varieties…"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </label>
        <div
          className="seed-picker"
          role="listbox"
          aria-label="Plant collection"
        >
          {shown.map((seed) => (
            <button
              type="button"
              key={seed.id}
              role="option"
              aria-selected={selectedId === seed.id}
              className={selectedId === seed.id ? "chosen" : ""}
              onClick={() => onSelect(seed)}
            >
              <span className="block-id" style={{ background: color(seed.id) }}>
                {plantCode(seed)}
              </span>
              <span>
                <strong>{seed.name}</strong>
                <small>
                  {seed.side === "flowers" ? "Flower" : "Vegetable or herb"} ·
                  supplier spacing {seed.spacing} cm
                </small>
              </span>
              <span>{selectedId === seed.id ? "Selected" : "›"}</span>
            </button>
          ))}
          {!shown.length && (
            <p className="fine">No plants match that search.</p>
          )}
        </div>
        {selected && (
          <div className="add-config">
            <div>
              <span className="eyebrow">Selected plant</span>
              <h3>{selected.name}</h3>
            </div>
            <NumberField
              label="How many plants?"
              value={count}
              min={1}
              max={1000}
              step={1}
              onChange={onCount}
            />
            <fieldset className="spacing-choice">
              <legend>Starting spacing</legend>
              <label className={spacing === "intensive" ? "selected" : ""}>
                <input
                  type="radio"
                  name="add-spacing"
                  checked={spacing === "intensive"}
                  onChange={() => onSpacing("intensive")}
                />
                <span>
                  <strong>Intensive</strong>
                  <small>
                    {intensiveSpacing(selected).spacing} cm plants ·{" "}
                    {intensiveSpacing(selected).rowSpacing} cm rows
                  </small>
                </span>
              </label>
              <label className={spacing === "supplier" ? "selected" : ""}>
                <input
                  type="radio"
                  name="add-spacing"
                  checked={spacing === "supplier"}
                  onChange={() => onSpacing("supplier")}
                />
                <span>
                  <strong>Supplier guide</strong>
                  <small>
                    {selected.spacing} cm plants · {selected.rowSpacing} cm rows
                  </small>
                </span>
              </label>
            </fieldset>
            <button className="primary full" onClick={onAdd}>
              Add {count} plant{count === 1 ? "" : "s"} to the plan
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
export default function Page() {
  const [plan, setPlan] = useState<Plan>(initialPlan),
    [ready, setReady] = useState(false),
    [selected, setSelected] = useState(""),
    [selectedIds, setSelectedIds] = useState<string[]>([]),
    [tab, setTab] = useState("plan"),
    [zoom, setZoom] = useState(1),
    [query, setQuery] = useState(""),
    [planQuery, setPlanQuery] = useState(""),
    [filter, setFilter] = useState("food"),
    [month, setMonth] = useState(9),
    [onlySeason, setOnlySeason] = useState(false),
    [onlyAdded, setOnlyAdded] = useState(false),
    [checkedSeeds, setCheckedSeeds] = useState<string[]>([]),
    [notice, setNotice] = useState(""),
    [shared, setShared] = useState(false),
    [shareUrl, setShareUrl] = useState(""),
    [history, setHistory] = useState<Plan[]>([]),
    [guide, setGuide] = useState<string>(""),
    [addOpen, setAddOpen] = useState(false),
    [addQuery, setAddQuery] = useState(""),
    [addSeedId, setAddSeedId] = useState(""),
    [addCount, setAddCount] = useState(1),
    [addSpacing, setAddSpacing] = useState<"intensive" | "supplier">(
      "intensive",
    ),
    [saved, setSaved] = useState(""),
    [legacy, setLegacy] = useState(false),
    [storageSafe, setStorageSafe] = useState(true),
    [snapshotKey, setSnapshotKey] = useState(""),
    [journalText, setJournalText] = useState(""),
    [journalDate, setJournalDate] = useState(today()),
    [importOpen, setImportOpen] = useState(false),
    [custom, setCustom] = useState({
      url: "",
      name: "",
      side: "food" as Seed["side"],
      spacing: 30,
      rowSpacing: 30,
      height: 60,
      method: "Direct",
      water: "",
      feed: "",
      notes: "",
    });
  const modal = useRef<HTMLElement>(null),
    mapSvg = useRef<SVGSVGElement>(null),
    gesture = useRef<{
      base: Plan;
      block: Block;
      blockIds: string[];
      startX: number;
      startY: number;
      mode: "move" | "resize";
      corner?: string;
      moved: boolean;
    } | null>(null);
  useEffect(() => {
    if (!guide) return;
    const previous = document.activeElement as HTMLElement;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGuide("");
      if (e.key === "Tab") {
        const focus = modal.current?.querySelectorAll<HTMLElement>(
          'button,a,input,select,textarea,[tabindex="0"]',
        );
        if (!focus?.length) return;
        const first = focus[0],
          last = focus[focus.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [guide]);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const hash = new URLSearchParams(location.hash.slice(1)).get("plan");
      if (hash) {
        const original = shareDecode(hash);
        const key = "plot-3k-snapshot-" + hash;
        setSnapshotKey(key);
        const savedSnapshot = localStorage.getItem(key);
        setPlan(
          compactPlanBlocks(
            savedSnapshot ? validatePlan(JSON.parse(savedSnapshot)) : original,
          ),
        );
        setShared(true);
        setNotice(
          "Shared snapshot. Changes stay on this device until you share a new copy.",
        );
      } else {
        const saved =
          localStorage.getItem(KEY) ||
          OLD_KEYS.map((k) => localStorage.getItem(k)).find(Boolean);
        setPlan(
          compactPlanBlocks(
            saved ? validatePlan(JSON.parse(saved)) : starter(),
          ),
        );
      }
      setLegacy(!!localStorage.getItem("plot-3p-plan-v2"));
      setMonth(
        Number(
          new Intl.DateTimeFormat("en", {
            month: "numeric",
            timeZone: "Australia/Melbourne",
          }).format(new Date()),
        ),
      );
    } catch {
      setStorageSafe(false);
      setNotice(
        "Could not read the saved/shared plan. Your previous data has not been changed. Import a valid backup to continue.",
      );
      setPlan(initialPlan);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !storageSafe) return;
    try {
      if (!shared || snapshotKey) {
        localStorage.setItem(shared ? snapshotKey : KEY, JSON.stringify(plan));
        setSaved("Saved on this device");
      }
    } catch {
      setSaved("Not saved — export a backup");
    }
  }, [plan, ready, shared, storageSafe, snapshotKey]);
  function commit(p: Plan) {
    setHistory((h) => [...h.slice(-29), plan]);
    setPlan({ ...p, updated: stamp() });
    setShareUrl("");
  }
  function updateBlock(patch: Partial<Block>) {
    if (!block) return;
    const structural = [
      "x",
      "y",
      "width",
      "length",
      "spacing",
      "rowSpacing",
      "side",
      "direction",
      "cropId",
    ];
    if (block.locked && structural.some((k) => k in patch)) {
      setNotice("Unlock this block before changing its layout.");
      return;
    }
    const reset = structural.some((k) => k in patch),
      refit =
        "spacing" in patch || "rowSpacing" in patch || "direction" in patch,
      resize = "width" in patch || "length" in patch,
      candidate = { ...block, ...patch },
      next = refit
        ? fitBlockToCount(
            candidate,
            block.targetCount ?? rowLayout(block).count,
            plan,
          )
        : resize
          ? snapResizeToPlantGrid(candidate, "se", 0, 0, plan)
          : candidate;
    commit({
      ...plan,
      blocks: plan.blocks.map((b) =>
        b.id === block.id ? { ...next, ...(reset ? { doneRows: [] } : {}) } : b,
      ),
    });
  }
  function setPlantCount(targetCount: number) {
    if (!block) return;
    if (block.locked) {
      setNotice("Unlock this block before changing its layout.");
      return;
    }
    const next = fitBlockToCount(block, targetCount, plan);
    commit({
      ...plan,
      blocks: plan.blocks.map((b) =>
        b.id === block.id ? { ...next, doneRows: [] } : b,
      ),
    });
  }
  function add(id: string) {
    const b = makeBlock(id, plan);
    if (!b) {
      setNotice("That plant could not be added. Please try again.");
      return;
    }
    commit({ ...plan, blocks: [...plan.blocks, b] });
    select(b.id);
    setNotice(
      "Added to the plan. If it overlaps another block, move or resize it into place.",
    );
  }
  function startAdd(seed?: Seed) {
    const draft = seed && makeBlock(seed.id, plan);
    setAddQuery(seed?.name || "");
    setAddSeedId(seed?.id || "");
    setAddCount(Math.max(1, draft ? rowLayout(draft).count : 1));
    setAddSpacing("intensive");
    setAddOpen(true);
  }
  function chooseAddSeed(seed: Seed) {
    const draft = makeBlock(seed.id, plan);
    setAddSeedId(seed.id);
    setAddCount(Math.max(1, draft ? rowLayout(draft).count : 1));
  }
  function addFromPlan() {
    const seed = seedFor(addSeedId, plan),
      base = seed && makeBlock(seed.id, plan);
    if (!seed || !base) {
      setNotice("Choose a plant before adding a block.");
      return;
    }
    const guide =
        addSpacing === "supplier"
          ? { spacing: seed.spacing, rowSpacing: seed.rowSpacing }
          : intensiveSpacing(seed),
      block = fitBlockToCount({ ...base, ...guide }, addCount, plan);
    commit({ ...plan, blocks: [...plan.blocks, block] });
    select(block.id);
    setAddOpen(false);
    setNotice(
      `${seed.name} added with ${addCount} planned plant${addCount === 1 ? "" : "s"}. Drag or resize it on the plan if needed.`,
    );
  }
  function organise() {
    const result = organisePlan(plan);
    commit(result.plan);
    clearSelection();
    setNotice(
      `Organised ${result.placed} movable blocks without overlaps. ${result.adjusted ? `${result.adjusted} block${result.adjusted === 1 ? "" : "s"} were compacted to use the available bed space.` : "All existing plant counts fit."} Permanent and locked blocks stayed put.`,
    );
  }
  function addChecked() {
    if (!checkedSeeds.length) return;
    let next = structuredClone(plan),
      added = 0;
    for (const id of checkedSeeds) {
      const b = makeBlock(id, next);
      if (!b) continue;
      next.blocks.push(b);
      added++;
    }
    if (!added) {
      setNotice("The selected plants could not be added. Please try again.");
      return;
    }
    commit(next);
    setNotice(
      `${added} block${added === 1 ? "" : "s"} added to the plan. Review any overlap warnings, then move them into place.`,
    );
  }
  function removeChecked() {
    if (!checkedSeeds.length) return;
    const next = plan.blocks.filter((b) => !checkedSeeds.includes(b.cropId)),
      removed = plan.blocks.length - next.length;
    commit({ ...plan, blocks: next });
    setCheckedSeeds([]);
    clearSelection();
    setNotice(
      `${removed} block${removed === 1 ? "" : "s"} removed from the plan.`,
    );
  }
  function toggleChecked(id: string) {
    setCheckedSeeds((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
  }
  function addCustomSeed() {
    let url: URL;
    try {
      url = new URL(custom.url);
      if (!["http:", "https:"].includes(url.protocol)) throw Error();
    } catch {
      setNotice("Paste a complete http or https seed-page link.");
      return;
    }
    if (!custom.name.trim()) {
      setNotice("Add the plant or variety name before saving.");
      return;
    }
    const seed: Seed = {
      id: "custom-" + crypto.randomUUID(),
      name: custom.name.trim(),
      side: custom.side,
      life: "Annual crop",
      spacing: custom.spacing,
      rowSpacing: custom.rowSpacing,
      height: custom.height,
      months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      method: custom.method,
      depth: "Check supplier page",
      germination: "Check supplier page",
      days: "Not specified",
      sources: [
        { supplier: url.hostname.replace(/^www\./, ""), url: url.href },
      ],
      notes:
        custom.notes.trim() ||
        "Imported from a supplier page. Confirm the packet directions before sowing.",
      packets: 0,
      seedCount: null,
      position: "Full sun unless the supplier says otherwise",
      checked: today(),
      water: custom.water.trim() || undefined,
      feed: custom.feed.trim() || undefined,
    };
    commit({ ...plan, customSeeds: [...plan.customSeeds, seed] });
    setCustom({
      url: "",
      name: "",
      side: "food",
      spacing: 30,
      rowSpacing: 30,
      height: 60,
      method: "Direct",
      water: "",
      feed: "",
      notes: "",
    });
    setImportOpen(false);
    setFilter("all");
    setNotice(`${seed.name} added to your collection.`);
  }
  function addJournal() {
    const text = journalText.trim();
    if (!text) return;
    commit({
      ...plan,
      journal: [
        { id: crypto.randomUUID(), date: journalDate || today(), text },
        ...plan.journal,
      ],
    });
    setJournalText("");
    setJournalDate(today());
    setNotice("Journal entry saved.");
  }
  function download(data: unknown, name: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function share() {
    const url =
      location.origin + location.pathname + "#plan=" + shareEncode(plan);
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setNotice(
        "Snapshot link copied. Send it to your partner; share again after later changes.",
      );
    } catch {
      setNotice("Copy the snapshot link below.");
    }
  }
  const catalog = [...SEEDS, ...plan.customSeeds],
    block = plan.blocks.find((b) => b.id === selected),
    seed = block ? seedFor(block.cropId, plan) : null,
    bw = bedWidth(plan),
    active = plan.blocks.filter((b) => b.status !== "finished"),
    count = active.reduce((s, b) => s + rowLayout(b).count, 0);
  const errors = active.flatMap((b) =>
      blockErrors(b, plan).map((e) => ({ b, e })),
    ),
    addedIds = new Set(active.map((b) => b.cropId)),
    seeds = catalog.filter(
      (c) =>
        (filter === "all" ||
          (filter === "purchased" && c.packets > 0) ||
          (filter === "custom" && c.id.startsWith("custom-")) ||
          (filter === "flowers" && c.side === "flowers") ||
          (filter === "food" && c.side === "food") ||
          (filter === "perennial" && /perennial/i.test(c.life))) &&
        c.name.toLowerCase().includes(query.toLowerCase()) &&
        (!onlySeason || c.months.includes(month)) &&
        (!onlyAdded || addedIds.has(c.id)),
    );
  const originX = 65,
    originY = 60,
    mapWidth = plan.plot.width + 130,
    mapHeight = plan.plot.length + 125;
  function clearSelection() {
    setSelected("");
    setSelectedIds([]);
  }
  function select(id: string, additive = false) {
    if (!additive) {
      setSelected(id);
      setSelectedIds([id]);
      return;
    }
    const next = selectedIds.includes(id)
      ? selectedIds.filter((value) => value !== id)
      : [...selectedIds, id];
    setSelectedIds(next);
    setSelected(next.includes(id) ? id : next[0] || "");
  }
  function nudgeSelection(dx: number, dy: number) {
    const ids = selectedIds.length ? selectedIds : selected ? [selected] : [];
    const blocks = plan.blocks.filter((b) => ids.includes(b.id) && !b.locked);
    if (!blocks.length) return;
    const minX = Math.max(...blocks.map((b) => -b.x)),
      maxX = Math.min(
        ...blocks.map((b) => sectionWidth(b.side, plan) - b.x - b.width),
      ),
      minY = Math.max(
        ...blocks.map(
          (b) => (b.side === "north" ? 0 : plan.plot.northDepth) - b.y,
        ),
      ),
      maxY = Math.min(
        ...blocks.map(
          (b) =>
            (b.side === "north" ? plan.plot.northDepth : plan.plot.length) -
            b.y -
            b.length,
        ),
      ),
      shiftX = Math.max(minX, Math.min(maxX, dx)),
      shiftY = Math.max(minY, Math.min(maxY, dy));
    if (!shiftX && !shiftY) return;
    commit({
      ...plan,
      blocks: plan.blocks.map((b) =>
        ids.includes(b.id) && !b.locked
          ? { ...b, x: b.x + shiftX, y: b.y + shiftY, doneRows: [] }
          : b,
      ),
    });
  }
  function handleMapKeys(e: React.KeyboardEvent<SVGSVGElement>) {
    const step = e.shiftKey ? 20 : 5;
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const direction = directions[e.key];
    if (!direction) return;
    e.preventDefault();
    nudgeSelection(...direction);
  }
  const warnings = (b: Block) => {
    const c = seedFor(b.cropId, plan)!;
    return [
      ...blockErrors(b, plan),
      ...(b.spacing < c.spacing || b.rowSpacing < c.rowSpacing
        ? [
            "Intensive spacing: let the canopy close, then keep airflow open with thinning, support or pruning.",
          ]
        : []),
      ...(b.side !== "north" &&
      (b.side === plan.plot.flowers) !== (c.side === "flowers")
        ? ["This crop is on the other half of the plot."]
        : []),
      ...(c.height > 100 && b.y < plan.plot.length / 2
        ? ["Tall planting near the north end may shade crops to its south."]
        : []),
      ...(c.method === "Tuber" &&
      plan.blocks
        .filter((o) => o.cropId === c.id && o.status !== "finished")
        .reduce((s, o) => s + rowLayout(o).count, 0) > 1
        ? ["Only one tuber of this variety was purchased."]
        : []),
    ];
  };
  function pointerPoint(e: ReactPointerEvent) {
    const svg = mapSvg.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const local = point.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: local.x - originX, y: local.y - originY };
  }
  function beginGesture(
    e: ReactPointerEvent<SVGGElement>,
    b: Block,
    mode: "move" | "resize",
    corner?: string,
  ) {
    e.stopPropagation();
    if (e.shiftKey && mode === "move") return;
    const blockIds =
      selectedIds.includes(b.id) && mode === "move" ? selectedIds : [b.id];
    if (!selectedIds.includes(b.id) || mode !== "move") select(b.id);
    if (b.locked) {
      setNotice("Unlock this block before moving or resizing it.");
      return;
    }
    const p = pointerPoint(e);
    gesture.current = {
      base: structuredClone(plan),
      block: { ...b },
      blockIds,
      startX: p.x,
      startY: p.y,
      mode,
      corner,
      moved: false,
    };
    mapSvg.current?.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moveGesture(e: ReactPointerEvent<SVGGElement>) {
    const g = gesture.current;
    if (!g) return;
    const p = pointerPoint(e),
      dx = Math.round((p.x - g.startX) / 5) * 5,
      dy = Math.round((p.y - g.startY) / 5) * 5;
    if (!dx && !dy) return;
    g.moved = true;
    const original = g.block;
    if (g.mode === "move" && g.blockIds.length > 1) {
      const blocks = g.base.blocks.filter((b) => g.blockIds.includes(b.id)),
        minX = Math.max(...blocks.map((b) => -b.x)),
        maxX = Math.min(
          ...blocks.map((b) => sectionWidth(b.side, g.base) - b.x - b.width),
        ),
        minY = Math.max(
          ...blocks.map(
            (b) => (b.side === "north" ? 0 : g.base.plot.northDepth) - b.y,
          ),
        ),
        maxY = Math.min(
          ...blocks.map(
            (b) =>
              (b.side === "north"
                ? g.base.plot.northDepth
                : g.base.plot.length) -
              b.y -
              b.length,
          ),
        ),
        shiftX = Math.max(minX, Math.min(maxX, dx)),
        shiftY = Math.max(minY, Math.min(maxY, dy));
      setPlan({
        ...g.base,
        blocks: g.base.blocks.map((b) =>
          g.blockIds.includes(b.id)
            ? { ...b, x: b.x + shiftX, y: b.y + shiftY, doneRows: [] }
            : b,
        ),
      });
      return;
    }
    let next = { ...original, doneRows: [] };
    if (g.mode === "move") {
      let gx = globalX(original, g.base) + dx,
        gy = original.y + dy;
      let side: BedSide =
        gy + original.length / 2 <= g.base.plot.northDepth
          ? "north"
          : gx + original.width / 2 < g.base.plot.width / 2
            ? "west"
            : "east";
      if (side !== "north" && original.width > bedWidth(g.base)) side = "north";
      const width = sectionWidth(side, g.base),
        minY = side === "north" ? 0 : g.base.plot.northDepth,
        maxY = side === "north" ? g.base.plot.northDepth : g.base.plot.length;
      gx = Math.max(
        side === "east" ? bedWidth(g.base) + g.base.plot.path : 0,
        Math.min(
          gx,
          (side === "east" ? bedWidth(g.base) + g.base.plot.path : 0) +
            width -
            original.width,
        ),
      );
      gy = Math.max(minY, Math.min(gy, maxY - original.length));
      next = {
        ...next,
        side,
        x: side === "east" ? gx - bedWidth(g.base) - g.base.plot.path : gx,
        y: gy,
      };
    } else
      next = snapResizeToPlantGrid(original, g.corner || "se", dx, dy, g.base);
    setPlan({
      ...g.base,
      blocks: g.base.blocks.map((o) => (o.id === original.id ? next : o)),
    });
  }
  function endGesture() {
    const g = gesture.current;
    if (!g) return;
    if (g.moved) {
      setHistory((h) => [...h.slice(-29), g.base]);
      setPlan((p) => ({ ...p, updated: stamp() }));
      setShareUrl("");
    }
    gesture.current = null;
  }
  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">3K</span>
          <div>
            <h1>The veggie patch</h1>
            <p>CERES · Plot 3K · Melbourne</p>
          </div>
        </div>
        <div className="top-actions">
          <span className="save-state">
            {shared ? "Shared snapshot" : saved}
          </span>
          <button onClick={() => window.print()}>Print plan</button>
          <button className="primary" onClick={share}>
            Share with partner ↗
          </button>
        </div>
      </header>
      <nav aria-label="Planner views">
        {[
          ["plan", "Planting plan"],
          ["seeds", "Seed collection"],
          ["jobs", "In the garden"],
          ["journal", "Journal"],
        ].map(([id, label]) => (
          <button
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {shareUrl && (
        <div className="share-box">
          <label>
            Partner link · a snapshot, not live sync
            <input
              value={shareUrl}
              readOnly
              onFocus={(e) => e.target.select()}
            />
          </label>
        </div>
      )}
      <section className="intro">
        <h2>
          {tab === "plan"
            ? "Plot 3K"
            : tab === "seeds"
              ? "Seed collection"
              : tab === "jobs"
                ? "In the garden"
                : tab === "journal"
                  ? "Garden journal"
                  : "Plot & backups"}
        </h2>
        <div className="stats">
          <span>
            <strong>
              {((plan.plot.width * plan.plot.length) / 10000).toFixed(2)}
            </strong>
            m² plot
          </span>
          <span>
            <strong>{active.length}</strong>active blocks
          </span>
          <span>
            <strong>{count}</strong>plants planned
          </span>
        </div>
      </section>
      {!ready ? (
        <p>Opening your planting plan…</p>
      ) : (
        <>
          {tab === "plan" && (
            <div className="workspace">
              <section className="map-panel">
                <div className="panel-head">
                  <div>
                    <h3>Plot 3K</h3>
                    <p>
                      North up · {plan.plot.length / 100} ×{" "}
                      {plan.plot.width / 100} m
                    </p>
                  </div>
                  <div className="zoom">
                    <button
                      aria-label="Zoom out"
                      disabled={zoom <= 0.75}
                      onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
                    >
                      −
                    </button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button
                      aria-label="Zoom in"
                      disabled={zoom >= 3}
                      onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                    >
                      +
                    </button>
                    <button onClick={() => setZoom(1)}>Fit</button>
                  </div>
                  <button className="organise-button" onClick={organise}>
                    Organise plan
                  </button>
                </div>
                <div className="map-scroll">
                  <svg
                    ref={mapSvg}
                    role="img"
                    tabIndex={0}
                    aria-label="Scaled interactive planting map of plot 3K. North is at the top. Drag a block to move it; select it to reveal four corner resize handles."
                    onKeyDown={handleMapKeys}
                    viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                    style={{
                      width: `${zoom * 350}px`,
                      maxWidth: zoom <= 1 ? "100%" : undefined,
                    }}
                  >
                    <defs>
                      <pattern
                        id="grid"
                        width="10"
                        height="10"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 10 0 L 0 0 0 10"
                          fill="none"
                          stroke="#b7c4b0"
                          strokeWidth=".35"
                        />
                      </pattern>
                      <pattern
                        id="plank"
                        width="7"
                        height="30"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 2 0 V 30 M 5 10 V 24"
                          stroke="#b7a385"
                          strokeWidth=".6"
                        />
                      </pattern>
                    </defs>
                    <text
                      x={mapWidth / 2}
                      y="20"
                      textAnchor="middle"
                      className="map-heading"
                    >
                      ↑ N · NORTHERN END
                    </text>
                    <text
                      x={originX + bw / 2}
                      y="43"
                      textAnchor="middle"
                      className="bed-title"
                    >
                      {plan.plot.flowers === "west"
                        ? "CUT FLOWERS"
                        : "VEG & HERBS"}
                    </text>
                    <text
                      x={originX + bw + plan.plot.path + bw / 2}
                      y="43"
                      textAnchor="middle"
                      className="bed-title"
                    >
                      {plan.plot.flowers === "east"
                        ? "CUT FLOWERS"
                        : "VEG & HERBS"}
                    </text>
                    <rect
                      x={originX}
                      y={originY}
                      width={plan.plot.width}
                      height={plan.plot.length}
                      fill="#e4e9da"
                      stroke="#556848"
                      strokeWidth="2"
                    />
                    <rect
                      x={originX}
                      y={originY}
                      width={plan.plot.width}
                      height={plan.plot.length}
                      fill="url(#grid)"
                    />
                    <rect
                      x={originX + bw}
                      y={originY + plan.plot.northDepth}
                      width={plan.plot.path}
                      height={plan.plot.length - plan.plot.northDepth}
                      fill="#d5c3a5"
                    />
                    <rect
                      x={originX + bw}
                      y={originY + plan.plot.northDepth}
                      width={plan.plot.path}
                      height={plan.plot.length - plan.plot.northDepth}
                      fill="url(#plank)"
                    />
                    <text
                      transform={`translate(${originX + bw + plan.plot.path / 2},${originY + plan.plot.northDepth + (plan.plot.length - plan.plot.northDepth) / 2}) rotate(-90)`}
                      textAnchor="middle"
                      className="path-label"
                    >
                      CENTRAL PLANK · {plan.plot.path} CM
                    </text>
                    {Array.from(
                      { length: Math.floor(plan.plot.length / 100) + 1 },
                      (_, i) => (
                        <g key={i}>
                          <line
                            x1={originX - 8}
                            x2={originX}
                            y1={originY + i * 100}
                            y2={originY + i * 100}
                            stroke="#68745f"
                          />
                          <text
                            x={originX - 12}
                            y={originY + i * 100 + 4}
                            textAnchor="end"
                            className="measure"
                          >
                            {i} m
                          </text>
                        </g>
                      ),
                    )}
                    {active.map((b) => {
                      const c = seedFor(b.cropId, plan)!,
                        offset =
                          originX +
                          (b.side === "east" ? bw + plan.plot.path : 0),
                        sel = selectedIds.includes(b.id),
                        primary = selected === b.id,
                        layout = rowLayout(b),
                        tier = heightTier(c.height),
                        code = plantCode(c),
                        handles = [
                          ["nw", offset + b.x, originY + b.y],
                          ["ne", offset + b.x + b.width, originY + b.y],
                          ["sw", offset + b.x, originY + b.y + b.length],
                          [
                            "se",
                            offset + b.x + b.width,
                            originY + b.y + b.length,
                          ],
                        ] as const;
                      return (
                        <g
                          key={b.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`${code}, ${c.name}, ${layout.count} plants, ${heightName(c.height)}. Drag to move; use corner handles to resize.`}
                          onPointerDown={(e) => beginGesture(e, b, "move")}
                          onPointerMove={moveGesture}
                          onPointerUp={endGesture}
                          onPointerCancel={endGesture}
                          onClick={(e) => select(b.id, e.shiftKey)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              select(b.id);
                            }
                          }}
                          className={`map-block height-${tier}`}
                        >
                          <title>
                            {code} · {c.name}: {layout.count} plants,{" "}
                            {heightName(c.height)}, up to {c.height} cm.{" "}
                            {b.permanent ? "Permanent." : ""}
                          </title>
                          <rect
                            className="block-shape"
                            x={offset + b.x}
                            y={originY + b.y}
                            width={b.width}
                            height={b.length}
                            rx="2"
                            fill={color(c.id)}
                            fillOpacity={
                              tier === "tall"
                                ? ".34"
                                : tier === "medium"
                                  ? ".25"
                                  : ".17"
                            }
                            stroke={sel ? "#172f20" : color(c.id)}
                            strokeWidth={sel ? 2.4 : 1}
                            strokeDasharray={b.permanent ? "4 2" : undefined}
                          />
                          {points(b)
                            .slice(0, 2500)
                            .map((p, i) => (
                              <circle
                                key={i}
                                cx={offset + p.x}
                                cy={originY + p.y}
                                r={Math.min(3.3, b.spacing * 0.16)}
                                fill={color(c.id)}
                                opacity={
                                  b.doneRows.includes(p.row) ? 0.3 : 0.85
                                }
                              />
                            ))}
                          <rect
                            x={offset + b.x + 2}
                            y={originY + b.y + 2}
                            width={Math.min(43, b.width - 4)}
                            height="13"
                            rx="2"
                            fill={sel ? "#172f20" : "#fff"}
                          />
                          <text
                            x={offset + b.x + 6}
                            y={originY + b.y + 11}
                            fill={sel ? "#fff" : "#172f20"}
                            className="block-label"
                          >
                            {code} {heightMark(c.height)}
                          </text>
                          {primary &&
                            handles.map(([corner, x, y]) => (
                              <rect
                                key={corner}
                                className="resize-handle"
                                aria-label={`Resize ${corner} corner`}
                                x={x - 4}
                                y={y - 4}
                                width="8"
                                height="8"
                                rx="1.5"
                                onPointerDown={(e) =>
                                  beginGesture(e, b, "resize", corner)
                                }
                              />
                            ))}
                        </g>
                      );
                    })}
                    <text
                      x={mapWidth / 2}
                      y={originY + plan.plot.length + 24}
                      textAnchor="middle"
                      className="map-heading"
                    >
                      SOUTHERN END
                    </text>
                    <line
                      x1={originX}
                      x2={originX + 100}
                      y1={mapHeight - 20}
                      y2={mapHeight - 20}
                      stroke="#172f20"
                      strokeWidth="2"
                    />
                    <text
                      x={originX + 110}
                      y={mapHeight - 16}
                      className="measure"
                    >
                      1 metre
                    </text>
                  </svg>
                </div>
                <div className="print-legend">
                  {active.map((b) => {
                    const c = seedFor(b.cropId, plan)!;
                    return (
                      <p key={b.id}>
                        <strong>
                          {plantCode(c)}: {c.name}
                        </strong>{" "}
                        — {rowLayout(b).count} plants; {heightName(c.height)};
                        plants {b.spacing} cm, rows {b.rowSpacing} cm.{" "}
                        {b.transplantedDate
                          ? `Transplanted ${b.transplantedDate}.`
                          : b.directSownDate
                            ? `Direct sown ${b.directSownDate}.`
                            : b.raisedDate
                              ? `Seed raised ${b.raisedDate}.`
                              : "No planting date yet."}{" "}
                        {b.notes}
                      </p>
                    );
                  })}
                </div>
                <div className="map-foot">
                  <span>Each dot = one final plant or chive clump</span>
                  <span className="height-key">
                    <b>▮</b> Low <b>▮▮</b> Medium <b>▮▮▮</b> Tall
                  </span>
                  <span>Dashed border = permanent</span>
                </div>
                <div className="zone-order">
                  <strong>Garden order, north to south</strong>
                  <span>Roots</span>
                  <span>Beans & peas</span>
                  <span>Leafy greens by the path</span>
                  <span>Heavy feeders</span>
                  <span>Tomato support run</span>
                  <span>Trellis crops</span>
                </div>
                <p className="fine">
                  Labels use a compact plant code: the first two letters of the
                  plant and variety. Shift-click to select several blocks,
                  then drag the group or use the arrow keys to nudge it (hold
                  Shift for larger steps). Select one block to resize it.
                </p>
              </section>
              <aside className="inspector">
                <div className="panel-head">
                  <h3>{block ? "Edit planting block" : "Planting blocks"}</h3>
                  <div className="panel-actions">
                    <button
                      className="add-block-button"
                      onClick={() => startAdd()}
                    >
                      + Add block
                    </button>
                    <button
                      disabled={!history.length}
                      onClick={() => {
                        setPlan(history[history.length - 1]);
                        setHistory((h) => h.slice(0, -1));
                      }}
                    >
                      ↶ Undo
                    </button>
                  </div>
                </div>
                {block && seed ? (
                  <>
                    <div className="selected-heading">
                      <span className="eyebrow">
                        {plantCode(seed)} · {block.side} bed ·{" "}
                        {heightName(seed.height)} {heightMark(seed.height)}
                      </span>
                      <h3>{seed.name}</h3>
                      <button
                        className="text-button"
                        onClick={clearSelection}
                      >
                        ← All blocks
                      </button>
                    </div>
                    <div className="row-summary">
                      <strong>{rowLayout(block).count} plants</strong>
                      <span>
                        {rowLayout(block).rows} rows · capacity{" "}
                        {rowLayout(block).capacity}
                      </span>
                    </div>
                    <fieldset disabled={block.locked} className="plant-count">
                      <NumberField
                        label="Number of plants"
                        value={block.targetCount ?? rowLayout(block).count}
                        min={1}
                        max={1000}
                        step={1}
                        onChange={setPlantCount}
                      />
                      <div className="spacing-actions">
                        <button
                          type="button"
                          onClick={() => updateBlock(intensiveSpacing(seed))}
                        >
                          Use intensive spacing
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateBlock({
                              spacing: seed.spacing,
                              rowSpacing: seed.rowSpacing,
                            })
                          }
                        >
                          Use supplier spacing
                        </button>
                      </div>
                    </fieldset>
                    <CareNotes seed={seed} compact />
                    <details className="inline-guide">
                      <summary>Growing guide & notes</summary>
                      <div className="inline-guide-body">
                        <p>
                          <strong>Sow:</strong>{" "}
                          {seed.months.map((m) => MONTHS[m - 1]).join(" · ")} ·{" "}
                          {seed.method.toLowerCase()} ·{" "}
                          {seed.depth.toLowerCase()}
                        </p>
                        <p>
                          <strong>Germination:</strong> {seed.germination}
                        </p>
                        <p>
                          <strong>Mature:</strong> {heightName(seed.height)}, up
                          to {seed.height} cm · {seed.position}
                        </p>
                        <p>{seed.notes}</p>
                        {seed.sources.map((s) => (
                          <a
                            key={s.url}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {s.supplier} guide ↗
                          </a>
                        ))}
                      </div>
                    </details>
                    <details className="advanced-layout">
                      <summary>Position & layout details</summary>
                      <div className="form-grid">
                        <label>
                          Bed
                          <select
                            value={block.side}
                            disabled={block.locked}
                            onChange={(e) => {
                              const side = e.target.value as Block["side"];
                              updateBlock({
                                side,
                                x: Math.max(
                                  0,
                                  Math.min(
                                    block.x,
                                    sectionWidth(side, plan) - block.width,
                                  ),
                                ),
                                y:
                                  side === "north"
                                    ? Math.max(
                                        0,
                                        Math.min(
                                          block.y,
                                          plan.plot.northDepth - block.length,
                                        ),
                                      )
                                    : Math.max(plan.plot.northDepth, block.y),
                              });
                            }}
                          >
                            <option value="north">Full-width north</option>
                            <option value="west">West</option>
                            <option value="east">East</option>
                          </select>
                        </label>
                        <label>
                          Rows run
                          <select
                            value={block.direction}
                            disabled={block.locked}
                            onChange={(e) =>
                              updateBlock({
                                direction: e.target.value as Block["direction"],
                              })
                            }
                          >
                            <option value="length">North–south</option>
                            <option value="across">East–west</option>
                          </select>
                        </label>
                        <NumberField
                          label="From west edge · cm"
                          value={block.x}
                          max={sectionWidth(block.side, plan)}
                          onChange={(x) => updateBlock({ x })}
                        />
                        <NumberField
                          label="From north end · cm"
                          value={block.y}
                          max={
                            block.side === "north"
                              ? plan.plot.northDepth
                              : plan.plot.length
                          }
                          onChange={(y) => updateBlock({ y })}
                        />
                        <NumberField
                          label="Width · cm"
                          value={block.width}
                          min={5}
                          max={sectionWidth(block.side, plan)}
                          onChange={(width) => updateBlock({ width })}
                        />
                        <NumberField
                          label="Length · cm"
                          value={block.length}
                          min={5}
                          max={
                            block.side === "north"
                              ? plan.plot.northDepth
                              : plan.plot.length - plan.plot.northDepth
                          }
                          onChange={(length) => updateBlock({ length })}
                        />
                        <NumberField
                          label="Plants apart · cm"
                          value={block.spacing}
                          min={5}
                          max={200}
                          onChange={(spacing) => updateBlock({ spacing })}
                        />
                        <NumberField
                          label="Rows apart · cm"
                          value={block.rowSpacing}
                          min={5}
                          max={200}
                          onChange={(rowSpacing) => updateBlock({ rowSpacing })}
                        />
                      </div>
                    </details>
                    <details className="advanced-layout">
                      <summary>
                        {warnings(block).length
                          ? `Layout guidance · ${warnings(block).length} notice${warnings(block).length === 1 ? "" : "s"}`
                          : "Layout guidance"}
                      </summary>
                      <div className="details-body">
                        {warnings(block).length ? (
                          warnings(block).map((w) => (
                            <p className="warning" key={w}>
                              {w}
                            </p>
                          ))
                        ) : (
                          <p className="fine">
                            This block uses the selected spacing and fits its
                            planned count.
                          </p>
                        )}
                      </div>
                    </details>
                    <details className="advanced-layout">
                      <summary>Planting dates</summary>
                      <fieldset className="milestones">
                        <label>
                          Seed raised
                          <input
                            type="date"
                            value={block.raisedDate || ""}
                            onChange={(e) =>
                              updateBlock({
                                raisedDate: e.target.value,
                                status: e.target.value ? "sown" : "planned",
                              })
                            }
                          />
                        </label>
                        <label>
                          Seed sown direct
                          <input
                            type="date"
                            value={block.directSownDate || ""}
                            onChange={(e) =>
                              updateBlock({
                                directSownDate: e.target.value,
                                status: e.target.value
                                  ? "planted"
                                  : block.transplantedDate
                                    ? "planted"
                                    : block.raisedDate
                                      ? "sown"
                                      : "planned",
                              })
                            }
                          />
                        </label>
                        <label>
                          Plant transplanted
                          <input
                            type="date"
                            value={block.transplantedDate || ""}
                            onChange={(e) =>
                              updateBlock({
                                transplantedDate: e.target.value,
                                status: e.target.value
                                  ? "planted"
                                  : block.directSownDate
                                    ? "planted"
                                    : block.raisedDate
                                      ? "sown"
                                      : "planned",
                              })
                            }
                          />
                        </label>
                      </fieldset>
                    </details>
                    <details className="advanced-layout">
                      <summary>Block settings & notes</summary>
                      <div className="details-body">
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={block.permanent}
                            onChange={(e) =>
                              updateBlock({ permanent: e.target.checked })
                            }
                          />
                          Reserve across seasons
                        </label>
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={block.locked}
                            onChange={(e) =>
                              updateBlock({ locked: e.target.checked })
                            }
                          />
                          Lock this layout
                        </label>
                        <label>
                          Planting notes
                          <textarea
                            value={block.notes}
                            maxLength={3000}
                            onChange={(e) =>
                              updateBlock({ notes: e.target.value })
                            }
                            placeholder="What is specific to this block?"
                          />
                        </label>
                      </div>
                    </details>
                    <div className="button-row">
                      <button
                        className="danger"
                        disabled={block.locked}
                        onClick={() => {
                          commit({
                            ...plan,
                            blocks: plan.blocks.filter(
                              (b) => b.id !== block.id,
                            ),
                          });
                          clearSelection();
                        }}
                      >
                        Remove block
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="fine">
                      Find any plant in your collection. Open one already on the
                      plan, or add a new planting block straight from here.
                    </p>
                    <label className="plan-search">
                      Find a plant
                      <input
                        aria-label="Find a plant in the planting plan"
                        placeholder="Type a plant name…"
                        value={planQuery}
                        onChange={(e) => setPlanQuery(e.target.value)}
                      />
                    </label>
                    <div className="block-list collection-block-list">
                      {catalog
                        .filter((c) =>
                          c.name
                            .toLowerCase()
                            .includes(planQuery.toLowerCase()),
                        )
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((c) => {
                          const matches = plan.blocks.filter(
                              (b) => b.cropId === c.id,
                            ),
                            planned = matches[0],
                            plantCount = matches.reduce(
                              (total, b) => total + rowLayout(b).count,
                              0,
                            );
                          return (
                            <button
                              key={c.id}
                              onClick={() =>
                                planned ? select(planned.id) : startAdd(c)
                              }
                            >
                              <span
                                className="block-id"
                                style={{ background: color(c.id) }}
                              >
                                {plantCode(c)}
                              </span>
                              <span>
                                <strong>{c.name}</strong>
                                <small>
                                  {planned
                                    ? `${matches.length} block${matches.length === 1 ? "" : "s"} · ${plantCount} plants planned`
                                    : "Not in the plan yet"}
                                </small>
                              </span>
                              <span>{planned ? "›" : "+ Add"}</span>
                            </button>
                          );
                        })}
                      {!catalog.some((c) =>
                        c.name.toLowerCase().includes(planQuery.toLowerCase()),
                      ) && <p className="fine">No plants match that search.</p>}
                    </div>
                  </>
                )}
              </aside>
            </div>
          )}
          {tab === "seeds" && (
            <section>
              <div className="import-plant">
                <div>
                  <span className="eyebrow">Add a new variety</span>
                  <h3>Import from a seed page</h3>
                  <p>
                    Paste the supplier link, then confirm the few details the
                    plan needs.
                  </p>
                </div>
                <div className="import-link">
                  <input
                    type="url"
                    aria-label="Seed-page link"
                    placeholder="https://supplier.com/vegetable-variety"
                    value={custom.url}
                    onChange={(e) => {
                      const url = e.target.value;
                      setCustom((c) => ({
                        ...c,
                        url,
                        name: c.name || nameFromUrl(url),
                      }));
                      setImportOpen(!!url);
                    }}
                  />
                  <button onClick={() => setImportOpen(true)}>
                    Review plant
                  </button>
                </div>
                {importOpen && (
                  <div className="import-form">
                    <label>
                      Plant / variety name
                      <input
                        value={custom.name}
                        onChange={(e) =>
                          setCustom((c) => ({ ...c, name: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Collection
                      <select
                        value={custom.side}
                        onChange={(e) =>
                          setCustom((c) => ({
                            ...c,
                            side: e.target.value as Seed["side"],
                          }))
                        }
                      >
                        <option value="food">Vegetable or herb</option>
                        <option value="flowers">Flower</option>
                      </select>
                    </label>
                    <NumberField
                      label="Supplier plant spacing · cm"
                      value={custom.spacing}
                      min={5}
                      max={300}
                      onChange={(spacing) =>
                        setCustom((c) => ({ ...c, spacing }))
                      }
                    />
                    <NumberField
                      label="Supplier row spacing · cm"
                      value={custom.rowSpacing}
                      min={5}
                      max={300}
                      onChange={(rowSpacing) =>
                        setCustom((c) => ({ ...c, rowSpacing }))
                      }
                    />
                    <NumberField
                      label="Mature height · cm"
                      value={custom.height}
                      min={1}
                      max={1000}
                      onChange={(height) =>
                        setCustom((c) => ({ ...c, height }))
                      }
                    />
                    <label>
                      Start by
                      <select
                        value={custom.method}
                        onChange={(e) =>
                          setCustom((c) => ({ ...c, method: e.target.value }))
                        }
                      >
                        <option>Direct</option>
                        <option>Trays</option>
                        <option>Trays or direct</option>
                        <option>Tuber</option>
                      </select>
                    </label>
                    <label>
                      Water needs
                      <input
                        value={custom.water}
                        onChange={(e) =>
                          setCustom((c) => ({ ...c, water: e.target.value }))
                        }
                        placeholder="e.g. Keep evenly moist"
                      />
                    </label>
                    <label>
                      Feeding needs
                      <input
                        value={custom.feed}
                        onChange={(e) =>
                          setCustom((c) => ({ ...c, feed: e.target.value }))
                        }
                        placeholder="e.g. Compost, then fortnightly feed"
                      />
                    </label>
                    <label className="import-notes">
                      Growing notes
                      <textarea
                        value={custom.notes}
                        onChange={(e) =>
                          setCustom((c) => ({ ...c, notes: e.target.value }))
                        }
                        placeholder="Anything important from the supplier page"
                      />
                    </label>
                    <div className="button-row">
                      <button className="primary" onClick={addCustomSeed}>
                        Add to collection
                      </button>
                      <button onClick={() => setImportOpen(false)}>
                        Minimise
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="collection-tools">
                <label className="search">
                  Find a plant
                  <input
                    placeholder="Search varieties…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <label>
                  Collection
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="purchased">Purchased · 27 varieties</option>
                    <option value="custom">
                      My imports · {plan.customSeeds.length}
                    </option>
                    <option value="flowers">Flowers</option>
                    <option value="food">Vegetables & herbs</option>
                    <option value="perennial">Perennials</option>
                    <option value="all">All plants</option>
                  </select>
                </label>
                <label>
                  Sowing month
                  <select
                    value={month}
                    onChange={(e) => setMonth(+e.target.value)}
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={onlySeason}
                    onChange={(e) => setOnlySeason(e.target.checked)}
                  />
                  Suitable to sow this month
                </label>
              </div>
              <div className="collection-bulk-actions">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={onlyAdded}
                    onChange={(e) => setOnlyAdded(e.target.checked)}
                  />
                  Already in garden plan
                </label>
                <button
                  onClick={() => setCheckedSeeds(seeds.map((c) => c.id))}
                  disabled={!seeds.length}
                >
                  Select shown
                </button>
                <button
                  onClick={() => setCheckedSeeds([])}
                  disabled={!checkedSeeds.length}
                >
                  Clear
                </button>
                <button
                  className="primary"
                  onClick={addChecked}
                  disabled={!checkedSeeds.length}
                >
                  Add selected
                </button>
                <button
                  className="danger"
                  onClick={removeChecked}
                  disabled={!checkedSeeds.length}
                >
                  Remove selected
                </button>
                {checkedSeeds.length > 0 && (
                  <span>{checkedSeeds.length} selected</span>
                )}
              </div>
              <p className="fine">
                New blocks use intensive spacing by default—roughly 25–30%
                closer than the supplier guide—while retaining the mature-height
                plan.
              </p>
              <div className="seed-grid">
                {seeds.map((c) => (
                  <SeedCard
                    key={c.id}
                    seed={c}
                    added={addedIds.has(c.id)}
                    checked={checkedSeeds.includes(c.id)}
                    month={month}
                    onToggle={() => toggleChecked(c.id)}
                    onGuide={() => setGuide(c.id)}
                    onAdd={() => add(c.id)}
                  />
                ))}
              </div>
              {!seeds.length && <p>No varieties match these filters.</p>}
            </section>
          )}
          {tab === "jobs" && (
            <section className="garden-view">
              <div className="notice">
                Mark rows as you plant them. Water and feeding needs stay
                visible on each job card.
              </div>
              {!active.length && (
                <p>
                  Add a block in the seed collection to create your planting
                  instructions.
                </p>
              )}
              {[...active]
                .sort((a, b) =>
                  (
                    b.transplantedDate ||
                    b.directSownDate ||
                    b.raisedDate ||
                    ""
                  ).localeCompare(
                    a.transplantedDate ||
                      a.directSownDate ||
                      a.raisedDate ||
                      "",
                  ),
                )
                .map((b) => {
                  const c = seedFor(b.cropId, plan)!,
                    r = rowLayout(b);
                  return (
                    <article className="job" key={b.id}>
                      <div className="job-heading">
                        <span
                          className="block-id"
                          style={{ background: color(c.id) }}
                        >
                          {plantCode(c)}
                        </span>
                        <div>
                          <h3>{c.name}</h3>
                          <p>
                            {heightName(c.height)} {heightMark(c.height)} ·{" "}
                            {r.count} plants
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            select(b.id);
                            setTab("plan");
                          }}
                        >
                          Show block
                        </button>
                      </div>
                      <CareNotes seed={c} compact />
                      <div className="date-strip">
                        <span>
                          Raised <strong>{b.raisedDate || "—"}</strong>
                        </span>
                        <span>
                          Direct sown <strong>{b.directSownDate || "—"}</strong>
                        </span>
                        <span>
                          Transplanted{" "}
                          <strong>{b.transplantedDate || "—"}</strong>
                        </span>
                      </div>
                      <p>
                        <strong>
                          {r.rows} rows, {r.count} plants
                        </strong>{" "}
                        · {b.spacing} cm between plants · {b.rowSpacing} cm
                        between rows
                      </p>
                      <p>
                        In the {b.side} bed, {b.y} cm from the north end and{" "}
                        {b.x} cm from the section’s west edge. Rows run{" "}
                        {b.direction === "length" ? "north–south" : "east–west"}
                        .
                      </p>
                      {!c.months.includes(month) && (
                        <p className="warning">
                          Outside the supplier’s {MONTHS[month - 1]} sowing
                          window. Check local conditions before planting.
                        </p>
                      )}
                      {warnings(b).map((w) => (
                        <p className="warning" key={w}>
                          {w}
                        </p>
                      ))}
                      {b.notes && <p className="job-note">{b.notes}</p>}
                      <div className="row-checks">
                        {Array.from({ length: r.rows }, (_, i) => (
                          <label className="check" key={i}>
                            <input
                              type="checkbox"
                              checked={b.doneRows.includes(i)}
                              onChange={(e) =>
                                commit({
                                  ...plan,
                                  blocks: plan.blocks.map((o) =>
                                    o.id === b.id
                                      ? {
                                          ...o,
                                          doneRows: e.target.checked
                                            ? [...o.doneRows, i]
                                            : o.doneRows.filter((n) => n !== i),
                                        }
                                      : o,
                                  ),
                                })
                              }
                            />
                            Row {i + 1}
                          </label>
                        ))}
                      </div>
                      <button onClick={() => setGuide(c.id)}>
                        Read full growing guide
                      </button>
                    </article>
                  );
                })}
              <label>
                Notes for the garden
                <textarea
                  value={plan.notes}
                  maxLength={10000}
                  onChange={(e) => commit({ ...plan, notes: e.target.value })}
                  placeholder="What to water, which trays are ready, what to leave for later…"
                />
              </label>
            </section>
          )}
          {tab === "journal" && (
            <section className="journal-view">
              <article className="journal-compose">
                <span className="eyebrow">New entry</span>
                <h3>What happened in the patch?</h3>
                <div className="journal-date">
                  <label>
                    Date
                    <input
                      type="date"
                      value={journalDate}
                      onChange={(e) => setJournalDate(e.target.value)}
                    />
                  </label>
                </div>
                <label>
                  Observation or work done
                  <textarea
                    value={journalText}
                    maxLength={10000}
                    onChange={(e) => setJournalText(e.target.value)}
                    placeholder="Watered the new seedlings, noticed aphids on the broad beans, harvested…"
                  />
                </label>
                <button
                  className="primary"
                  disabled={!journalText.trim()}
                  onClick={addJournal}
                >
                  Save journal entry
                </button>
              </article>
              <div className="journal-list">
                {[...plan.journal]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((entry) => (
                    <article className="journal-entry" key={entry.id}>
                      <time>
                        {new Date(entry.date + "T12:00:00").toLocaleDateString(
                          "en-AU",
                          {
                            weekday: "short",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          },
                        )}
                      </time>
                      <textarea
                        aria-label={`Journal entry for ${entry.date}`}
                        value={entry.text}
                        maxLength={10000}
                        onChange={(e) =>
                          commit({
                            ...plan,
                            journal: plan.journal.map((j) =>
                              j.id === entry.id
                                ? { ...j, text: e.target.value }
                                : j,
                            ),
                          })
                        }
                      />
                      <button
                        className="danger"
                        onClick={() => {
                          if (confirm("Remove this journal entry?"))
                            commit({
                              ...plan,
                              journal: plan.journal.filter(
                                (j) => j.id !== entry.id,
                              ),
                            });
                        }}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                {!plan.journal.length && (
                  <p className="empty-journal">
                    No entries yet. Use the journal for observations, weather
                    notes, sowing decisions and jobs completed.
                  </p>
                )}
              </div>
            </section>
          )}
          {tab === "setup" && (
            <div className="setup-grid">
              <section className="card">
                <h3>A full-width northern end.</h3>
                <p>
                  The plank stops below the northern cross-bed, making the plan
                  T-shaped. Below it, the plank divides equal west and east
                  growing beds.
                </p>
                <div className="form-grid">
                  <NumberField
                    label="North–south length · cm"
                    value={plan.plot.length}
                    min={100}
                    onChange={(length) =>
                      commit({ ...plan, plot: { ...plan.plot, length } })
                    }
                  />
                  <NumberField
                    label="East–west width · cm"
                    value={plan.plot.width}
                    min={100}
                    max={1000}
                    onChange={(width) =>
                      commit({ ...plan, plot: { ...plan.plot, width } })
                    }
                  />
                  <NumberField
                    label="Full-width north bed depth · cm"
                    value={plan.plot.northDepth}
                    min={20}
                    max={Math.min(300, plan.plot.length - 40)}
                    onChange={(northDepth) =>
                      commit({ ...plan, plot: { ...plan.plot, northDepth } })
                    }
                  />
                  <NumberField
                    label="Plank width · cm (estimate)"
                    value={plan.plot.path}
                    min={5}
                    max={Math.min(150, plan.plot.width - 40)}
                    onChange={(path) =>
                      commit({ ...plan, plot: { ...plan.plot, path } })
                    }
                  />
                </div>
                <p>
                  North bed: {plan.plot.width / 100} ×{" "}
                  {plan.plot.northDepth / 100} m. Each lower bed:{" "}
                  {(bw / 100).toFixed(2)} ×{" "}
                  {(plan.plot.length - plan.plot.northDepth) / 100} m.
                </p>
                <button
                  onClick={() =>
                    commit({
                      ...plan,
                      plot: {
                        ...plan.plot,
                        flowers: plan.plot.flowers === "west" ? "east" : "west",
                      },
                      blocks: plan.blocks.map((b) =>
                        b.side === "north"
                          ? b
                          : {
                              ...b,
                              side: b.side === "west" ? "east" : "west",
                              x: bw - b.x - b.width,
                            },
                      ),
                    })
                  }
                >
                  Swap flower and vegetable halves
                </button>
                <p className="fine">
                  The northern depth starts at 60 cm as a working estimate.
                  Measure where the plank actually begins; changing dimensions
                  flags blocks that need moving.
                </p>
                {errors.map(({ b, e }, i) => (
                  <p className="warning" key={i}>
                    {seedFor(b.cropId, plan)?.name}: {e}
                  </p>
                ))}
              </section>
              <section className="card">
                <h3>A shared plan you can take outside.</h3>
                <p>
                  The GitHub app opens without an account. A partner link
                  carries a complete snapshot of the layout, dates, notes and
                  completed rows. It opens without replacing an existing saved
                  plan.
                </p>
                <p>
                  <strong>Snapshots do not update live.</strong> Your partner
                  can tick rows and share the updated copy back. For a single
                  continually synced plan, a shared storage service will be
                  needed.
                </p>
                <div className="button-row">
                  <button onClick={share}>Copy partner link</button>
                  <button onClick={() => download(plan, "plot-3k-plan.json")}>
                    Export backup
                  </button>
                  <button onClick={() => file.current?.click()}>
                    Import backup
                  </button>
                </div>
                {shared && (
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Save this snapshot over the Plot 3K plan on this device? Export your current plan first if needed.",
                        )
                      ) {
                        setShared(false);
                        window.history.replaceState(
                          null,
                          "",
                          location.pathname,
                        );
                        setNotice("Snapshot saved as the plan on this device.");
                      }
                    }}
                  >
                    Save snapshot on this device
                  </button>
                )}
                <input
                  ref={file}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      if (f.size > 200000) throw Error("Too large");
                      const p = validatePlan(JSON.parse(await f.text()));
                      commit(p);
                      setStorageSafe(true);
                      setNotice("Backup imported. Review any layout warnings.");
                    } catch {
                      setNotice(
                        "Import failed: choose a valid Plot 3K backup. Your plan was not changed.",
                      );
                    }
                    e.target.value = "";
                  }}
                />
                {legacy && (
                  <>
                    <p>
                      Your old Plot 3P data is still stored separately on this
                      device.
                    </p>
                    <button
                      onClick={() => {
                        const raw = localStorage.getItem("plot-3p-plan-v2");
                        if (raw)
                          download(JSON.parse(raw), "plot-3p-archive.json");
                      }}
                    >
                      Export old Plot 3P plan
                    </button>
                  </>
                )}
              </section>
              <section className="card">
                <h3>Planting priorities</h3>
                <p>
                  New blocks use an intensive starting pitch, generally 25–30%
                  closer than supplier spacing. Mature height still matters:
                  tall crops are proposed towards the southern end, with lower
                  crops kept nearer the north and path edges so they retain
                  light.
                </p>
                <p>
                  This is a living-canopy approach, not a fixed rule. Let
                  foliage cover the soil, then thin, prune or support plants
                  when airflow and access tighten. The supplier spacing remains
                  one click away on every block.
                </p>
                <p>
                  Keep perennial clumps and dahlia positions together and
                  reserve them across seasons. Use annual blocks for rotations
                  and successive sowings. The starter layout is a proposal, not
                  a record of existing plants.
                </p>
                <p>
                  The T-shaped bed provides{" "}
                  {(
                    (plan.plot.width * plan.plot.length -
                      plan.plot.path *
                        (plan.plot.length - plan.plot.northDepth)) /
                    10000
                  ).toFixed(2)}{" "}
                  m² of growing space. All 27 purchased varieties do not need to
                  be planted at once.
                </p>
              </section>
              <section className="card">
                <h3>What changed from Plot 3P</h3>
                <p>
                  The rectangular row planner replaces the triangle-specific
                  shade optimiser and individual-plant dragging. Numbered
                  blocks, separate row and plant spacing, zoom, permanent
                  reservations and a planting checklist now form the main
                  workflow.
                </p>
                <p>
                  The existing crop library is retained alongside the exact
                  purchased varieties. Every purchased variety links to its
                  supplier. Unverified legacy crop values and planning estimates
                  are labelled.
                </p>
              </section>
            </div>
          )}
        </>
      )}
      {addOpen && (
        <AddBlockDialog
          seeds={[...SEEDS, ...plan.customSeeds]}
          selectedId={addSeedId}
          query={addQuery}
          count={addCount}
          spacing={addSpacing}
          onClose={() => setAddOpen(false)}
          onQuery={setAddQuery}
          onSelect={chooseAddSeed}
          onCount={setAddCount}
          onSpacing={setAddSpacing}
          onAdd={addFromPlan}
        />
      )}{" "}
      {guide && seedFor(guide, plan) && (
        <div className="modal-backdrop" onClick={() => setGuide("")}>
          <section
            ref={modal}
            role="dialog"
            aria-modal="true"
            aria-label="Plant growing guide"
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button autoFocus className="close" onClick={() => setGuide("")}>
              Close ×
            </button>
            <GrowGuide seed={seedFor(guide, plan)!} />
          </section>
        </div>
      )}
      <footer>
        <button
          className={tab === "setup" ? "active-footer" : ""}
          onClick={() => setTab("setup")}
        >
          Plot & backups
        </button>
        <span>
          {" "}
          · Plot 3K · T-shaped planting plan · Growing guides checked September
          2026
        </span>
      </footer>
    </main>
  );
}
