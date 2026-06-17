import type { AlgorithmMode, ExitId } from "./constants";
import type { TileValue } from "./graph/grid";

export type Assignment = number[];
export type RouteLoads = Record<ExitId, number>;

export interface ExitNode {
  id: ExitId;
  cell: number;
}

export interface RouteCandidate {
  exitId: ExitId;
  path: number[];
  staticCost: number;
}

export interface PathResult {
  path: number[];
  cost: number;
}

export interface Person {
  id: number;
  start: number;
  candidates: RouteCandidate[];
}

export interface Scenario {
  grid: TileValue[];
  capacity: number[];
  exits: ExitNode[];
  fireAt: number[];
  people: Person[];
}

export interface Frame {
  tick: number;
  success: number;
  failed: number;
  positions: Array<[number, number]>;
}

export interface SimulationMetrics {
  completionTime: number;
  avgTime: number;
  successCount: number;
  failedCount: number;
  maxCongestion: number;
  congestionSum: number;
  score: number;
  loads: RouteLoads;
  frames: Frame[];
}

export interface GAEvolutionStep {
  generation: number;
  label: string;
  assignment: Assignment;
  metrics: SimulationMetrics;
  bestScore: number;
  averageScore: number;
}

export interface OptimizerResult {
  label: string;
  mode: AlgorithmMode;
  assignment: Assignment;
  metrics: SimulationMetrics;
  computeTimeMs: number;
  history?: GAEvolutionStep[];
}

export interface GAResult extends OptimizerResult {
  mode: "ga";
  history: GAEvolutionStep[];
}

export interface CurrentResult extends OptimizerResult {
  frames: Frame[];
}

export interface MetricSummary {
  mode: string;
  tick: number;
  success: number;
  congestion: number;
  computeTimeMs?: number;
}
