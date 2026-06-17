import { CORRIDOR_AREAS, FIRE_DELAY, FIRE_START_POINTS, RNG_SEEDS, ROOM_AREAS } from "../constants";
import { mulberry32 } from "../utils";
import { dijkstra } from "../algorithms/dijkstra";
import type { ExitNode, Person, RouteCandidate, Scenario } from "../types";
import { CELLS, TILE, idx, isWalkable, neighbors, type TileValue } from "./grid";

function makeBuilding(): Omit<Scenario, "fireAt" | "people"> & { fireStarts: number[] } {
  const grid: TileValue[] = Array(CELLS).fill(TILE.WALL);
  const capacity = Array(CELLS).fill(0);
  const carve = (x1: number, y1: number, x2: number, y2: number, type: TileValue = TILE.FLOOR) => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) grid[idx(x, y)] = type;
    }
  };

  ROOM_AREAS.forEach(([x1, y1, x2, y2]) => carve(x1, y1, x2, y2));
  CORRIDOR_AREAS.forEach(([x1, y1, x2, y2]) => carve(x1, y1, x2, y2, TILE.CORRIDOR));

  const exits: ExitNode[] = [
    { id: "north", cell: idx(15, 0) },
    { id: "west", cell: idx(0, 9) },
    { id: "east", cell: idx(29, 9) }
  ];
  exits.forEach((exit) => (grid[exit.cell] = TILE.EXIT));

  // 복도는 이동 가능하지만 일반 바닥보다 좁은 공간으로 보고 한 틱당 수용량을 낮춘다.
  for (let cell = 0; cell < CELLS; cell++) {
    if (grid[cell] === TILE.FLOOR) capacity[cell] = 8;
    if (grid[cell] === TILE.CORRIDOR) capacity[cell] = 3;
    if (grid[cell] === TILE.EXIT) capacity[cell] = 6;
  }
  for (let y = 1; y <= 10; y++) capacity[idx(15, y)] = 1;
  capacity[idx(15, 0)] = 3;

  return {
    grid,
    capacity,
    exits,
    fireStarts: FIRE_START_POINTS.map(([x, y]) => idx(x, y))
  };
}

function computeFireTimes(grid: readonly TileValue[], starts: readonly number[]): number[] {
  const fireAt: number[] = Array(CELLS).fill(Infinity);
  const queue: number[] = [];
  starts.forEach((cell) => {
    fireAt[cell] = 0;
    queue.push(cell);
  });

  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    for (const next of neighbors(cell)) {
      if (!isWalkable(grid, next) || fireAt[next] !== Infinity) continue;
      fireAt[next] = fireAt[cell] + FIRE_DELAY;
      queue.push(next);
    }
  }
  return fireAt;
}

function makePeople(scenario: Scenario, count: number): Person[] {
  const rng = mulberry32(RNG_SEEDS.scenario + count * RNG_SEEDS.scenarioPeopleFactor);
  const zones = [
    { x1: 12, y1: 12, x2: 18, y2: 16, weight: 0.76 },
    { x1: 9, y1: 11, x2: 21, y2: 13, weight: 0.14 },
    { x1: 23, y1: 12, x2: 27, y2: 16, weight: 0.06 },
    { x1: 2, y1: 12, x2: 7, y2: 16, weight: 0.04 }
  ];
  const totalWeight = zones.reduce((sum, zone) => sum + zone.weight, 0);

  return Array.from({ length: count }, (_, id) => {
    let pick = rng() * totalWeight;
    const zone =
      zones.find((candidate) => {
        pick -= candidate.weight;
        return pick <= 0;
      }) || zones[0];

    let start = idx(15, 14);
    for (let tries = 0; tries < 24; tries++) {
      const x = zone.x1 + Math.floor(rng() * (zone.x2 - zone.x1 + 1));
      const y = zone.y1 + Math.floor(rng() * (zone.y2 - zone.y1 + 1));
      const cell = idx(x, y);
      if (
        isWalkable(scenario.grid, cell) &&
        scenario.grid[cell] !== TILE.EXIT &&
        scenario.fireAt[cell] > 18
      ) {
        start = cell;
        break;
      }
    }

    const candidates: RouteCandidate[] = scenario.exits
      .map((exit) => {
        const route = dijkstra(scenario, start, exit.cell);
        return route && { exitId: exit.id, path: route.path, staticCost: route.cost };
      })
      .filter((route): route is RouteCandidate => Boolean(route));

    return { id, start, candidates };
  });
}

export function prepareScenario(peopleCount: number): Scenario {
  const base = makeBuilding();
  const scenario: Scenario = {
    ...base,
    fireAt: computeFireTimes(base.grid, base.fireStarts),
    people: []
  };
  scenario.people = makePeople(scenario, peopleCount);
  return scenario;
}
