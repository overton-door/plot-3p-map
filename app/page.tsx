"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACCESSIBLE_BEDS,
  ACCESS_PADS,
  CROP_BY_ID,
  CROPS,
  EAST_PATH,
  PLOT_3A_BEYOND_PATH,
  PLOT_3O,
  PLOT_3P,
  generateLayout,
  peakMonthForCrop,
  type PlannerSettings,
  type PlantingPlacement,
  type PlantingRequest,
} from "./planner";

type ObjectKind = "plant" | "tree" | "structure";

type PlotObject = {
  id: string;
  name: string;
  kind: ObjectKind;
  x: number;
  y: number;
  height: number;
  canopy: number;
  color: string;
  context?: boolean;
};

type GardenZone = {
  id: string;
  name: string;
  purpose: string;
  suitability: string;
  color: string;
  points: [number, number][];
  locked: boolean;
};

type PlanData = {
  objects: PlotObject[];
  latitude: number;
  longitude: number;
  sourceNote: string;
  plantingRequests: PlantingRequest[];
  placements: PlantingPlacement[];
  zones: GardenZone[];
  plannerSettings: PlannerSettings;
  layoutNotes: string[];
};

type SolarPosition = {
  elevation: number;
  azimuth: number;
};

const CONTEXT_TREES: PlotObject[] = [
  {
    id: "tree-nw",
    name: "North-west tree",
    kind: "tree",
    x: -1.45,
    y: 6.6,
    height: 8,
    canopy: 3.4,
    color: "#48654b",
    context: true,
  },
  {
    id: "tree-n1",
    name: "Northern tree 1",
    kind: "tree",
    x: 1.55,
    y: 8.45,
    height: 10,
    canopy: 4.2,
    color: "#3e6046",
    context: true,
  },
  {
    id: "tree-n2",
    name: "Northern tree 2",
    kind: "tree",
    x: 5.15,
    y: 8.3,
    height: 11,
    canopy: 4.6,
    color: "#3b5940",
    context: true,
  },
];

const SUGGESTED_ZONES: GardenZone[] = [
  {
    id: "fence-rail",
    name: "Climbing fence rail",
    purpose: "Trellised fruiting crops",
    suitability: "Uses the 6.6 m fence without taking open-bed space.",
    color: "#b87545",
    points: [[0.08, 0.07], [0.38, 0.07], [4.76, 4.16], [4.64, 4.43]],
    locked: false,
  },
  {
    id: "sun-core",
    name: "Deep sun bed",
    purpose: "Tomatoes, capsicums, squash",
    suitability: "Open lower bed with the clearest peak-season sun.",
    color: "#d89544",
    points: [[0.42, 0.16], [3.88, 0.16], [4.0, 1.0], [1.12, 1.0]],
    locked: false,
  },
  {
    id: "mid-bed",
    name: "Reachable grid bed",
    purpose: "Rows, blocks, quick crops",
    suitability: "Central, accessible area suited to intensive planting grids.",
    color: "#79a16a",
    points: [[1.38, 1.22], [4.04, 1.22], [4.22, 2.28], [2.46, 2.28]],
    locked: false,
  },
  {
    id: "perennial-edge",
    name: "Perennial edge",
    purpose: "Asparagus, herbs, rhubarb",
    suitability: "Keeps long-lived plants legible and reachable from the path.",
    color: "#8170a6",
    points: [[4.05, 0.28], [4.27, 0.28], [4.62, 2.98], [4.42, 2.98]],
    locked: false,
  },
];

const DEFAULT_PLAN: PlanData = {
  objects: CONTEXT_TREES,
  latitude: -37.766,
  longitude: 144.983,
  sourceNote:
    "Triangular Plot 3P Half re-measured from Community Garden Layout 6.2026. Its 6.6 m diagonal edge is the perimeter fence, its east side abuts an approximately 0.8 m access path, and tree heights remain editable assumptions.",
  plantingRequests: [],
  placements: [],
  zones: [],
  plannerSettings: {
    month: new Date().getMonth() + 1,
    density: "intensive",
    interplant: true,
    accessPath: true,
    useFence: true,
    showShade: true,
    showGrid: true,
    snapToGrid: false,
    alignmentAssist: true,
    gridSize: 0.25,
    filterByMonth: false,
    scenarioSeed: 0,
  },
  layoutNotes: [],
};

const STORAGE_KEY = "plot-3p-plan-v2";

const KIND_DEFAULTS: Record<
  ObjectKind,
  { name: string; height: number; canopy: number; color: string }
> = {
  plant: { name: "New planting", height: 0.5, canopy: 0.45, color: "#89a642" },
  tree: { name: "New tree", height: 3, canopy: 2, color: "#4b7a4e" },
  structure: {
    name: "New structure",
    height: 1.8,
    canopy: 0.8,
    color: "#a36d42",
  },
};

const RAD = Math.PI / 180;
const J1970 = 2440588;
const J2000 = 2451545;

function toJulian(date: Date) {
  return date.valueOf() / 86400000 - 0.5 + J1970;
}

function rightAscension(l: number, b: number) {
  const e = RAD * 23.4397;
  return Math.atan2(
    Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e),
    Math.cos(l),
  );
}

function declination(l: number, b: number) {
  const e = RAD * 23.4397;
  return Math.asin(
    Math.sin(b) * Math.cos(e) +
      Math.cos(b) * Math.sin(e) * Math.sin(l),
  );
}

function solarPosition(
  date: Date,
  latitude: number,
  longitude: number,
): SolarPosition {
  const d = toJulian(date) - J2000;
  const lw = -longitude * RAD;
  const phi = latitude * RAD;
  const meanAnomaly = RAD * (357.5291 + 0.98560028 * d);
  const equation =
    RAD *
    (1.9148 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly) +
      0.0003 * Math.sin(3 * meanAnomaly));
  const perihelion = RAD * 102.9372;
  const longitudeEcliptic = meanAnomaly + equation + perihelion + Math.PI;
  const dec = declination(longitudeEcliptic, 0);
  const ra = rightAscension(longitudeEcliptic, 0);
  const sidereal = RAD * (280.16 + 360.9856235 * d) - lw;
  const hourAngle = sidereal - ra;
  const altitude = Math.asin(
    Math.sin(phi) * Math.sin(dec) +
      Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle),
  );
  const azFromSouth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(phi) -
      Math.tan(dec) * Math.cos(phi),
  );

  return {
    elevation: altitude / RAD,
    azimuth: ((azFromSouth / RAD + 180) % 360 + 360) % 360,
  };
}

function zonedDate(dateString: string, minutes: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  let guess = Date.UTC(year, month - 1, day, hours, mins);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  for (let i = 0; i < 2; i += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(guess))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const shown = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    );
    const wanted = Date.UTC(year, month - 1, day, hours, mins);
    guess += wanted - shown;
  }
  return new Date(guess);
}

function formatTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour >= 12 ? "pm" : "am";
  const shownHour = hour % 12 || 12;
  return `${shownHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function todayMelbourne() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function daylightSummary(
  dateString: string,
  latitude: number,
  longitude: number,
) {
  let sunrise = 0;
  let sunset = 0;
  let maxElevation = -90;
  let solarNoon = 720;
  let wasUp = false;
  for (let minute = 0; minute <= 1440; minute += 5) {
    const altitude = solarPosition(
      zonedDate(dateString, minute),
      latitude,
      longitude,
    ).elevation;
    const isUp = altitude > -0.833;
    if (!wasUp && isUp) sunrise = minute;
    if (wasUp && !isUp) sunset = minute;
    if (altitude > maxElevation) {
      maxElevation = altitude;
      solarNoon = minute;
    }
    wasUp = isUp;
  }
  return { sunrise, sunset, maxElevation, solarNoon };
}

function pointInPolygon(point: [number, number], polygon: [number, number][]) {
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

function shadowVector(item: PlotObject, sun: SolarPosition) {
  if (sun.elevation <= 0.3) return { dx: 0, dy: 0, length: 0 };
  const length = Math.min(45, item.height / Math.tan(sun.elevation * RAD));
  const bearing = (sun.azimuth + 180) * RAD;
  return {
    dx: Math.sin(bearing) * length,
    dy: Math.cos(bearing) * length,
    length,
  };
}

function shadowTouchesPolygon(
  item: PlotObject,
  sun: SolarPosition,
  polygon: [number, number][],
) {
  const shadow = shadowVector(item, sun);
  if (!shadow.length) return false;
  const steps = Math.max(8, Math.ceil(shadow.length / 0.2));
  for (let i = 0; i <= steps; i += 1) {
    const ratio = i / steps;
    const point: [number, number] = [
      item.x + shadow.dx * ratio,
      item.y + shadow.dy * ratio,
    ];
    if (pointInPolygon(point, polygon)) return true;
  }
  return false;
}

function pointToSegmentDistance(
  point: [number, number],
  start: [number, number],
  end: [number, number],
) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  const ratio = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) /
        (lengthSquared || 1),
    ),
  );
  return Math.hypot(
    point[0] - (start[0] + ratio * dx),
    point[1] - (start[1] + ratio * dy),
  );
}

function pointIsShaded(
  x: number,
  y: number,
  sun: SolarPosition,
  objects: PlotObject[],
) {
  if (sun.elevation <= 0.3) return true;
  return objects.some((item) => {
    if (item.height <= 0) return false;
    const shadow = shadowVector(item, sun);
    return (
      pointToSegmentDistance(
        [x, y],
        [item.x, item.y],
        [item.x + shadow.dx, item.y + shadow.dy],
      ) <=
      item.canopy / 2
    );
  });
}

function monthDistance(a: number, b: number) {
  const difference = Math.abs(a - b);
  return Math.min(difference, 12 - difference);
}

function seasonalHeightFactor(crop: (typeof CROPS)[number], month: number) {
  const peakMonths = crop.peakMonths?.length
    ? crop.peakMonths
    : [peakMonthForCrop(crop)];
  const distance = Math.min(
    ...peakMonths.map((peakMonth) => monthDistance(month, peakMonth)),
  );
  return Math.max(crop.perennial ? 0.12 : 0.05, 1 - distance * 0.28);
}

function plantingObjects(
  placements: PlantingPlacement[],
  month: number,
): PlotObject[] {
  return placements.flatMap((placement) => {
    const crop = CROP_BY_ID[placement.cropId];
    if (!crop) return [];
    return [
      {
        id: placement.id,
        kind: "plant" as const,
        name: crop.name,
        x: placement.x,
        y: placement.y,
        height: crop.height * seasonalHeightFactor(crop, month),
        canopy: crop.spacing,
        color: crop.color,
      },
    ];
  });
}

function shadeCoveragePercent(
  objects: PlotObject[],
  sun: SolarPosition,
  polygon: [number, number][],
) {
  if (sun.elevation <= 0.3 || objects.length === 0) return 0;
  const xs = polygon.map(([x]) => x);
  const ys = polygon.map(([, y]) => y);
  let shaded = 0;
  let samples = 0;
  for (let y = Math.min(...ys); y <= Math.max(...ys); y += 0.22) {
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += 0.22) {
      if (!pointInPolygon([x, y], polygon)) continue;
      samples += 1;
      if (pointIsShaded(x, y, sun, objects)) shaded += 1;
    }
  }
  return samples ? (shaded / samples) * 100 : 0;
}

function estimateSunHours(
  dateString: string,
  x: number,
  y: number,
  plan: PlanData,
) {
  let hours = 0;
  for (let minute = 330; minute <= 1260; minute += 30) {
    const sample = solarPosition(
      zonedDate(dateString, minute),
      plan.latitude,
      plan.longitude,
    );
    if (
      sample.elevation > 0.3 &&
      !pointIsShaded(
        x,
        y,
        sample,
        plan.objects.filter((item) => item.context),
      )
    ) {
      hours += 0.5;
    }
  }
  return hours;
}

function normalisePlan(value: Partial<PlanData> | undefined): PlanData {
  if (!value) return DEFAULT_PLAN;
  return {
    ...DEFAULT_PLAN,
    ...value,
    objects: value.objects?.length ? value.objects : DEFAULT_PLAN.objects,
    plantingRequests: value.plantingRequests ?? [],
    zones: value.zones ?? [],
    placements: (value.placements ?? []).map((placement) => ({
      ...placement,
      status: placement.status ?? "planned",
      locked: placement.locked ?? false,
    })),
    plannerSettings: {
      ...DEFAULT_PLAN.plannerSettings,
      ...(value.plannerSettings ?? {}),
    },
    layoutNotes: value.layoutNotes ?? [],
  };
}

function localPoint(
  event: React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
  transform: { left: number; bottom: number; scale: number },
) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) * canvas.width) / rect.width;
  const y = ((event.clientY - rect.top) * canvas.height) / rect.height;
  return {
    x: (x - transform.left) / transform.scale - 3.5,
    y: (canvas.height - transform.bottom - y) / transform.scale - 3.5,
  };
}

function polygonPath(
  context: CanvasRenderingContext2D,
  points: [number, number][],
  world: (x: number, y: number) => [number, number],
) {
  points.forEach(([x, y], index) => {
    const [screenX, screenY] = world(x, y);
    if (index === 0) context.moveTo(screenX, screenY);
    else context.lineTo(screenX, screenY);
  });
  context.closePath();
}

function PlotCanvas({
  plan,
  sun,
  selectedId,
  onSelect,
  onMove,
  zoom,
}: {
  plan: PlanData;
  sun: SolarPosition;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  zoom: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<string | null>(null);
  const transformRef = useRef({ left: 0, bottom: 0, scale: 1 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(720, rect.width * ratio);
    canvas.height = Math.max(620, rect.height * ratio);

    const bounds = 14;
    const padding = 48 * ratio;
    const scale =
      (Math.min(canvas.width, canvas.height) - padding * 2) / bounds * zoom;
    const left = (canvas.width - bounds * scale) / 2;
    const bottom = (canvas.height - bounds * scale) / 2;
    transformRef.current = { left, bottom, scale };
    const world = (x: number, y: number): [number, number] => [
      left + (x + 3.5) * scale,
      canvas.height - bottom - (y + 3.5) * scale,
    ];

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f4f0e5";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.save();
    context.strokeStyle = "rgba(47, 67, 50, .09)";
    context.lineWidth = 1;
    for (let metre = -3; metre <= 10; metre += 1) {
      const [verticalX] = world(metre, 0);
      const [, horizontalY] = world(0, metre);
      context.beginPath();
      context.moveTo(verticalX, bottom);
      context.lineTo(verticalX, canvas.height - bottom);
      context.stroke();
      context.beginPath();
      context.moveTo(left, horizontalY);
      context.lineTo(canvas.width - left, horizontalY);
      context.stroke();
    }
    context.restore();

    const drawPolygon = (
      points: [number, number][],
      fill: string,
      stroke: string,
      lineWidth = 1.5,
    ) => {
      context.beginPath();
      polygonPath(context, points, world);
      context.fillStyle = fill;
      context.fill();
      context.strokeStyle = stroke;
      context.lineWidth = lineWidth * ratio;
      context.stroke();
    };

    drawPolygon(
      [
        [-3.5, 5.75],
        [10.5, 5.75],
        [10.5, 7.15],
        [-3.5, 7.15],
      ],
      "#ddd9ce",
      "#cbc4b6",
    );
    const [laneX, laneY] = world(2.7, 6.42);
    context.fillStyle = "#686557";
    context.font = `${12 * ratio}px ui-sans-serif`;
    context.textAlign = "center";
    context.fillText("VILLAGE LANEWAY", laneX, laneY);

    drawPolygon(PLOT_3O, "#e1d6b6", "#9d9278", 1.4);
    drawPolygon(PLOT_3A_BEYOND_PATH, "#e9e1ca", "#aaa086", 1.2);
    drawPolygon(EAST_PATH, "#d8d5cc", "#aaa79f", 1.2);
    drawPolygon(ACCESSIBLE_BEDS, "#a7cd83", "#66815b", 1.4);
    drawPolygon(PLOT_3P, "#8dcc78", "#325c40", 2.4);

    const labels: Array<[string, number, number, string]> = [
      ["PLOT 3P · HALF", 3.25, 1.45, "#173c28"],
      ["3O · HALF", 2.15, -1.65, "#756b54"],
      ["3A · HALF", 6.45, 1.9, "#756b54"],
      ["ACCESSIBLE BEDS", 6.8, 4.95, "#43623e"],
      ["COMMUNITY HUB", -2.15, 2.75, "#7b776c"],
    ];
    context.font = `600 ${10.5 * ratio}px ui-sans-serif`;
    context.textAlign = "center";
    labels.forEach(([label, x, y, color]) => {
      const [screenX, screenY] = world(x, y);
      context.fillStyle = color;
      context.fillText(label, screenX, screenY);
    });
    const [pathLabelX, pathLabelY] = world(4.93, 2.25);
    context.save();
    context.translate(pathLabelX, pathLabelY);
    context.rotate(-Math.atan2(4.55, 0.6));
    context.fillStyle = "#77766f";
    context.font = `700 ${8.5 * ratio}px ui-sans-serif`;
    context.textAlign = "center";
    context.fillText("ACCESS PATH · ~0.8 m", 0, 0);
    context.restore();

    const [fenceStartX, fenceStartY] = world(0, 0);
    const [fenceEndX, fenceEndY] = world(4.85, 4.55);
    context.save();
    context.strokeStyle = "#18281d";
    context.lineWidth = 5.2 * ratio;
    context.lineCap = "round";
    context.setLineDash([2 * ratio, 7 * ratio]);
    context.beginPath();
    context.moveTo(fenceStartX, fenceStartY);
    context.lineTo(fenceEndX, fenceEndY);
    context.stroke();
    context.setLineDash([]);
    const fenceMidX = (fenceStartX + fenceEndX) / 2;
    const fenceMidY = (fenceStartY + fenceEndY) / 2;
    context.translate(fenceMidX, fenceMidY);
    context.rotate(Math.atan2(fenceEndY - fenceStartY, fenceEndX - fenceStartX));
    context.fillStyle = "rgba(255, 253, 247, .9)";
    context.fillRect(-87 * ratio, -18 * ratio, 174 * ratio, 18 * ratio);
    context.fillStyle = "#21362a";
    context.font = `700 ${8.8 * ratio}px ui-sans-serif`;
    context.textAlign = "center";
    context.fillText(
      "FENCE · 6.6 m · CLIMBING SUPPORT",
      0,
      -6 * ratio,
    );
    context.restore();

    if (sun.elevation > 0.3) {
      plan.objects.forEach((item) => {
        if (item.height <= 0) return;
        const shadow = shadowVector(item, sun);
        const [startX, startY] = world(item.x, item.y);
        const [endX, endY] = world(item.x + shadow.dx, item.y + shadow.dy);
        const gradient = context.createLinearGradient(
          startX,
          startY,
          endX,
          endY,
        );
        gradient.addColorStop(0, "rgba(39, 50, 43, .24)");
        gradient.addColorStop(1, "rgba(39, 50, 43, .10)");
        context.save();
        context.strokeStyle = gradient;
        context.lineWidth = Math.max(5, item.canopy * scale * 0.72);
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.stroke();
        context.fillStyle = "rgba(39, 50, 43, .11)";
        context.beginPath();
        context.arc(endX, endY, (item.canopy * scale) / 2, 0, Math.PI * 2);
        context.fill();
        context.restore();
      });
    } else {
      context.fillStyle = "rgba(35, 45, 58, .24)";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    plan.objects.forEach((item) => {
      const [x, y] = world(item.x, item.y);
      const radius = Math.max(6 * ratio, (item.canopy * scale) / 2);
      context.save();
      if (item.kind === "tree") {
        context.fillStyle = `${item.color}35`;
        context.strokeStyle = item.color;
        context.lineWidth = 1.5 * ratio;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.fillStyle = "#55422f";
        context.beginPath();
        context.arc(x, y, 3.2 * ratio, 0, Math.PI * 2);
        context.fill();
      } else if (item.kind === "structure") {
        context.fillStyle = item.color;
        context.strokeStyle = "#69492f";
        context.lineWidth = 1.5 * ratio;
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        context.strokeRect(x - radius, y - radius, radius * 2, radius * 2);
      } else {
        context.fillStyle = item.color;
        context.strokeStyle = "#4e672d";
        context.lineWidth = 1.4 * ratio;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }
      if (item.id === selectedId) {
        context.strokeStyle = "#d85f38";
        context.lineWidth = 2.5 * ratio;
        context.setLineDash([5 * ratio, 4 * ratio]);
        context.beginPath();
        context.arc(x, y, radius + 6 * ratio, 0, Math.PI * 2);
        context.stroke();
      }
      context.fillStyle = "#24362a";
      context.font = `600 ${9.5 * ratio}px ui-sans-serif`;
      context.textAlign = "center";
      context.fillText(
        item.name,
        x,
        y + radius + 13 * ratio,
        Math.max(75 * ratio, radius * 2.5),
      );
      context.restore();
    });

    const scaleX = left + 18 * ratio;
    const scaleY = canvas.height - bottom - 18 * ratio;
    context.strokeStyle = "#2d3c31";
    context.fillStyle = "#2d3c31";
    context.lineWidth = 2 * ratio;
    context.beginPath();
    context.moveTo(scaleX, scaleY);
    context.lineTo(scaleX + scale, scaleY);
    context.moveTo(scaleX, scaleY - 5 * ratio);
    context.lineTo(scaleX, scaleY + 5 * ratio);
    context.moveTo(scaleX + scale, scaleY - 5 * ratio);
    context.lineTo(scaleX + scale, scaleY + 5 * ratio);
    context.stroke();
    context.font = `${10 * ratio}px ui-monospace`;
    context.textAlign = "center";
    context.fillText("1 metre", scaleX + scale / 2, scaleY - 8 * ratio);

    const northX = canvas.width - left - 28 * ratio;
    const northY = bottom + 46 * ratio;
    context.fillStyle = "#20382a";
    context.font = `700 ${11 * ratio}px ui-sans-serif`;
    context.textAlign = "center";
    context.fillText("N", northX, northY - 20 * ratio);
    context.beginPath();
    context.moveTo(northX, northY - 14 * ratio);
    context.lineTo(northX - 7 * ratio, northY + 5 * ratio);
    context.lineTo(northX, northY + 1 * ratio);
    context.lineTo(northX + 7 * ratio, northY + 5 * ratio);
    context.closePath();
    context.fill();
  }, [plan, selectedId, sun, zoom]);

  useEffect(() => {
    draw();
    const observer = new ResizeObserver(draw);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [draw]);

  const hitTest = (point: { x: number; y: number }) => {
    return [...plan.objects]
      .reverse()
      .find(
        (item) =>
          Math.hypot(item.x - point.x, item.y - point.y) <=
          Math.max(0.35, item.canopy / 2),
      );
  };

  return (
    <canvas
      ref={canvasRef}
      className="plot-canvas"
      aria-label="Interactive scale map of plot 3P. Select and drag map objects to reposition them."
      tabIndex={0}
      onPointerDown={(event) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const point = localPoint(event, canvas, transformRef.current);
        const hit = hitTest(point);
        dragRef.current = hit?.id ?? null;
        onSelect(hit?.id ?? null);
        if (hit) canvas.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const canvas = canvasRef.current;
        if (!canvas || !dragRef.current) return;
        const point = localPoint(event, canvas, transformRef.current);
        onMove(
          dragRef.current,
          Math.round(point.x * 20) / 20,
          Math.round(point.y * 20) / 20,
        );
      }}
      onPointerUp={(event) => {
        canvasRef.current?.releasePointerCapture(event.pointerId);
        dragRef.current = null;
      }}
      onKeyDown={(event) => {
        if (!selectedId) return;
        const item = plan.objects.find((object) => object.id === selectedId);
        if (!item) return;
        const step = event.shiftKey ? 0.5 : 0.1;
        const changes: Record<string, [number, number]> = {
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
          ArrowUp: [0, step],
          ArrowDown: [0, -step],
        };
        const change = changes[event.key];
        if (change) {
          event.preventDefault();
          onMove(item.id, item.x + change[0], item.y + change[1]);
        }
      }}
    />
  );
}

function PlantingCanvas({
  plan,
  sun,
  shadeMonth,
  showShade,
  detailZoom,
  selectedIds,
  onSelectionChange,
  onMoveMany,
  onGestureStart,
}: {
  plan: PlanData;
  sun: SolarPosition;
  shadeMonth: number;
  showShade: boolean;
  detailZoom: number;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onMoveMany: (updates: { id: string; x: number; y: number }[]) => void;
  onGestureStart: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectionBox, setSelectionBox] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);
  const [alignmentGuide, setAlignmentGuide] = useState<{
    x?: number;
    y?: number;
  } | null>(null);
  const dragRef = useRef<
    | {
        kind: "plants";
        pointerStart: { x: number; y: number };
        positions: { id: string; x: number; y: number }[];
      }
    | {
        kind: "marquee";
        pointerStart: { x: number; y: number };
        additive: boolean;
      }
    | null
  >(null);
  const transformRef = useRef({
    left: 0,
    bottom: 0,
    scale: 1,
    minX: -0.45,
    minY: -1.25,
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(680, rect.width * ratio);
    canvas.height = Math.max(620, rect.height * ratio);
    const minX = 2.25 - 3.575 / detailZoom;
    const minY = 1.75 - 3.175 / detailZoom;
    const viewWidth = 7.15;
    const viewHeight = 6.35;
    const scale = Math.min(
      (canvas.width - 70 * ratio) / viewWidth,
      (canvas.height - 70 * ratio) / viewHeight,
    ) * detailZoom;
    const left = (canvas.width - viewWidth * scale) / 2;
    const bottom = (canvas.height - viewHeight * scale) / 2;
    transformRef.current = { left, bottom, scale, minX, minY };
    const world = (x: number, y: number): [number, number] => [
      left + (x - minX) * scale,
      canvas.height - bottom - (y - minY) * scale,
    ];

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f4f0e5";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const drawContextPolygon = (
      polygon: [number, number][],
      fill: string,
      stroke: string,
    ) => {
      context.beginPath();
      polygonPath(context, polygon, world);
      context.fillStyle = fill;
      context.fill();
      context.strokeStyle = stroke;
      context.lineWidth = 1.2 * ratio;
      context.stroke();
    };

    drawContextPolygon(PLOT_3O, "#e1d6b6", "#9d9278");
    drawContextPolygon(PLOT_3A_BEYOND_PATH, "#e9e1ca", "#aaa086");

    context.beginPath();
    polygonPath(context, EAST_PATH, world);
    context.fillStyle = "#d8d5cc";
    context.fill();
    context.strokeStyle = "#aaa79f";
    context.lineWidth = 1.2 * ratio;
    context.stroke();

    context.beginPath();
    polygonPath(context, PLOT_3P, world);
    context.fillStyle = "#e8e4d7";
    context.fill();
    context.strokeStyle = "#315c40";
    context.lineWidth = 2.6 * ratio;
    context.stroke();

    if (plan.plannerSettings.showGrid) {
      const fineStep = scale * 0.1 >= 14 ? 0.1 : 0.25;
      context.save();
      context.beginPath();
      polygonPath(context, PLOT_3P, world);
      context.clip();
      for (let metre = -1; metre <= 6; metre += fineStep) {
        const onQuarter = Math.abs((metre / 0.25) - Math.round(metre / 0.25)) < 0.01;
        const onMetre = Math.abs(metre - Math.round(metre)) < 0.01;
        context.strokeStyle = onMetre
          ? "rgba(47, 67, 50, .25)"
          : onQuarter
            ? "rgba(47, 67, 50, .14)"
            : "rgba(47, 67, 50, .07)";
        context.lineWidth = onMetre ? 1.15 * ratio : 0.65 * ratio;
        const [verticalX] = world(metre, 0);
        const [, horizontalY] = world(0, metre);
        context.beginPath();
        context.moveTo(verticalX, 0);
        context.lineTo(verticalX, canvas.height);
        context.stroke();
        context.beginPath();
        context.moveTo(0, horizontalY);
        context.lineTo(canvas.width, horizontalY);
        context.stroke();
      }
      if (alignmentGuide?.x !== undefined) {
        const [guideX] = world(alignmentGuide.x, 0);
        context.strokeStyle = "rgba(216, 95, 56, .8)";
        context.lineWidth = 1.4 * ratio;
        context.beginPath();
        context.moveTo(guideX, 0);
        context.lineTo(guideX, canvas.height);
        context.stroke();
      }
      if (alignmentGuide?.y !== undefined) {
        const [, guideY] = world(0, alignmentGuide.y);
        context.strokeStyle = "rgba(216, 95, 56, .8)";
        context.lineWidth = 1.4 * ratio;
        context.beginPath();
        context.moveTo(0, guideY);
        context.lineTo(canvas.width, guideY);
        context.stroke();
      }
      context.restore();
    }

    plan.zones.forEach((zone) => {
      context.save();
      context.beginPath();
      polygonPath(context, zone.points, world);
      context.fillStyle = `${zone.color}20`;
      context.fill();
      context.strokeStyle = `${zone.color}a8`;
      context.lineWidth = zone.locked ? 2 * ratio : 1.2 * ratio;
      context.setLineDash(zone.locked ? [] : [5 * ratio, 4 * ratio]);
      context.stroke();
      context.setLineDash([]);
      const centre = zone.points.reduce(
        (sum, [x, y]) => [sum[0] + x / zone.points.length, sum[1] + y / zone.points.length],
        [0, 0],
      );
      const [labelX, labelY] = world(centre[0], centre[1]);
      context.fillStyle = "#36423a";
      context.font = `700 ${Math.max(8, 9 * detailZoom) * ratio}px ui-sans-serif`;
      context.textAlign = "center";
      context.fillText(zone.name.toUpperCase(), labelX, labelY);
      context.restore();
    });

    if (showShade) {
      const renderShadow = (item: PlotObject, ownPlant: boolean) => {
        if (item.height <= 0 || sun.elevation <= 0.3) return;
        const shadow = shadowVector(item, sun);
        const [startX, startY] = world(item.x, item.y);
        const [endX, endY] = world(item.x + shadow.dx, item.y + shadow.dy);
        const gradient = context.createLinearGradient(
          startX,
          startY,
          endX,
          endY,
        );
        gradient.addColorStop(
          0,
          ownPlant ? "rgba(105, 69, 38, .38)" : "rgba(39, 50, 43, .24)",
        );
        gradient.addColorStop(
          1,
          ownPlant ? "rgba(105, 69, 38, .13)" : "rgba(39, 50, 43, .08)",
        );
        context.save();
        context.strokeStyle = gradient;
        context.lineWidth = Math.max(
          4 * ratio,
          item.canopy * scale * (ownPlant ? 0.82 : 0.7),
        );
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.stroke();
        context.restore();
      };
      plan.objects
        .filter((item) => item.context)
        .forEach((item) => renderShadow(item, false));
      plantingObjects(plan.placements, shadeMonth).forEach((item) =>
        renderShadow(item, true),
      );
      if (sun.elevation <= 0.3) {
        context.fillStyle = "rgba(35, 45, 58, .16)";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    if (plan.plannerSettings.accessPath) {
      ACCESS_PADS.forEach(([x, y], index) => {
        const [screenX, screenY] = world(x, y);
        context.beginPath();
        context.arc(screenX, screenY, 0.21 * scale, 0, Math.PI * 2);
        context.fillStyle = index % 2 ? "#cbc4b5" : "#d5cebe";
        context.fill();
        context.strokeStyle = "#989082";
        context.lineWidth = ratio;
        context.stroke();
      });
    }

    const [fenceStartX, fenceStartY] = world(...PLOT_3P[0]);
    const [fenceEndX, fenceEndY] = world(...PLOT_3P[2]);
    context.strokeStyle = "#18281d";
    context.lineWidth = 5 * ratio;
    context.lineCap = "round";
    context.setLineDash([2 * ratio, 7 * ratio]);
    context.beginPath();
    context.moveTo(fenceStartX, fenceStartY);
    context.lineTo(fenceEndX, fenceEndY);
    context.stroke();
    context.setLineDash([]);

    plan.placements.forEach((placement) => {
      const crop = CROP_BY_ID[placement.cropId];
      if (!crop) return;
      const [x, y] = world(placement.x, placement.y);
      const radius = Math.max(8 * ratio, (crop.spacing * scale) / 2);
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle =
        placement.status === "planted" ? crop.color : `${crop.color}b8`;
      context.fill();
      const isSelected = selectedIds.includes(placement.id);
      context.strokeStyle = isSelected ? "#d85f38" : `${crop.color}`;
      context.lineWidth = isSelected ? 3 * ratio : 1.4 * ratio;
      if (placement.interplantedWith) {
        context.setLineDash([3 * ratio, 3 * ratio]);
      }
      context.stroke();
      context.setLineDash([]);
      if (placement.status === "planted") {
        context.strokeStyle = "#263d2d";
        context.lineWidth = 1.8 * ratio;
        context.beginPath();
        context.arc(x, y, radius + 3 * ratio, 0, Math.PI * 2);
        context.stroke();
      }
      if (placement.locked) {
        context.fillStyle = "#24362a";
        context.fillRect(
          x + radius * 0.48,
          y - radius * 0.82,
          6 * ratio,
          6 * ratio,
        );
      }
      context.fillStyle = "#fffdf7";
      context.font = `700 ${Math.max(8, Math.min(11, radius / ratio)) * ratio}px ui-sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(crop.short, x, y);
    });

    if (selectionBox) {
      const [startX, startY] = world(selectionBox.start.x, selectionBox.start.y);
      const [endX, endY] = world(selectionBox.end.x, selectionBox.end.y);
      context.save();
      context.fillStyle = "rgba(216, 95, 56, .11)";
      context.strokeStyle = "#d85f38";
      context.lineWidth = 1.5 * ratio;
      context.setLineDash([5 * ratio, 4 * ratio]);
      context.fillRect(startX, startY, endX - startX, endY - startY);
      context.strokeRect(startX, startY, endX - startX, endY - startY);
      context.restore();
    }

    context.font = `700 ${9 * ratio}px ui-sans-serif`;
    context.textAlign = "center";
    context.fillStyle = "#756b54";
    const [plot3OX, plot3OY] = world(2.25, -0.72);
    context.fillText("PLOT 3O · HALF", plot3OX, plot3OY);
    const [plot3AX, plot3AY] = world(6.25, 1.55);
    context.fillText("PLOT 3A · HALF", plot3AX, plot3AY);

    const [northX, northY] = world(6.3, 4.65);
    context.fillStyle = "#20382a";
    context.font = `700 ${11 * ratio}px ui-sans-serif`;
    context.textAlign = "center";
    context.fillText("N", northX, northY - 18 * ratio);
    context.beginPath();
    context.moveTo(northX, northY - 12 * ratio);
    context.lineTo(northX - 7 * ratio, northY + 6 * ratio);
    context.lineTo(northX, northY + 2 * ratio);
    context.lineTo(northX + 7 * ratio, northY + 6 * ratio);
    context.closePath();
    context.fill();

    const [pathX, pathY] = world(5.15, 2.15);
    context.save();
    context.translate(pathX, pathY);
    context.rotate(-Math.atan2(4.55, 0.6));
    context.fillStyle = "#77766f";
    context.font = `700 ${9 * ratio}px ui-sans-serif`;
    context.fillText("EXISTING ACCESS PATH", 0, 0);
    context.restore();

    const [scaleX, scaleY] = world(-0.25, -0.98);
    context.strokeStyle = "#2d3c31";
    context.lineWidth = 2 * ratio;
    context.beginPath();
    context.moveTo(scaleX, scaleY);
    context.lineTo(scaleX + scale, scaleY);
    context.moveTo(scaleX, scaleY - 5 * ratio);
    context.lineTo(scaleX, scaleY + 5 * ratio);
    context.moveTo(scaleX + scale, scaleY - 5 * ratio);
    context.lineTo(scaleX + scale, scaleY + 5 * ratio);
    context.stroke();
    context.fillStyle = "#2d3c31";
    context.font = `${9 * ratio}px ui-monospace`;
    context.fillText("1 m", scaleX + scale / 2, scaleY - 10 * ratio);
  }, [alignmentGuide, detailZoom, plan, selectedIds, selectionBox, shadeMonth, showShade, sun]);

  useEffect(() => {
    draw();
    const observer = new ResizeObserver(draw);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [draw]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const screenX = ((event.clientX - rect.left) * canvas.width) / rect.width;
    const screenY = ((event.clientY - rect.top) * canvas.height) / rect.height;
    const transform = transformRef.current;
    return {
      x: (screenX - transform.left) / transform.scale + transform.minX,
      y:
        (canvas.height - transform.bottom - screenY) / transform.scale +
        transform.minY,
    };
  };

  const hitTest = (point: { x: number; y: number }) =>
    [...plan.placements].reverse().find((placement) => {
      const crop = CROP_BY_ID[placement.cropId];
      return (
        crop &&
        Math.hypot(placement.x - point.x, placement.y - point.y) <=
          Math.max(0.16, crop.spacing / 2)
      );
    });

  return (
    <canvas
      ref={canvasRef}
      className="planting-canvas"
      aria-label="Detailed planting and shade plan for Plot 3P with partial context from plots 3O and 3A. Mature plant circles are drawn to scale and can be dragged."
      onPointerDown={(event) => {
        const point = pointFromEvent(event);
        const hit = hitTest(point);
        if (hit) {
          if (event.shiftKey) {
            onSelectionChange(
              selectedIds.includes(hit.id)
                ? selectedIds.filter((id) => id !== hit.id)
                : [...selectedIds, hit.id],
            );
            return;
          }
          const nextSelection = selectedIds.includes(hit.id)
            ? selectedIds
            : [hit.id];
          onSelectionChange(nextSelection);
          const positions = plan.placements
            .filter(
              (placement) =>
                nextSelection.includes(placement.id) && !placement.locked,
            )
            .map(({ id, x, y }) => ({ id, x, y }));
          if (positions.length) {
            onGestureStart();
            dragRef.current = {
              kind: "plants",
              pointerStart: point,
              positions,
            };
            canvasRef.current?.setPointerCapture(event.pointerId);
          }
        } else {
          if (!event.shiftKey) onSelectionChange([]);
          dragRef.current = {
            kind: "marquee",
            pointerStart: point,
            additive: event.shiftKey,
          };
          setSelectionBox({ start: point, end: point });
          canvasRef.current?.setPointerCapture(event.pointerId);
        }
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag) return;
        const point = pointFromEvent(event);
        if (drag.kind === "marquee") {
          setSelectionBox({ start: drag.pointerStart, end: point });
          return;
        }
        const rawDx = point.x - drag.pointerStart.x;
        const rawDy = point.y - drag.pointerStart.y;
        const base = drag.positions[0];
        const gridSize = plan.plannerSettings.gridSize;
        const align = (value: number) => {
          const nearest = Math.round(value / gridSize) * gridSize;
          if (plan.plannerSettings.snapToGrid) {
            return { value: nearest, guide: nearest };
          }
          if (
            plan.plannerSettings.alignmentAssist &&
            Math.abs(nearest - value) <= Math.min(0.08, gridSize * 0.32)
          ) {
            return { value: nearest, guide: nearest };
          }
          return { value, guide: undefined };
        };
        const alignedX = align(base.x + rawDx);
        const alignedY = align(base.y + rawDy);
        const dx = alignedX.value - base.x;
        const dy = alignedY.value - base.y;
        setAlignmentGuide(
          alignedX.guide === undefined && alignedY.guide === undefined
            ? null
            : { x: alignedX.guide, y: alignedY.guide },
        );
        const updates = drag.positions.map((position) => ({
          id: position.id,
          x: Math.round((position.x + dx) * 100) / 100,
          y: Math.round((position.y + dy) * 100) / 100,
        }));
        if (
          updates.every((update) =>
            pointInPolygon([update.x, update.y], PLOT_3P),
          )
        ) {
          onMoveMany(updates);
        }
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        if (drag?.kind === "marquee" && selectionBox) {
          const minX = Math.min(selectionBox.start.x, selectionBox.end.x);
          const maxX = Math.max(selectionBox.start.x, selectionBox.end.x);
          const minY = Math.min(selectionBox.start.y, selectionBox.end.y);
          const maxY = Math.max(selectionBox.start.y, selectionBox.end.y);
          const inside = plan.placements
            .filter(
              (placement) =>
                placement.x >= minX &&
                placement.x <= maxX &&
                placement.y >= minY &&
                placement.y <= maxY,
            )
            .map((placement) => placement.id);
          onSelectionChange(
            drag.additive ? Array.from(new Set([...selectedIds, ...inside])) : inside,
          );
        }
        if (drag) {
          canvasRef.current?.releasePointerCapture(event.pointerId);
        }
        dragRef.current = null;
        setSelectionBox(null);
        setAlignmentGuide(null);
      }}
      onPointerCancel={(event) => {
        canvasRef.current?.releasePointerCapture(event.pointerId);
        dragRef.current = null;
        setSelectionBox(null);
        setAlignmentGuide(null);
      }}
    />
  );
}

export default function Home() {
  const [plan, setPlan] = useState<PlanData>(DEFAULT_PLAN);
  const [view, setView] = useState<"site" | "planting">("planting");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPlacementIds, setSelectedPlacementIds] = useState<string[]>([]);
  const [cropSearch, setCropSearch] = useState("");
  const [date, setDate] = useState(todayMelbourne);
  const [minutes, setMinutes] = useState(720);
  const [zoom, setZoom] = useState(1);
  const [plantingZoom, setPlantingZoom] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<
    "loading" | "saved" | "saving" | "offline" | "unsaved"
  >("loading");
  const [revision, setRevision] = useState(0);
  const importRef = useRef<HTMLInputElement>(null);
  const planRef = useRef<PlanData>(DEFAULT_PLAN);
  const undoStackRef = useRef<PlanData[]>([]);
  const [undoDepth, setUndoDepth] = useState(0);

  const selected = plan.objects.find((item) => item.id === selectedId) ?? null;
  const selectedPlacements = plan.placements.filter((item) =>
    selectedPlacementIds.includes(item.id),
  );
  const selectedPlacement =
    selectedPlacements.length === 1 ? selectedPlacements[0] : null;
  const dateObject = useMemo(() => zonedDate(date, minutes), [date, minutes]);
  const sun = useMemo(
    () => solarPosition(dateObject, plan.latitude, plan.longitude),
    [dateObject, plan.latitude, plan.longitude],
  );
  const daylight = useMemo(
    () => daylightSummary(date, plan.latitude, plan.longitude),
    [date, plan.latitude, plan.longitude],
  );
  const neighbourPlantShade = useMemo(() => {
    const shadeMonth = Number(date.slice(5, 7)) || 1;
    const objects = plantingObjects(plan.placements, shadeMonth);
    return {
      plot3O: shadeCoveragePercent(objects, sun, PLOT_3O),
      plot3A: shadeCoveragePercent(objects, sun, PLOT_3A_BEYOND_PATH),
    };
  }, [date, plan.placements, sun]);

  const pushUndo = useCallback(() => {
    undoStackRef.current = [
      ...undoStackRef.current.slice(-39),
      planRef.current,
    ];
    setUndoDepth(undoStackRef.current.length);
  }, []);

  const updatePlan = useCallback((
    next: PlanData | ((old: PlanData) => PlanData),
    recordHistory = true,
  ) => {
    const current = planRef.current;
    const resolved =
      typeof next === "function" ? next(current) : next;
    if (resolved === current) return;
    if (recordHistory) {
      undoStackRef.current = [
        ...undoStackRef.current.slice(-39),
        current,
      ];
      setUndoDepth(undoStackRef.current.length);
    }
    planRef.current = resolved;
    setPlan(resolved);
    setDirty(true);
    setSaveState("unsaved");
  }, []);

  const undo = useCallback(() => {
    const previous = undoStackRef.current.at(-1);
    if (!previous) return;
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    planRef.current = previous;
    setPlan(previous);
    setUndoDepth(undoStackRef.current.length);
    setSelectedPlacementIds((ids) =>
      ids.filter((id) => previous.placements.some((item) => item.id === id)),
    );
    setDirty(true);
    setSaveState("unsaved");
  }, []);

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(STORAGE_KEY) ??
        window.localStorage.getItem("plot-3p-plan-v1");
      if (stored) {
        const payload = JSON.parse(stored) as {
          data?: Partial<PlanData>;
          version?: number;
        };
        if (payload.data) {
          const restored = normalisePlan(payload.data);
          planRef.current = restored;
          setPlan(restored);
        }
        if (payload.version) setRevision(payload.version);
      }
      setSaveState("saved");
    } catch {
      setSaveState("offline");
    } finally {
      setLoaded(true);
    }
  }, []);

  const save = useCallback(() => {
    if (!loaded) return;
    setSaveState("saving");
    try {
      const nextRevision = revision + 1;
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ data: plan, version: nextRevision }),
      );
      setRevision(nextRevision);
      setDirty(false);
      setSaveState("saved");
    } catch {
      setSaveState("offline");
    }
  }, [loaded, plan, revision]);

  useEffect(() => {
    if (!dirty || !loaded) return;
    const timer = window.setTimeout(save, 900);
    return () => window.clearTimeout(timer);
  }, [dirty, loaded, plan, save]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setMinutes((current) => (current >= 1260 ? 300 : current + 15));
    }, 450);
    return () => window.clearInterval(timer);
  }, [playing]);

  const addObject = (kind: ObjectKind) => {
    const defaults = KIND_DEFAULTS[kind];
    const item: PlotObject = {
      id: crypto.randomUUID(),
      kind,
      name: defaults.name,
      x: 3.15,
      y: 1.45,
      height: defaults.height,
      canopy: defaults.canopy,
      color: defaults.color,
    };
    updatePlan((current) => ({
      ...current,
      objects: [...current.objects, item],
    }));
    setSelectedId(item.id);
  };

  const updateSelected = (changes: Partial<PlotObject>) => {
    if (!selectedId) return;
    updatePlan((current) => ({
      ...current,
      objects: current.objects.map((item) =>
        item.id === selectedId ? { ...item, ...changes } : item,
      ),
    }));
  };

  const updatePlannerSettings = (changes: Partial<PlannerSettings>) => {
    updatePlan((current) => ({
      ...current,
      plannerSettings: { ...current.plannerSettings, ...changes },
    }));
  };

  const addCropRequest = (cropId: string) => {
    const existing = plan.plantingRequests.find(
      (request) => request.cropId === cropId,
    );
    updatePlan((current) => ({
      ...current,
      plantingRequests: existing
        ? current.plantingRequests.map((request) =>
            request.id === existing.id
              ? { ...request, quantity: request.quantity + 1 }
              : request,
          )
        : [
            ...current.plantingRequests,
            {
              id: crypto.randomUUID(),
              cropId,
              quantity: 1,
              priority: "normal",
            },
          ],
      layoutNotes: [],
    }));
  };

  const generatePlantingPlan = (scope: "whole" | "selection" = "whole") => {
    const year = Number(date.slice(0, 4)) || new Date().getFullYear();
    const cache = new Map<string, number>();
    const scenarioSettings = {
      ...plan.plannerSettings,
      scenarioSeed: plan.plannerSettings.scenarioSeed + 1,
    };
    const selectedSet = new Set(selectedPlacementIds);
    const fixedPlacements = plan.placements.filter((placement) =>
      scope === "selection"
        ? !selectedSet.has(placement.id) ||
          placement.locked ||
          placement.status === "planted"
        : placement.locked || placement.status === "planted",
    );
    const result = generateLayout(
      plan.plantingRequests,
      scenarioSettings,
      (x, y, crop) => {
        const peakMonth = peakMonthForCrop(crop);
        const peakDate = `${year}-${String(peakMonth).padStart(2, "0")}-15`;
        const key = `${crop.id}:${x.toFixed(2)}:${y.toFixed(2)}`;
        if (!cache.has(key)) {
          cache.set(key, estimateSunHours(peakDate, x, y, plan));
        }
        return cache.get(key) ?? 0;
      },
      (crop, x, y, placed) => {
        const peakMonth = peakMonthForCrop(crop);
        const peakDate = `${year}-${String(peakMonth).padStart(2, "0")}-15`;
        const candidate: PlotObject = {
          id: "candidate",
          kind: "plant",
          name: crop.name,
          x,
          y,
          height: crop.height,
          canopy: crop.spacing,
          color: crop.color,
        };
        let cost = 0;
        [540, 720, 900].forEach((sampleMinutes) => {
          const peakSun = solarPosition(
            zonedDate(peakDate, sampleMinutes),
            plan.latitude,
            plan.longitude,
          );
          if (shadowTouchesPolygon(candidate, peakSun, PLOT_3O)) cost += 2.4;
          if (shadowTouchesPolygon(candidate, peakSun, PLOT_3A_BEYOND_PATH)) {
            cost += 2.4;
          }
          placed.forEach((placement) => {
            const other = CROP_BY_ID[placement.cropId];
            if (
              other &&
              pointIsShaded(
                placement.x,
                placement.y,
                peakSun,
                [candidate],
              )
            ) {
              cost += other.sun === "full" ? 0.75 : 0.35;
            }
          });
        });
        return cost / 3;
      },
      fixedPlacements,
    );
    const unplacedTotal = Object.values(result.unplaced).reduce(
      (sum, value) => sum + value,
      0,
    );
    updatePlan((current) => ({
      ...current,
      placements: result.placements,
      plannerSettings: scenarioSettings,
      layoutNotes: [
        ...result.notes,
        unplacedTotal
          ? `${unplacedTotal} requested plants did not fit while preserving spacing and access.`
          : "All requested plants fit the current spacing and access rules.",
      ],
    }));
    setSelectedPlacementIds([]);
  };

  const arrangeSelection = (mode: "row" | "block") => {
    const movable = selectedPlacements.filter((placement) => !placement.locked);
    if (movable.length < 2) return;
    const densityFactor =
      plan.plannerSettings.density === "intensive" ? 0.8 : 1;
    const rawPitch =
      Math.max(
        ...movable.map(
          (placement) => CROP_BY_ID[placement.cropId].spacing * densityFactor,
        ),
      );
    const pitch =
      Math.ceil(rawPitch / plan.plannerSettings.gridSize) *
      plan.plannerSettings.gridSize;
    const centre = movable.reduce(
      (sum, placement) => ({
        x: sum.x + placement.x / movable.length,
        y: sum.y + placement.y / movable.length,
      }),
      { x: 0, y: 0 },
    );
    const buildPattern = (vertical = false) => {
      if (mode === "row") {
        return movable.map((placement, index) => {
          const offset = (index - (movable.length - 1) / 2) * pitch;
          return {
            id: placement.id,
            x: centre.x + (vertical ? 0 : offset),
            y: centre.y + (vertical ? offset : 0),
          };
        });
      }
      const columns = Math.ceil(Math.sqrt(movable.length));
      const rows = Math.ceil(movable.length / columns);
      return movable.map((placement, index) => ({
        id: placement.id,
        x: centre.x + (index % columns - (columns - 1) / 2) * pitch,
        y:
          centre.y +
          (Math.floor(index / columns) - (rows - 1) / 2) * pitch,
      }));
    };
    const unselected = plan.placements.filter(
      (placement) => !selectedPlacementIds.includes(placement.id),
    );
    const isValid = (
      updates: { id: string; x: number; y: number }[],
    ) =>
      updates.every((update) => {
        if (!pointInPolygon([update.x, update.y], PLOT_3P)) return false;
        const placement = movable.find((item) => item.id === update.id);
        if (!placement) return false;
        const ownSpacing =
          CROP_BY_ID[placement.cropId].spacing * densityFactor;
        return unselected.every((other) => {
          const otherSpacing =
            CROP_BY_ID[other.cropId].spacing * densityFactor;
          return (
            Math.hypot(update.x - other.x, update.y - other.y) >=
            (ownSpacing + otherSpacing) / 2
          );
        });
      });
    const offsets: [number, number][] = [[0, 0]];
    for (let distance = 0.25; distance <= 2; distance += 0.25) {
      offsets.push(
        [distance, 0],
        [-distance, 0],
        [0, distance],
        [0, -distance],
        [distance, distance],
        [-distance, distance],
      );
    }
    const patterns =
      mode === "row" ? [buildPattern(false), buildPattern(true)] : [buildPattern()];
    let fitted: { id: string; x: number; y: number }[] | null = null;
    for (const pattern of patterns) {
      for (const [dx, dy] of offsets) {
        const candidate = pattern.map((point) => ({
          ...point,
          x:
            Math.round(
              ((point.x + dx) / plan.plannerSettings.gridSize),
            ) * plan.plannerSettings.gridSize,
          y:
            Math.round(
              ((point.y + dy) / plan.plannerSettings.gridSize),
            ) * plan.plannerSettings.gridSize,
        }));
        if (isValid(candidate)) {
          fitted = candidate;
          break;
        }
      }
      if (fitted) break;
    }
    if (!fitted) {
      updatePlan((current) => ({
        ...current,
        layoutNotes: [
          `The selected plants could not form a spacing-safe ${mode} in the available area.`,
          ...current.layoutNotes,
        ],
      }));
      return;
    }
    const updates = new Map(fitted.map((point) => [point.id, point]));
    updatePlan((current) => ({
      ...current,
      placements: current.placements.map((placement) =>
        updates.has(placement.id)
          ? { ...placement, ...updates.get(placement.id)! }
          : placement,
      ),
    }));
  };

  const snapSelectionToGrid = () => {
    const size = plan.plannerSettings.gridSize;
    updatePlan((current) => ({
      ...current,
      placements: current.placements.map((placement) => {
        if (
          !selectedPlacementIds.includes(placement.id) ||
          placement.locked
        ) {
          return placement;
        }
        const x = Math.round(placement.x / size) * size;
        const y = Math.round(placement.y / size) * size;
        return pointInPolygon([x, y], PLOT_3P)
          ? { ...placement, x, y }
          : placement;
      }),
    }));
  };

  const suggestGardenZones = () => {
    updatePlan((current) => ({
      ...current,
      zones: SUGGESTED_ZONES.map((zone) => ({ ...zone })),
      layoutNotes: [
        "Suggested zones use peak-season sun, access from the east path, the climbing fence and perennial permanence.",
        ...current.layoutNotes,
      ],
    }));
  };

  const toggleZoneLock = (zoneId: string) => {
    updatePlan((current) => ({
      ...current,
      zones: current.zones.map((zone) =>
        zone.id === zoneId ? { ...zone, locked: !zone.locked } : zone,
      ),
    }));
  };

  const exportPlan = () => {
    const blob = new Blob([JSON.stringify(plan, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "plot-3p-plan.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importPlan = async (file: File | undefined) => {
    if (!file) return;
    const decoded = JSON.parse(await file.text()) as Partial<PlanData>;
    updatePlan(normalisePlan(decoded));
    setSelectedId(null);
    setSelectedPlacementIds([]);
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const filteredCrops = CROPS.filter((crop) => {
    const query = cropSearch.trim().toLowerCase();
    return (
      (!query ||
        crop.name.toLowerCase().includes(query) ||
        crop.group.includes(query)) &&
      (!plan.plannerSettings.filterByMonth ||
        crop.months.includes(plan.plannerSettings.month))
    );
  });
  const plannedCount = plan.plantingRequests.reduce(
    (sum, request) => sum + request.quantity,
    0,
  );
  const fittedCount = plan.placements.length;
  const plantedCount = plan.placements.filter(
    (placement) => placement.status === "planted",
  ).length;
  const fixedCount = plan.placements.filter(
    (placement) => placement.locked || placement.status === "planted",
  ).length;
  const averageSun =
    fittedCount > 0
      ? plan.placements.reduce((sum, placement) => sum + placement.sunHours, 0) /
        fittedCount
      : 0;

  const treeImpacts = plan.objects
    .filter((item) => item.context && item.kind === "tree")
    .filter((item) => shadowTouchesPolygon(item, sun, PLOT_3P));
  const neighbourImpacts = plan.objects
    .filter((item) => !item.context)
    .filter(
      (item) =>
        shadowTouchesPolygon(item, sun, PLOT_3O) ||
        shadowTouchesPolygon(item, sun, PLOT_3A_BEYOND_PATH),
    );

  const statusLabel = {
    loading: "Loading saved plan…",
    saving: "Saving…",
    saved: revision ? `Saved on this device · revision ${revision}` : "Saved on this device",
    offline: "Device save unavailable",
    unsaved: "Changes queued",
  }[saveState];

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">CERES COMMUNITY GARDEN · MELBOURNE</p>
          <h1>Plot 3P</h1>
          <p className="subtitle">
            Scale site plan, seasonal shade model & intelligent planting planner
          </p>
        </div>
        <div className="topbar-actions">
          <nav className="view-switch" aria-label="Planning views">
            <button
              aria-pressed={view === "planting"}
              onClick={() => setView("planting")}
            >
              Planting planner
            </button>
            <button
              aria-pressed={view === "site"}
              onClick={() => setView("site")}
            >
              Site & shade
            </button>
          </nav>
          <div className={`save-status ${saveState}`} aria-live="polite">
            <span />
            {statusLabel}
          </div>
        </div>
      </header>

      {view === "site" ? (
      <section className="workspace">
        <aside className="panel left-panel">
          <div className="panel-section intro">
            <span className="section-number">01</span>
            <div>
              <h2>Plan the plot</h2>
              <p>Add an item, then drag it into position. The triangular plot, grid, and fence length are in metres.</p>
            </div>
          </div>

          <div className="add-grid">
            <button onClick={() => addObject("plant")}>
              <span className="add-symbol plant-symbol">+</span>
              Plant
            </button>
            <button onClick={() => addObject("tree")}>
              <span className="add-symbol tree-symbol">+</span>
              Tree
            </button>
            <button onClick={() => addObject("structure")}>
              <span className="add-symbol structure-symbol">+</span>
              Structure
            </button>
          </div>

          <div className="object-list">
            <div className="list-heading">
              <h3>Map objects</h3>
              <span>{plan.objects.length}</span>
            </div>
            {plan.objects.map((item) => (
              <button
                className={item.id === selectedId ? "object-row selected" : "object-row"}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <span
                  className={`object-dot ${item.kind}`}
                  style={{ background: item.color }}
                />
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.context ? "Source-plan context" : item.kind} · {item.height.toFixed(1)} m high
                  </small>
                </span>
              </button>
            ))}
          </div>

          <div className="source-note">
            <strong>Fence edge</strong>
            <p className="fence-note">
              The 6.6 m diagonal hypotenuse is the perimeter fence and a usable support line for climbing vegetables.
            </p>
            <strong>Scale & source</strong>
            <p>{plan.sourceNote}</p>
          </div>
        </aside>

        <section className="map-card">
          <div className="map-toolbar">
            <div className="legend" aria-label="Map legend">
              <span><i className="legend-plot" />Your plot</span>
              <span><i className="legend-neighbour" />Path & nearby plots</span>
              <span><i className="legend-fence" />Climbing fence</span>
            </div>
            <div className="zoom-controls">
              <button
                aria-label="Zoom out"
                onClick={() => setZoom((value) => Math.max(0.78, value - 0.1))}
              >
                −
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                aria-label="Zoom in"
                onClick={() => setZoom((value) => Math.min(1.35, value + 0.1))}
              >
                +
              </button>
            </div>
          </div>
          <div className="canvas-wrap">
            <PlotCanvas
              plan={plan}
              sun={sun}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={(id, x, y) =>
                updatePlan((current) => ({
                  ...current,
                  objects: current.objects.map((item) =>
                    item.id === id ? { ...item, x, y } : item,
                  ),
                }))
              }
              zoom={zoom}
            />
            <div className="sun-chip">
              <span className="sun-disc" />
              <div>
                <small>Sun position</small>
                <strong>
                  {sun.elevation > 0
                    ? `${sun.elevation.toFixed(1)}° high · ${Math.round(sun.azimuth)}°`
                    : "Below horizon"}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <aside className="panel right-panel">
          <div className="panel-section">
            <span className="section-number">02</span>
            <div>
              <h2>Sun & shade</h2>
              <p>Move through a Melbourne day or jump between seasons.</p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="preset-row">
            <button onClick={() => setDate(todayMelbourne())}>Today</button>
            <button onClick={() => setDate(`${date.slice(0, 4)}-12-21`)}>Summer</button>
            <button onClick={() => setDate(`${date.slice(0, 4)}-06-21`)}>Winter</button>
          </div>

          <div className="time-control">
            <div className="time-heading">
              <label htmlFor="time">Local time</label>
              <strong>{formatTime(minutes)}</strong>
            </div>
            <input
              id="time"
              type="range"
              min="300"
              max="1260"
              step="5"
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
            />
            <div className="range-labels">
              <span>5 am</span>
              <span>Noon</span>
              <span>9 pm</span>
            </div>
            <button className="play-button" onClick={() => setPlaying((value) => !value)}>
              {playing ? "Pause day" : "Play through day"}
            </button>
          </div>

          <div className="solar-stats">
            <div><small>Sunrise</small><strong>{formatTime(daylight.sunrise)}</strong></div>
            <div><small>Solar noon</small><strong>{formatTime(daylight.solarNoon)}</strong></div>
            <div><small>Sunset</small><strong>{formatTime(daylight.sunset)}</strong></div>
          </div>

          <div className="impact-card">
            <h3>Shade impact now</h3>
            {sun.elevation <= 0 ? (
              <p>Night-time: direct solar shadows are not shown.</p>
            ) : treeImpacts.length || neighbourImpacts.length ? (
              <>
                {treeImpacts.length > 0 && (
                  <p>
                    <strong>{treeImpacts.length} northern {treeImpacts.length === 1 ? "tree" : "trees"}</strong>{" "}
                    currently project shade onto 3P.
                  </p>
                )}
                {neighbourImpacts.length > 0 && (
                  <p>
                    <strong>{neighbourImpacts.length} plot {neighbourImpacts.length === 1 ? "item" : "items"}</strong>{" "}
                    currently project shade into 3O or across the east path.
                  </p>
                )}
              </>
            ) : (
              <p>No modelled objects project shade across a plot boundary at this time.</p>
            )}
          </div>

          {selected ? (
            <div className="inspector">
              <div className="inspector-heading">
                <div>
                  <small>Selected</small>
                  <h3>{selected.name}</h3>
                </div>
                {!selected.context && (
                  <button
                    className="delete-button"
                    onClick={() => {
                      updatePlan((current) => ({
                        ...current,
                        objects: current.objects.filter((item) => item.id !== selected.id),
                      }));
                      setSelectedId(null);
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <label>
                Name
                <input
                  value={selected.name}
                  onChange={(event) => updateSelected({ name: event.target.value })}
                />
              </label>
              <div className="two-fields">
                <label>
                  Height (m)
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    value={selected.height}
                    onChange={(event) =>
                      updateSelected({ height: Number(event.target.value) })
                    }
                  />
                </label>
                <label>
                  Width (m)
                  <input
                    type="number"
                    min="0.1"
                    max="15"
                    step="0.1"
                    value={selected.canopy}
                    onChange={(event) =>
                      updateSelected({ canopy: Number(event.target.value) })
                    }
                  />
                </label>
              </div>
              <div className="position-readout">
                <span>E {selected.x.toFixed(2)} m</span>
                <span>N {selected.y.toFixed(2)} m</span>
              </div>
              {selected.context && (
                <p className="assumption">
                  Tree position is traced from the source plan; height and canopy are editable assumptions.
                </p>
              )}
            </div>
          ) : (
            <div className="selection-prompt">
              Select any plant, structure, or tree on the map to edit its dimensions.
            </div>
          )}

          <details className="model-details">
            <summary>Model assumptions</summary>
            <p>
              Solar position uses Melbourne local time at {Math.abs(plan.latitude).toFixed(4)}° S,{" "}
              {plan.longitude.toFixed(4)}° E. Shadows assume level ground and vertical object height.
              Tree shade is a projected canopy envelope, so foliage density is not simulated.
            </p>
          </details>

          <div className="action-row">
            <button className="save-button" onClick={save}>Save now</button>
            <button onClick={exportPlan}>Export plan</button>
          </div>
        </aside>
      </section>
      ) : (
        <section className="planner-workspace">
          <aside className="planner-catalog">
            <div className="panel-section intro">
              <span className="section-number">01</span>
              <div>
                <h2>Choose vegetables & flowers</h2>
                <p>
                  Browse the full library, or filter to plants suited to a
                  Melbourne planting month.
                </p>
              </div>
            </div>

            <label className="planner-field">
              Optional planting-month filter
              <select
                value={plan.plannerSettings.month}
                disabled={!plan.plannerSettings.filterByMonth}
                onChange={(event) =>
                  updatePlannerSettings({ month: Number(event.target.value) })
                }
              >
                {monthNames.map((month, index) => (
                  <option value={index + 1} key={month}>
                    {month}
                  </option>
                ))}
              </select>
            </label>
            <label className="check-row library-filter">
              <input
                type="checkbox"
                checked={plan.plannerSettings.filterByMonth}
                onChange={(event) =>
                  updatePlannerSettings({
                    filterByMonth: event.target.checked,
                  })
                }
              />
              Only show plants for this month
            </label>
            <label className="planner-field">
              Find a plant
              <input
                type="search"
                value={cropSearch}
                placeholder="e.g. tomato, flower or leaf"
                onChange={(event) => setCropSearch(event.target.value)}
              />
            </label>

            <div className="crop-library" aria-label="Vegetable and flower library">
              {filteredCrops.map((crop) => (
                <button
                  className="crop-card"
                  key={crop.id}
                  onClick={() => addCropRequest(crop.id)}
                >
                  <span
                    className="crop-swatch"
                    style={{ background: crop.color }}
                  >
                    {crop.short}
                  </span>
                  <span>
                    <strong>{crop.name}</strong>
                    <small>
                      {Math.round(crop.spacing * 100)} cm ·{" "}
                      {crop.sun === "full" ? "full sun" : "part shade"}
                      {crop.perennial ? " · perennial" : ""}
                    </small>
                  </span>
                  <span className="crop-add">+</span>
                </button>
              ))}
              {filteredCrops.length === 0 && (
                <p className="empty-copy">
                  No matching plants in this month. Try another month or a
                  broader search.
                </p>
              )}
            </div>

            <details className="model-details research-details">
              <summary>Spacing approach</summary>
              <p>
                Mature spread drives the circles. Intensive mode applies the
                raised-bed 20% spacing reduction; quick crops may share early
                space with slower plants.
              </p>
            </details>
          </aside>

          <section className="planting-map">
            <div className="planting-toolbar">
              <div>
                <strong>Detailed planting plan</strong>
                <span>25 cm grid · mature spread shown to scale</span>
              </div>
              <div className="planting-metrics">
                <span>
                  <b>{fittedCount}</b> placed
                </span>
                <span>
                  <b>{plantedCount}</b> planted
                </span>
                <span>
                  <b>{fixedCount}</b> fixed
                </span>
                <span>
                  <b>{averageSun ? averageSun.toFixed(1) : "—"}</b> avg sun h
                </span>
              </div>
            </div>
            <div className="planting-shade-controls">
              <button disabled={undoDepth === 0} onClick={undo}>
                ↶ Undo{undoDepth ? ` (${undoDepth})` : ""}
              </button>
              <label className="shade-toggle">
                <input
                  type="checkbox"
                  checked={plan.plannerSettings.showShade}
                  onChange={(event) => {
                    updatePlannerSettings({ showShade: event.target.checked });
                    if (!event.target.checked) setPlaying(false);
                  }}
                />
                Show plant shade
              </label>
              <input
                aria-label="Shade model date"
                type="date"
                value={date}
                disabled={!plan.plannerSettings.showShade}
                onChange={(event) => setDate(event.target.value)}
              />
              <input
                aria-label="Shade model local time"
                className="shade-time-range"
                type="range"
                min="300"
                max="1260"
                step="5"
                value={minutes}
                disabled={!plan.plannerSettings.showShade}
                onChange={(event) => setMinutes(Number(event.target.value))}
              />
              <button
                disabled={
                  !plan.plannerSettings.showShade || !selectedPlacement
                }
                onClick={() => {
                  if (!selectedPlacement) return;
                  const peakMonth = peakMonthForCrop(
                    CROP_BY_ID[selectedPlacement.cropId],
                  );
                  setDate(
                    `${date.slice(0, 4)}-${String(peakMonth).padStart(2, "0")}-15`,
                  );
                  setMinutes(720);
                }}
              >
                Peak selected
              </button>
              <button
                disabled={!plan.plannerSettings.showShade}
                onClick={() => setPlaying((value) => !value)}
              >
                {playing ? "Pause" : "Play"} · {formatTime(minutes)}
              </button>
              <span>
                {sun.elevation > 0
                  ? `${sun.elevation.toFixed(0)}° sun`
                  : "Sun below horizon"}
              </span>
            </div>
            <div className="layout-edit-controls">
              <span>
                {selectedPlacements.length
                  ? `${selectedPlacements.length} selected`
                  : "Drag a box to select plants · Shift-click to add"}
              </span>
              <button
                aria-label="Zoom planting grid out"
                disabled={plantingZoom <= 1}
                onClick={() => setPlantingZoom((value) => Math.max(1, value - 0.25))}
              >
                − Grid
              </button>
              <button
                aria-label="Zoom planting grid in"
                disabled={plantingZoom >= 2.5}
                onClick={() => setPlantingZoom((value) => Math.min(2.5, value + 0.25))}
              >
                + Grid
              </button>
              <button
                disabled={selectedPlacements.length < 2}
                onClick={() => arrangeSelection("row")}
              >
                Grid row
              </button>
              <button
                disabled={selectedPlacements.length < 2}
                onClick={() => arrangeSelection("block")}
              >
                Grid block
              </button>
              <button
                disabled={selectedPlacements.length === 0}
                onClick={snapSelectionToGrid}
              >
                Align selection
              </button>
              <button
                disabled={selectedPlacements.length === 0}
                onClick={() => generatePlantingPlan("selection")}
              >
                Optimise selection
              </button>
            </div>
            <div className="planting-canvas-wrap">
              <PlantingCanvas
                plan={plan}
                sun={sun}
                shadeMonth={Number(date.slice(5, 7)) || 1}
                showShade={plan.plannerSettings.showShade}
                detailZoom={plantingZoom}
                selectedIds={selectedPlacementIds}
                onSelectionChange={setSelectedPlacementIds}
                onGestureStart={pushUndo}
                onMoveMany={(updates) => {
                  const updateMap = new Map(
                    updates.map((update) => [update.id, update]),
                  );
                  updatePlan((current) => ({
                    ...current,
                    placements: current.placements.map((placement) =>
                      updateMap.has(placement.id)
                        ? { ...placement, ...updateMap.get(placement.id)! }
                        : placement,
                    ),
                  }), false);
                }}
              />
              {plan.plannerSettings.showShade && (
                <div className="neighbour-shade-card">
                  <strong>Your plants’ shade now</strong>
                  {sun.elevation <= 0.3 ? (
                    <span>Night-time · move the time slider into daylight</span>
                  ) : (
                    <>
                      <span
                        className={
                          neighbourPlantShade.plot3O >= 10 ? "warning" : ""
                        }
                      >
                        3O {neighbourPlantShade.plot3O.toFixed(0)}%
                      </span>
                      <span
                        className={
                          neighbourPlantShade.plot3A >= 10 ? "warning" : ""
                        }
                      >
                        3A {neighbourPlantShade.plot3A.toFixed(0)}%
                      </span>
                      <small>Amber at 10%+ of neighbour area</small>
                    </>
                  )}
                </div>
              )}
              <div className="planting-legend">
                <span><i className="legend-fence" />6.6 m climbing fence</span>
                <span><i className="legend-path" />Existing east path</span>
                <span><i className="legend-step" />Suggested stepping access</span>
                <span><i className="legend-planned" />Planned</span>
                <span><i className="legend-planted" />Planted / fixed</span>
                {plan.plannerSettings.showShade && (
                  <span><i className="legend-plant-shade" />Your plant shade</span>
                )}
              </div>
            </div>
          </section>

          <aside className="planner-list">
            <div className="panel-section">
              <span className="section-number">02</span>
              <div>
                <h2>Your planting list</h2>
                <p>
                  Set quantities and priorities, then generate an editable
                  layout.
                </p>
              </div>
            </div>

            <div className="request-list">
              {plan.plantingRequests.length === 0 ? (
                <div className="selection-prompt">
                  Add vegetables and flowers from the library. The tool will
                  tell you what fits.
                </div>
              ) : (
                plan.plantingRequests.map((request) => {
                  const crop = CROP_BY_ID[request.cropId];
                  const fitted = plan.placements.filter(
                    (placement) => placement.requestId === request.id,
                  ).length;
                  return (
                    <div className="request-row" key={request.id}>
                      <span
                        className="crop-swatch compact"
                        style={{ background: crop.color }}
                      >
                        {crop.short}
                      </span>
                      <div>
                        <strong>{crop.name}</strong>
                        <small>
                          {fitted
                            ? `${fitted}/${request.quantity} fitted`
                            : `${Math.round(crop.spacing * 100)} cm spacing`}
                        </small>
                      </div>
                      <input
                        aria-label={`${crop.name} quantity`}
                        type="number"
                        min="1"
                        max="100"
                        value={request.quantity}
                        onChange={(event) =>
                          updatePlan((current) => ({
                            ...current,
                            plantingRequests: current.plantingRequests.map(
                              (item) =>
                                item.id === request.id
                                  ? {
                                      ...item,
                                      quantity: Math.max(
                                        1,
                                        Number(event.target.value),
                                      ),
                                    }
                                  : item,
                            ),
                            placements: current.placements.filter(
                              (placement) =>
                                placement.requestId !== request.id ||
                                placement.locked ||
                                placement.status === "planted",
                            ),
                            layoutNotes: [],
                          }))
                        }
                      />
                      <button
                        className={
                          request.priority === "high"
                            ? "priority-button active"
                            : "priority-button"
                        }
                        aria-label={`Toggle ${crop.name} priority`}
                        aria-pressed={request.priority === "high"}
                        onClick={() =>
                          updatePlan((current) => ({
                            ...current,
                            plantingRequests: current.plantingRequests.map(
                              (item) =>
                                item.id === request.id
                                  ? {
                                      ...item,
                                      priority:
                                        item.priority === "high"
                                          ? "normal"
                                          : "high",
                                    }
                                  : item,
                            ),
                          }))
                        }
                      >
                        ★
                      </button>
                      <button
                        className="request-remove"
                        aria-label={`Remove ${crop.name}`}
                        onClick={() =>
                          updatePlan((current) => ({
                            ...current,
                            plantingRequests:
                              current.plantingRequests.filter(
                                (item) => item.id !== request.id,
                              ),
                            placements: current.placements.filter(
                              (placement) =>
                                placement.requestId !== request.id,
                            ),
                          }))
                        }
                      >
                        ×
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="planner-options">
              <label>
                Layout density
                <select
                  value={plan.plannerSettings.density}
                  onChange={(event) =>
                    updatePlannerSettings({
                      density: event.target.value as
                        | "standard"
                        | "intensive",
                    })
                  }
                >
                  <option value="intensive">Intensive bed</option>
                  <option value="standard">Packet spacing</option>
                </select>
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={plan.plannerSettings.interplant}
                  onChange={(event) =>
                    updatePlannerSettings({ interplant: event.target.checked })
                  }
                />
                Allow interplanting
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={plan.plannerSettings.accessPath}
                  onChange={(event) =>
                    updatePlannerSettings({ accessPath: event.target.checked })
                  }
                />
                Reserve stepping access
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={plan.plannerSettings.useFence}
                  onChange={(event) =>
                    updatePlannerSettings({ useFence: event.target.checked })
                  }
                />
                Put climbers on fence
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={plan.plannerSettings.showGrid}
                  onChange={(event) =>
                    updatePlannerSettings({ showGrid: event.target.checked })
                  }
                />
                Show 25 cm planning grid
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={plan.plannerSettings.snapToGrid}
                  onChange={(event) =>
                    updatePlannerSettings({
                      snapToGrid: event.target.checked,
                      showGrid: event.target.checked
                        ? true
                        : plan.plannerSettings.showGrid,
                    })
                  }
                />
                Lock dragging to grid
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={plan.plannerSettings.alignmentAssist}
                  onChange={(event) =>
                    updatePlannerSettings({ alignmentAssist: event.target.checked })
                  }
                />
                Gently guide into rows / blocks
              </label>
            </div>

            <section className="zone-planner" aria-labelledby="zone-heading">
              <div className="zone-heading">
                <div>
                  <small>Garden structure</small>
                  <h3 id="zone-heading">Planting zones</h3>
                </div>
                <button onClick={suggestGardenZones}>
                  {plan.zones.length ? "Refresh suggestions" : "Suggest zones"}
                </button>
              </div>
              {plan.zones.length ? (
                <div className="zone-list">
                  {plan.zones.map((zone) => (
                    <div className="zone-row" key={zone.id}>
                      <i style={{ background: zone.color }} />
                      <div>
                        <strong>{zone.name}</strong>
                        <small>{zone.purpose}</small>
                        <span>{zone.suitability}</span>
                      </div>
                      <button onClick={() => toggleZoneLock(zone.id)}>
                        {zone.locked ? "Locked" : "Lock"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="zone-empty">
                  Start with a suitability-led structure, then lock each zone once it feels right.
                </p>
              )}
            </section>

            <button
              className="generate-button"
              disabled={plannedCount === 0}
              onClick={() => generatePlantingPlan("whole")}
            >
              {plan.placements.length
                ? "Optimise whole patch"
                : "Generate planting guide"}
            </button>

            {selectedPlacements.length > 1 && (
              <div className="placement-detail multi-selection-detail">
                <div>
                  <small>Group edit</small>
                  <h3>{selectedPlacements.length} plants selected</h3>
                </div>
                <p>
                  Group moves preserve the arrangement. Locked or planted
                  plants stay in place during optimisation.
                </p>
                <div className="placement-commit-actions">
                  <button
                    onClick={() =>
                      updatePlan((current) => ({
                        ...current,
                        placements: current.placements.map((placement) =>
                          selectedPlacementIds.includes(placement.id) &&
                          placement.status !== "planted"
                            ? { ...placement, locked: !placement.locked }
                            : placement,
                        ),
                      }))
                    }
                  >
                    Toggle position locks
                  </button>
                  <button
                    onClick={() =>
                      updatePlan((current) => ({
                        ...current,
                        placements: current.placements.map((placement) =>
                          selectedPlacementIds.includes(placement.id)
                            ? {
                                ...placement,
                                status: "planted",
                                locked: true,
                              }
                            : placement,
                        ),
                      }))
                    }
                  >
                    Mark all planted
                  </button>
                </div>
              </div>
            )}

            {selectedPlacement ? (
              <div className="placement-detail">
                <div>
                  <small>
                    {selectedPlacement.status === "planted"
                      ? "Planted"
                      : "Planned proposal"}
                    {selectedPlacement.locked ? " · position locked" : ""}
                  </small>
                  <h3>{CROP_BY_ID[selectedPlacement.cropId].name}</h3>
                </div>
                <p>{selectedPlacement.reason}</p>
                <div className="position-readout">
                  <span>{selectedPlacement.sunHours.toFixed(1)} sun h</span>
                  <span>
                    {Math.round(
                      CROP_BY_ID[selectedPlacement.cropId].spacing * 100,
                    )}{" "}
                    cm spread
                  </span>
                  <span>
                    {CROP_BY_ID[selectedPlacement.cropId].height.toFixed(1)} m
                    peak ·{" "}
                    {
                      monthNames[
                        peakMonthForCrop(
                          CROP_BY_ID[selectedPlacement.cropId],
                        ) - 1
                      ]
                    }
                  </span>
                </div>
                <div className="placement-commit-actions">
                  <button
                    onClick={() =>
                      updatePlan((current) => ({
                        ...current,
                        placements: current.placements.map((placement) =>
                          placement.id === selectedPlacement.id
                            ? {
                                ...placement,
                                status:
                                  placement.status === "planted"
                                    ? "planned"
                                    : "planted",
                                locked:
                                  placement.status === "planted"
                                    ? placement.locked
                                    : true,
                              }
                            : placement,
                        ),
                      }))
                    }
                  >
                    {selectedPlacement.status === "planted"
                      ? "Mark as planned"
                      : "Mark as planted"}
                  </button>
                  <button
                    disabled={selectedPlacement.status === "planted"}
                    onClick={() =>
                      updatePlan((current) => ({
                        ...current,
                        placements: current.placements.map((placement) =>
                          placement.id === selectedPlacement.id
                            ? { ...placement, locked: !placement.locked }
                            : placement,
                        ),
                      }))
                    }
                  >
                    {selectedPlacement.locked
                      ? "Unlock position"
                      : "Lock position"}
                  </button>
                </div>
                <button
                  className="delete-button"
                  onClick={() => {
                    updatePlan((current) => ({
                      ...current,
                      placements: current.placements.filter(
                        (placement) =>
                          placement.id !== selectedPlacement.id,
                      ),
                    }));
                    setSelectedPlacementIds([]);
                  }}
                >
                  Remove this plant
                </button>
              </div>
            ) : (
              plan.layoutNotes.length > 0 && (
                <div className="layout-explanation">
                  <h3>Why this layout</h3>
                  <ul>
                    {plan.layoutNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              )
            )}

            <div className="planner-actions">
              <button onClick={save}>Save now</button>
              <button onClick={exportPlan}>Export JSON</button>
              <button onClick={() => importRef.current?.click()}>
                Import JSON
              </button>
              <input
                ref={importRef}
                className="file-input"
                type="file"
                accept="application/json"
                onChange={(event) => importPlan(event.target.files?.[0])}
              />
            </div>

            <details className="model-details">
              <summary>Planner assumptions</summary>
              <p>
                Crop spacing and Melbourne sowing months are planning defaults,
                not cultivar-specific instructions. Confirm seed packets before
                planting. Tree shade uses editable assumed heights.
              </p>
            </details>
          </aside>
        </section>
      )}
    </main>
  );
}
