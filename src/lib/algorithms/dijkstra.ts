import { ROUTE_RISK } from "../constants";
import { CELLS, isWalkable, neighbors } from "../graph/grid";
import type { PathResult, Scenario } from "../types";

interface HeapItem {
  cell: number;
  cost: number;
}

function heapPush(heap: HeapItem[], item: HeapItem) {
  heap.push(item);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (heap[parent].cost <= item.cost) break;
    heap[i] = heap[parent];
    i = parent;
  }
  heap[i] = item;
}

function heapPop(heap: HeapItem[]): HeapItem {
  const top = heap[0]!;
  const item = heap.pop()!;
  if (heap.length && item) {
    let i = 0;
    while (true) {
      let child = i * 2 + 1;
      if (child >= heap.length) break;
      if (child + 1 < heap.length && heap[child + 1].cost < heap[child].cost) child++;
      if (heap[child].cost >= item.cost) break;
      heap[i] = heap[child];
      i = child;
    }
    heap[i] = item;
  }
  return top;
}

function riskCost(fireAt: readonly number[], cell: number) {
  const fireTime = fireAt[cell];
  if (!Number.isFinite(fireTime)) return 0;
  return Math.max(0, ROUTE_RISK.fireTimeWindow - fireTime) * ROUTE_RISK.weight;
}

export function dijkstra(scenario: Scenario, start: number, target: number): PathResult | null {
  const { grid, fireAt } = scenario;
  const dist: number[] = Array(CELLS).fill(Infinity);
  const prev: number[] = Array(CELLS).fill(-1);
  const heap: HeapItem[] = [];
  dist[start] = 0;
  heapPush(heap, { cell: start, cost: 0 });

  while (heap.length) {
    const { cell, cost } = heapPop(heap);
    if (cost !== dist[cell]) continue;
    if (cell === target) break;

    for (const next of neighbors(cell)) {
      if (!isWalkable(grid, next)) continue;
      // 일반 바닥과 복도는 경로 비용 차이를 두지 않고 거리와 화재 위험도로만 평가한다.
      const nextCost = cost + 1 + riskCost(fireAt, next);
      if (nextCost >= dist[next]) continue;
      dist[next] = nextCost;
      prev[next] = cell;
      heapPush(heap, { cell: next, cost: nextCost });
    }
  }

  if (!Number.isFinite(dist[target])) return null;
  const path: number[] = [];
  for (let cell = target; cell !== -1; cell = prev[cell]) path.push(cell);
  path.reverse();
  return { path, cost: dist[target] };
}
