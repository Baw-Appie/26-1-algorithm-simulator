<template lang="pug">
.stage
  .canvas-wrap
    canvas(
      ref="canvasEl"
      width="900"
      height="540"
      aria-label="화재 대피 시뮬레이션 지도"
    )
  .legend(aria-label="범례")
    span(v-for="item in legend" :key="item.label")
      i.swatch(:style="{ background: item.color }")
      | {{ item.label }}
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { COLORS, EXIT_INFO, EXIT_ORDER, type ExitId } from "../lib/constants";
import { COLS, ROWS, TILE, xy } from "../lib/graph/grid";
import type { CurrentResult, Frame, Scenario } from "../lib/types";

type ExitCounts = Record<ExitId, number>;

const props = defineProps<{
  scenario: Scenario;
  current: CurrentResult | null;
  frame: Frame;
}>();

const canvasEl = ref<HTMLCanvasElement | null>(null);
const legend = [
  { label: "벽", color: COLORS.wall },
  { label: "복도", color: COLORS.corridor },
  { label: "출구", color: COLORS.exit },
  { label: "연기", color: "#d59b2d" },
  { label: "화재", color: COLORS.fire },
  { label: "대피자", color: COLORS.person }
];

function tileColor(tile: number) {
  if (tile === TILE.WALL) return COLORS.wall;
  if (tile === TILE.CORRIDOR) return COLORS.corridor;
  if (tile === TILE.EXIT) return COLORS.exit;
  return COLORS.floor;
}

function emptyExitCounts(): ExitCounts {
  return Object.fromEntries(EXIT_ORDER.map((id) => [id, 0])) as ExitCounts;
}

function drawRouteHeat(ctx: CanvasRenderingContext2D, cellW: number, cellH: number) {
  if (!props.current) return;
  const loads = new Map<number, ExitCounts>();
  props.current.assignment.forEach((gene, personIndex) => {
    const person = props.scenario.people[personIndex];
    const route = person.candidates[gene] || person.candidates[0];
    route.path.forEach((cell) => {
      if (!loads.has(cell)) loads.set(cell, emptyExitCounts());
      loads.get(cell)![route.exitId]++;
    });
  });

  for (const [cell, counts] of loads) {
    const [x, y] = xy(Number(cell));
    const dominant = (Object.entries(counts) as Array<[ExitId, number]>).reduce((best, entry) =>
      entry[1] > best[1] ? entry : best
    );
    const alpha = Math.min(0.42, 0.08 + (dominant[1] / props.scenario.people.length) * 0.95);
    ctx.fillStyle = hexToRgba(EXIT_INFO[dominant[0]].color, alpha);
    ctx.fillRect(x * cellW + 2, y * cellH + 2, cellW - 4, cellH - 4);
  }
}

function hexToRgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function draw() {
  const canvas = canvasEl.value;
  if (!canvas || !props.scenario) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  const cellW = width / COLS;
  const cellH = height / ROWS;
  const peopleAt = new Map(props.frame.positions);

  ctx.clearRect(0, 0, width, height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = y * COLS + x;
      const fireTime = props.scenario.fireAt[cell];
      let fill = tileColor(props.scenario.grid[cell]);
      if (fireTime <= props.frame.tick) fill = COLORS.fire;
      else if (fireTime <= props.frame.tick + 14) fill = COLORS.smoke;

      ctx.fillStyle = fill;
      ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
      ctx.strokeStyle = "rgba(23, 32, 26, 0.10)";
      ctx.strokeRect(x * cellW, y * cellH, cellW, cellH);
    }
  }

  drawRouteHeat(ctx, cellW, cellH);

  for (const exit of props.scenario.exits) {
    const [x, y] = xy(exit.cell);
    ctx.fillStyle = EXIT_INFO[exit.id].color;
    ctx.fillRect(x * cellW + 3, y * cellH + 3, cellW - 6, cellH - 6);
    ctx.fillStyle = "#fff";
    ctx.font = `700 ${Math.max(11, cellW * 0.38)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("E", x * cellW + cellW / 2, y * cellH + cellH / 2);
  }

  for (const [cell, count] of peopleAt) {
    const [x, y] = xy(Number(cell));
    const cx = x * cellW + cellW / 2;
    const cy = y * cellH + cellH / 2;
    const radius = Math.min(cellW, cellH) * 0.33;
    ctx.beginPath();
    ctx.fillStyle = COLORS.person;
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    if (count > 1) {
      ctx.fillStyle = "#fff";
      ctx.font = `800 ${Math.max(10, cellW * 0.32)}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(count > 99 ? "99+" : String(count), cx, cy);
    }
  }
}

onMounted(draw);
watch([() => props.scenario, () => props.current, () => props.frame], draw);
</script>
