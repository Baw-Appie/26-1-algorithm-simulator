import { RNG_SEEDS, SA_CONFIG } from "../constants";
import { mulberry32 } from "../utils";
import { simulate } from "../simulation";
import type { Assignment, OptimizerResult, Scenario } from "../types";
import { baselineAssignment } from "./baseline";

type SAResult = OptimizerResult & { mode: "sa" };

export function runSA(scenario: Scenario): SAResult {
  const start = performance.now();
  const rng = mulberry32(RNG_SEEDS.sa + scenario.people.length);
  const cache = new Map<string, number>();
  const evaluate = (genes: Assignment) => {
    const key = genes.join("");
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const score = simulate(scenario, genes).score;
    cache.set(key, score);
    return score;
  };
  let currentGenes = baselineAssignment(scenario);
  let currentScore = evaluate(currentGenes);
  let bestGenes = currentGenes.slice();
  let bestScore = currentScore;

  for (let i = 0; i < SA_CONFIG.iterations; i++) {
    const temp =
      SA_CONFIG.initialTemperature * Math.pow(SA_CONFIG.coolingRate, i) +
      SA_CONFIG.temperatureFloor;
    const nextGenes = currentGenes.slice();
    const changes =
      SA_CONFIG.neighborBaseChanges +
      Math.floor(
        rng() * (SA_CONFIG.neighborRandomBase + temp / SA_CONFIG.neighborTemperatureDivisor)
      );

    for (let c = 0; c < changes; c++) {
      const personIndex = Math.floor(rng() * scenario.people.length);
      nextGenes[personIndex] = Math.floor(rng() * scenario.people[personIndex].candidates.length);
    }

    const nextScore = evaluate(nextGenes);
    const delta = nextScore - currentScore;
    if (delta < 0 || rng() < Math.exp(-delta / temp)) {
      currentGenes = nextGenes;
      currentScore = nextScore;
      if (currentScore < bestScore) {
        bestGenes = currentGenes.slice();
        bestScore = currentScore;
      }
    }
  }

  const metrics = simulate(scenario, bestGenes);
  return {
    label: "SA",
    mode: "sa",
    assignment: bestGenes,
    metrics,
    computeTimeMs: performance.now() - start
  };
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface SAIncrementalResult {
  done: boolean;
  result: SAResult;
}

export async function* runSAIncremental(
  scenario: Scenario,
  options: { yieldInterval?: number } = {}
): AsyncGenerator<SAIncrementalResult, SAResult, void> {
  const start = performance.now();
  const yieldInterval = options.yieldInterval ?? 10;
  const rng = mulberry32(RNG_SEEDS.sa + scenario.people.length);
  const cache = new Map<string, number>();
  const evaluate = (genes: Assignment) => {
    const key = genes.join("");
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const score = simulate(scenario, genes).score;
    cache.set(key, score);
    return score;
  };
  let currentGenes = baselineAssignment(scenario);
  let currentScore = evaluate(currentGenes);
  let bestGenes = currentGenes.slice();
  let bestScore = currentScore;

  const buildResult = (): SAResult => {
    const metrics = simulate(scenario, bestGenes);
    return {
      label: "SA",
      mode: "sa",
      assignment: bestGenes,
      metrics,
      computeTimeMs: performance.now() - start
    };
  };

  yield { done: false, result: buildResult() };
  await delay(0);

  for (let i = 0; i < SA_CONFIG.iterations; i++) {
    const temp =
      SA_CONFIG.initialTemperature * Math.pow(SA_CONFIG.coolingRate, i) +
      SA_CONFIG.temperatureFloor;
    const nextGenes = currentGenes.slice();
    const changes =
      SA_CONFIG.neighborBaseChanges +
      Math.floor(
        rng() * (SA_CONFIG.neighborRandomBase + temp / SA_CONFIG.neighborTemperatureDivisor)
      );

    for (let c = 0; c < changes; c++) {
      const personIndex = Math.floor(rng() * scenario.people.length);
      nextGenes[personIndex] = Math.floor(rng() * scenario.people[personIndex].candidates.length);
    }

    const nextScore = evaluate(nextGenes);
    const delta = nextScore - currentScore;
    if (delta < 0 || rng() < Math.exp(-delta / temp)) {
      currentGenes = nextGenes;
      currentScore = nextScore;
      if (currentScore < bestScore) {
        bestGenes = currentGenes.slice();
        bestScore = currentScore;
      }
    }

    if ((i + 1) % yieldInterval === 0 || i === SA_CONFIG.iterations - 1) {
      yield { done: i === SA_CONFIG.iterations - 1, result: buildResult() };
      await delay(0);
    }
  }

  return buildResult();
}
