export type SunNeed = "full" | "part";
export type CropGroup =
  | "fruiting"
  | "leaf"
  | "root"
  | "brassica"
  | "legume"
  | "herb"
  | "flower"
  | "perennial";

export type Crop = {
  id: string;
  name: string;
  short: string;
  group: CropGroup;
  family: string;
  spacing: number;
  height: number;
  sun: SunNeed;
  months: number[];
  days: number;
  peakMonths?: number[];
  perennial?: boolean;
  layout?: "row" | "block" | "individual";
  support?: boolean;
  quick?: boolean;
  frequent?: boolean;
  color: string;
};

export type PlantingRequest = {
  id: string;
  cropId: string;
  quantity: number;
  priority: "high" | "normal";
};

export type PlantingPlacement = {
  id: string;
  requestId: string;
  cropId: string;
  x: number;
  y: number;
  sunHours: number;
  reason: string;
  status: "planned" | "planted";
  locked: boolean;
  interplantedWith?: string;
};

export type PlannerSettings = {
  month: number;
  density: "standard" | "intensive";
  interplant: boolean;
  accessPath: boolean;
  useFence: boolean;
  showShade: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  alignmentAssist: boolean;
  gridSize: number;
  filterByMonth: boolean;
  scenarioSeed: number;
};

export type LayoutResult = {
  placements: PlantingPlacement[];
  unplaced: Record<string, number>;
  notes: string[];
};

export const PLOT_3P: [number, number][] = [
  [0, 0],
  [4.25, 0],
  [4.85, 4.55],
];

export const PLOT_3O: [number, number][] = [
  [0, -3.25],
  [4.25, -3.25],
  [4.25, 0],
  [0, 0],
];

export const EAST_PATH: [number, number][] = [
  [4.25, 0],
  [4.85, 4.55],
  [5.66, 4.44],
  [5.05, -0.11],
];

export const PLOT_3A_BEYOND_PATH: [number, number][] = [
  [5.05, -0.11],
  [7.75, -0.08],
  [8.08, 4.05],
  [5.66, 4.44],
];

export const ACCESSIBLE_BEDS: [number, number][] = [
  [4.95, 4.95],
  [5.75, 5.55],
  [8.7, 5.15],
  [8.85, 4.4],
  [5.9, 4.55],
];

export const ACCESS_PADS: [number, number][] = [
  [4.12, 1.15],
  [3.42, 1.15],
  [2.72, 1.15],
  [2.02, 1.15],
  [1.32, 1.15],
];

export const CROPS: Crop[] = [
  {
    id: "tomato",
    name: "Tomato",
    short: "T",
    group: "fruiting",
    family: "Solanaceae",
    spacing: 0.55,
    height: 1.8,
    sun: "full",
    months: [9, 10, 11, 12],
    days: 95,
    peakMonths: [12, 1, 2],
    layout: "individual",
    support: true,
    frequent: true,
    color: "#cf6a42",
  },
  {
    id: "capsicum",
    name: "Capsicum",
    short: "Ca",
    group: "fruiting",
    family: "Solanaceae",
    spacing: 0.45,
    height: 0.7,
    sun: "full",
    months: [9, 10, 11, 12],
    days: 100,
    frequent: true,
    color: "#d47b43",
  },
  {
    id: "eggplant",
    name: "Eggplant",
    short: "E",
    group: "fruiting",
    family: "Solanaceae",
    spacing: 0.5,
    height: 0.8,
    sun: "full",
    months: [10, 11, 12],
    days: 100,
    frequent: true,
    color: "#80619a",
  },
  {
    id: "cucumber",
    name: "Cucumber",
    short: "Cu",
    group: "fruiting",
    family: "Cucurbitaceae",
    spacing: 0.45,
    height: 1.6,
    sun: "full",
    months: [9, 10, 11, 12],
    days: 70,
    support: true,
    frequent: true,
    color: "#5f9855",
  },
  {
    id: "zucchini",
    name: "Zucchini",
    short: "Z",
    group: "fruiting",
    family: "Cucurbitaceae",
    spacing: 0.9,
    height: 0.65,
    sun: "full",
    months: [9, 10, 11],
    days: 60,
    frequent: true,
    color: "#4e8d4f",
  },
  {
    id: "pumpkin",
    name: "Pumpkin",
    short: "Pu",
    group: "fruiting",
    family: "Cucurbitaceae",
    spacing: 1.2,
    height: 0.45,
    sun: "full",
    months: [9, 10, 11],
    days: 120,
    color: "#d28a38",
  },
  {
    id: "climbing-bean",
    name: "Climbing bean",
    short: "B",
    group: "legume",
    family: "Fabaceae",
    spacing: 0.18,
    height: 2,
    sun: "full",
    months: [9, 10, 11, 12, 1],
    days: 70,
    support: true,
    frequent: true,
    color: "#62a05d",
  },
  {
    id: "pea",
    name: "Pea",
    short: "P",
    group: "legume",
    family: "Fabaceae",
    spacing: 0.12,
    height: 1.5,
    sun: "full",
    months: [3, 4, 5, 6, 7, 8, 9],
    days: 75,
    support: true,
    frequent: true,
    color: "#77a95d",
  },
  {
    id: "broad-bean",
    name: "Broad bean",
    short: "BB",
    group: "legume",
    family: "Fabaceae",
    spacing: 0.2,
    height: 1.2,
    sun: "full",
    months: [3, 4, 5, 6, 7, 8],
    days: 105,
    color: "#70985b",
  },
  {
    id: "sweetcorn",
    name: "Sweetcorn",
    short: "Co",
    group: "fruiting",
    family: "Poaceae",
    spacing: 0.3,
    height: 1.8,
    sun: "full",
    months: [9, 10, 11, 12],
    days: 90,
    color: "#d2a94b",
  },
  {
    id: "broccoli",
    name: "Broccoli",
    short: "Br",
    group: "brassica",
    family: "Brassicaceae",
    spacing: 0.4,
    height: 0.7,
    sun: "full",
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    days: 90,
    color: "#4f7e58",
  },
  {
    id: "cabbage",
    name: "Cabbage",
    short: "Cb",
    group: "brassica",
    family: "Brassicaceae",
    spacing: 0.38,
    height: 0.45,
    sun: "full",
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    days: 90,
    color: "#688e66",
  },
  {
    id: "kale",
    name: "Kale",
    short: "K",
    group: "brassica",
    family: "Brassicaceae",
    spacing: 0.35,
    height: 0.7,
    sun: "part",
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    days: 65,
    frequent: true,
    color: "#3e7550",
  },
  {
    id: "silverbeet",
    name: "Silverbeet",
    short: "S",
    group: "leaf",
    family: "Amaranthaceae",
    spacing: 0.3,
    height: 0.55,
    sun: "part",
    months: [1, 2, 3, 4, 5, 9, 10, 11, 12],
    days: 60,
    frequent: true,
    color: "#3f8a60",
  },
  {
    id: "lettuce",
    name: "Lettuce",
    short: "L",
    group: "leaf",
    family: "Asteraceae",
    spacing: 0.25,
    height: 0.25,
    sun: "part",
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    days: 50,
    quick: true,
    frequent: true,
    color: "#88b85f",
  },
  {
    id: "rocket",
    name: "Rocket",
    short: "R",
    group: "leaf",
    family: "Brassicaceae",
    spacing: 0.15,
    height: 0.25,
    sun: "part",
    months: [2, 3, 4, 5, 7, 8, 9, 10],
    days: 35,
    quick: true,
    frequent: true,
    color: "#6ca35a",
  },
  {
    id: "spinach",
    name: "Spinach",
    short: "Sp",
    group: "leaf",
    family: "Amaranthaceae",
    spacing: 0.15,
    height: 0.25,
    sun: "part",
    months: [4, 5, 6, 7, 8, 9],
    days: 45,
    quick: true,
    frequent: true,
    color: "#568d58",
  },
  {
    id: "carrot",
    name: "Carrot",
    short: "C",
    group: "root",
    family: "Apiaceae",
    spacing: 0.1,
    height: 0.35,
    sun: "part",
    months: [1, 2, 3, 4, 9, 10, 11, 12],
    days: 80,
    color: "#d8893d",
  },
  {
    id: "beetroot",
    name: "Beetroot",
    short: "Be",
    group: "root",
    family: "Amaranthaceae",
    spacing: 0.15,
    height: 0.35,
    sun: "part",
    months: [1, 2, 3, 4, 7, 8, 9, 10, 11, 12],
    days: 65,
    color: "#a65b62",
  },
  {
    id: "radish",
    name: "Radish",
    short: "Ra",
    group: "root",
    family: "Brassicaceae",
    spacing: 0.08,
    height: 0.2,
    sun: "part",
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    days: 30,
    quick: true,
    color: "#d55c5a",
  },
  {
    id: "onion",
    name: "Onion",
    short: "O",
    group: "root",
    family: "Amaryllidaceae",
    spacing: 0.12,
    height: 0.45,
    sun: "full",
    months: [5, 6, 7, 8],
    days: 150,
    color: "#c9aa72",
  },
  {
    id: "garlic",
    name: "Garlic",
    short: "G",
    group: "root",
    family: "Amaryllidaceae",
    spacing: 0.12,
    height: 0.5,
    sun: "full",
    months: [3, 4, 5, 6],
    days: 210,
    color: "#b7a989",
  },
  {
    id: "spring-onion",
    name: "Spring onion",
    short: "SO",
    group: "root",
    family: "Amaryllidaceae",
    spacing: 0.08,
    height: 0.35,
    sun: "part",
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    days: 55,
    quick: true,
    color: "#7fa476",
  },
  {
    id: "potato",
    name: "Potato",
    short: "Po",
    group: "root",
    family: "Solanaceae",
    spacing: 0.3,
    height: 0.65,
    sun: "full",
    months: [8, 9, 10, 11, 12, 1, 2, 3, 4],
    days: 100,
    color: "#9a805b",
  },
  {
    id: "basil",
    name: "Basil",
    short: "Ba",
    group: "herb",
    family: "Lamiaceae",
    spacing: 0.25,
    height: 0.4,
    sun: "full",
    months: [10, 11, 12, 1, 2],
    days: 50,
    quick: true,
    frequent: true,
    color: "#4f9b66",
  },
  {
    id: "parsley",
    name: "Parsley",
    short: "Pa",
    group: "herb",
    family: "Apiaceae",
    spacing: 0.25,
    height: 0.35,
    sun: "part",
    months: [1, 2, 3, 4, 5, 9, 10, 11, 12],
    days: 75,
    frequent: true,
    color: "#4f8454",
  },
  {
    id: "coriander",
    name: "Coriander",
    short: "Cr",
    group: "herb",
    family: "Apiaceae",
    spacing: 0.15,
    height: 0.35,
    sun: "part",
    months: [2, 3, 4, 5, 6, 7, 8, 9],
    days: 45,
    quick: true,
    frequent: true,
    color: "#62925a",
  },
  {
    id: "dahlia",
    name: "Dahlia",
    short: "D",
    group: "flower",
    family: "Asteraceae",
    spacing: 0.6,
    height: 1.2,
    sun: "full",
    months: [9, 10, 11],
    days: 110,
    frequent: true,
    color: "#b94f79",
  },
  {
    id: "sunflower",
    name: "Sunflower",
    short: "Sf",
    group: "flower",
    family: "Asteraceae",
    spacing: 0.45,
    height: 2,
    sun: "full",
    months: [9, 10, 11, 12, 1],
    days: 90,
    color: "#d6a62d",
  },
  {
    id: "zinnia",
    name: "Zinnia",
    short: "Zi",
    group: "flower",
    family: "Asteraceae",
    spacing: 0.3,
    height: 0.75,
    sun: "full",
    months: [10, 11, 12, 1],
    days: 70,
    frequent: true,
    color: "#d85f6e",
  },
  {
    id: "poppy",
    name: "Poppy",
    short: "Po",
    group: "flower",
    family: "Papaveraceae",
    spacing: 0.25,
    height: 0.65,
    sun: "full",
    months: [3, 4, 5, 6, 7, 8],
    days: 90,
    color: "#e26c45",
  },
  {
    id: "asparagus",
    name: "Asparagus",
    short: "As",
    group: "perennial",
    family: "Asparagaceae",
    spacing: 0.45,
    height: 1.5,
    sun: "full",
    months: [5, 6, 7, 8],
    peakMonths: [11, 12, 1, 2, 3],
    days: 730,
    perennial: true,
    layout: "row",
    color: "#5f8b63",
  },
  {
    id: "rhubarb",
    name: "Rhubarb",
    short: "Rh",
    group: "perennial",
    family: "Polygonaceae",
    spacing: 0.9,
    height: 0.8,
    sun: "part",
    months: [5, 6, 7, 8, 9],
    peakMonths: [10, 11, 12, 1, 2, 3],
    days: 365,
    perennial: true,
    layout: "individual",
    color: "#a54f57",
  },
  {
    id: "globe-artichoke",
    name: "Globe artichoke",
    short: "Ga",
    group: "perennial",
    family: "Asteraceae",
    spacing: 1.2,
    height: 1.6,
    sun: "full",
    months: [8, 9, 10, 11],
    peakMonths: [12, 1, 2, 3, 4],
    days: 180,
    perennial: true,
    layout: "individual",
    color: "#78958a",
  },
  {
    id: "strawberry",
    name: "Strawberry",
    short: "St",
    group: "perennial",
    family: "Rosaceae",
    spacing: 0.3,
    height: 0.25,
    sun: "full",
    months: [3, 4, 5, 6, 7, 8, 9],
    peakMonths: [10, 11, 12, 1],
    days: 120,
    perennial: true,
    layout: "block",
    frequent: true,
    color: "#bd5860",
  },
  {
    id: "rosemary",
    name: "Rosemary",
    short: "Ro",
    group: "perennial",
    family: "Lamiaceae",
    spacing: 0.8,
    height: 1.2,
    sun: "full",
    months: [3, 4, 5, 8, 9, 10, 11],
    peakMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    days: 180,
    perennial: true,
    layout: "individual",
    color: "#557a6c",
  },
  {
    id: "thyme",
    name: "Thyme",
    short: "Th",
    group: "perennial",
    family: "Lamiaceae",
    spacing: 0.3,
    height: 0.25,
    sun: "full",
    months: [3, 4, 5, 8, 9, 10, 11],
    peakMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    days: 120,
    perennial: true,
    layout: "block",
    frequent: true,
    color: "#788a69",
  },
  {
    id: "chives",
    name: "Chives",
    short: "Ch",
    group: "perennial",
    family: "Amaryllidaceae",
    spacing: 0.25,
    height: 0.35,
    sun: "part",
    months: [3, 4, 5, 8, 9, 10],
    peakMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5],
    days: 90,
    perennial: true,
    layout: "block",
    frequent: true,
    color: "#748c64",
  },
];

export const CROP_BY_ID = Object.fromEntries(
  CROPS.map((crop) => [crop.id, crop]),
) as Record<string, Crop>;

export function peakMonthForCrop(crop: Crop) {
  if (crop.peakMonths?.length) {
    return crop.peakMonths[Math.floor(crop.peakMonths.length / 2)];
  }
  const growthMonths = Math.max(1, Math.round(crop.days / 30));
  return ((crop.months[0] - 1 + growthMonths) % 12) + 1;
}

export function pointInPolygon(
  point: [number, number],
  polygon: [number, number][],
) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > point[1] !== yj > point[1] &&
      point[0] <
        ((xj - xi) * (point[1] - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distanceToSegment(
  point: [number, number],
  a: [number, number],
  b: [number, number],
) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSquared = dx * dx + dy * dy;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) /
        (lengthSquared || 1),
    ),
  );
  return Math.hypot(
    point[0] - (a[0] + t * dx),
    point[1] - (a[1] + t * dy),
  );
}

function boundaryDistance(point: [number, number]) {
  return Math.min(
    ...PLOT_3P.map((start, index) =>
      distanceToSegment(
        point,
        start,
        PLOT_3P[(index + 1) % PLOT_3P.length],
      ),
    ),
  );
}

function accessDistance(point: [number, number], accessPath: boolean) {
  const eastEdge = distanceToSegment(point, PLOT_3P[1], PLOT_3P[2]);
  if (!accessPath) return eastEdge;
  return Math.min(
    eastEdge,
    ...ACCESS_PADS.map((pad) => Math.hypot(point[0] - pad[0], point[1] - pad[1])),
  );
}

function isOnAccessPad(point: [number, number], accessPath: boolean) {
  return (
    accessPath &&
    ACCESS_PADS.some(
      (pad) => Math.hypot(point[0] - pad[0], point[1] - pad[1]) < 0.28,
    )
  );
}

function fenceCandidates(crop: Crop, quantity: number) {
  const start = PLOT_3P[0];
  const end = PLOT_3P[2];
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const usable = Math.max(1, Math.min(quantity, Math.floor((length - 0.7) / crop.spacing)));
  const normal: [number, number] = [
    (end[1] - start[1]) / length,
    -(end[0] - start[0]) / length,
  ];
  return Array.from({ length: usable }, (_, index) => {
    const t = (index + 1) / (usable + 1);
    return {
      x: start[0] + (end[0] - start[0]) * t + normal[0] * 0.2,
      y: start[1] + (end[1] - start[1]) * t + normal[1] * 0.2,
    };
  });
}

export function generateLayout(
  requests: PlantingRequest[],
  settings: PlannerSettings,
  sunHoursAt: (x: number, y: number, crop: Crop) => number,
  shadeCostAt: (
    crop: Crop,
    x: number,
    y: number,
    placed: PlantingPlacement[],
  ) => number = () => 0,
  fixedPlacements: PlantingPlacement[] = [],
): LayoutResult {
  const placements: PlantingPlacement[] = fixedPlacements.map((placement) => ({
    ...placement,
    locked: placement.locked ?? true,
    status: placement.status ?? "planned",
  }));
  const unplaced: Record<string, number> = {};
  const densityFactor = settings.density === "intensive" ? 0.8 : 1;
  const sorted = [...requests].sort((a, b) => {
    const cropA = CROP_BY_ID[a.cropId];
    const cropB = CROP_BY_ID[b.cropId];
    return (
      Number(b.priority === "high") - Number(a.priority === "high") ||
      Number(Boolean(cropB.support)) - Number(Boolean(cropA.support)) ||
      cropB.spacing - cropA.spacing ||
      cropB.height - cropA.height
    );
  });

  const grid: { x: number; y: number }[] = [];
  for (let y = 0.12; y <= 4.45; y += 0.14) {
    for (let x = 0.12; x <= 4.82; x += 0.14) {
      const point: [number, number] = [
        Math.round(x * 100) / 100,
        Math.round(y * 100) / 100,
      ];
      if (!pointInPolygon(point, PLOT_3P)) continue;
      if (isOnAccessPad(point, settings.accessPath)) continue;
      if (accessDistance(point, settings.accessPath) > 1.15) continue;
      grid.push({ x: point[0], y: point[1] });
    }
  }

  for (const request of sorted) {
    const crop = CROP_BY_ID[request.cropId];
    if (!crop) continue;
    const committedCount = placements.filter(
      (placement) => placement.requestId === request.id,
    ).length;
    let remaining = Math.max(0, request.quantity - committedCount);
    const preferredFence =
      crop.support && settings.useFence
        ? fenceCandidates(crop, remaining).map((candidate) => ({
            ...candidate,
            fence: true,
          }))
        : [];
    const candidates: Array<{ x: number; y: number; fence?: boolean }> = [
      ...preferredFence,
      ...grid
        .filter(
          (candidate) =>
            boundaryDistance([candidate.x, candidate.y]) >=
            Math.max(0.08, (crop.spacing * densityFactor) / 2),
        ),
    ];
    const used = new Set<string>();

    while (remaining > 0) {
      const viable = candidates
        .filter((candidate) => {
          const key = `${candidate.x}:${candidate.y}`;
          if (used.has(key)) return false;
          if (!pointInPolygon([candidate.x, candidate.y], PLOT_3P)) return false;
          return !placements.some((placed) => {
            const other = CROP_BY_ID[placed.cropId];
            if (!other) return false;
            const normalDistance =
              ((crop.spacing + other.spacing) / 2) * densityFactor;
            const canInterplant =
              settings.interplant &&
              crop.quick !== other.quick &&
              (crop.quick || other.quick);
            const required = canInterplant
              ? Math.max(0.12, normalDistance * 0.58)
              : normalDistance;
            return (
              Math.hypot(candidate.x - placed.x, candidate.y - placed.y) <
              required
            );
          });
        })
        .map((candidate) => {
          const sunHours = sunHoursAt(candidate.x, candidate.y, crop);
          const target = crop.sun === "full" ? 7 : 4.5;
          const sunlightFit =
            Math.min(1, sunHours / target) -
            Math.max(0, target - sunHours) * 0.08;
          const shadeCost = shadeCostAt(
            crop,
            candidate.x,
            candidate.y,
            placements,
          );
          const sameCrop = placements.filter(
            (placement) => placement.cropId === crop.id,
          );
          const layout =
            crop.layout ??
            (crop.perennial || crop.spacing > 0.5
              ? "individual"
              : crop.spacing <= 0.2
                ? "row"
                : "block");
          const nearestSame = sameCrop.length
            ? Math.min(
                ...sameCrop.map((placement) =>
                  Math.hypot(
                    candidate.x - placement.x,
                    candidate.y - placement.y,
                  ),
                ),
              )
            : 1.5;
          const alignedWithSame = sameCrop.some(
            (placement) =>
              Math.abs(candidate.x - placement.x) < 0.08 ||
              Math.abs(candidate.y - placement.y) < 0.08,
          );
          const orderFit =
            layout === "row"
              ? (alignedWithSame ? 2.5 : 0) - nearestSame * 0.35
              : layout === "block"
                ? Math.max(0, 1.8 - nearestSame)
                : 0.2;
          const accessFit =
            (crop.frequent ? 1.4 : 0.55) *
            (1.15 -
              accessDistance(
                [candidate.x, candidate.y],
                settings.accessPath,
              ));
          const aestheticFit =
            orderFit +
            accessFit +
            (candidate.fence && crop.support ? 2 : 0) +
            (Math.sin(
              candidate.x * 12.9898 +
                candidate.y * 78.233 +
                settings.scenarioSeed * 37.719 +
                crop.id.length,
            ) +
              1) *
              0.4;
          return {
            ...candidate,
            sunHours,
            score:
              sunlightFit * 1_000_000 -
              Math.min(20, shadeCost) * 10_000 +
              orderFit * 100 +
              aestheticFit,
          };
        })
        .sort((a, b) => b.score - a.score);

      const candidate = viable[0];
      if (!candidate) break;
      used.add(`${candidate.x}:${candidate.y}`);
      const sunHours = candidate.sunHours;
      const host =
        settings.interplant && crop.quick
          ? placements.find((placed) => {
              const other = CROP_BY_ID[placed.cropId];
              return (
                !other.quick &&
                Math.hypot(candidate.x - placed.x, candidate.y - placed.y) <
                  (crop.spacing + other.spacing) * 0.72
              );
            })
          : undefined;
      const fencePlaced = Boolean(candidate.fence);

      placements.push({
        id: `${request.id}-${Date.now()}-${remaining}`,
        requestId: request.id,
        cropId: crop.id,
        x: Math.round(candidate.x * 100) / 100,
        y: Math.round(candidate.y * 100) / 100,
        sunHours,
        status: "planned",
        locked: false,
        interplantedWith: host?.id,
        reason: fencePlaced
          ? "Uses the 6.6 m climbing fence"
          : host
            ? `Quick crop tucked between ${CROP_BY_ID[host.cropId].name.toLowerCase()} plants`
            : crop.sun === "full"
              ? `${sunHours.toFixed(1)} modelled sun hours; kept reachable`
              : `Uses a lower-sun, reachable pocket`,
      });
      remaining -= 1;
    }
    if (remaining > 0) unplaced[request.id] = remaining;
  }

  const notes = [
    settings.accessPath
      ? "A stepping route from the east path keeps the deep triangular bed reachable."
      : "No internal stepping route is reserved; deep areas may be hard to reach.",
    settings.interplant
      ? "Fast crops may share the early-season footprint of slower crops."
      : "Every crop keeps its full independent mature spacing.",
    settings.useFence
      ? "Climbers are placed on the diagonal fence before open-bed crops."
      : "The fence is left unused by the generator.",
    "Optimisation order: peak-season sunlight, shade protection, crop rows or blocks, then aesthetics and access.",
    fixedPlacements.length
      ? `${fixedPlacements.length} planted or locked positions were preserved while proposals were remodelled.`
      : "All placements are proposals until marked planted or locked.",
  ];

  return { placements, unplaced, notes };
}
