import { EXIT_ORDER, GA_CONFIG, RNG_SEEDS } from "../constants";
import { mulberry32 } from "../utils";
import { simulate } from "../simulation";
import type { Assignment, GAResult, GAEvolutionStep, Scenario, SimulationMetrics } from "../types";
import { baselineAssignment } from "./baseline";

const EARLY_STOP_DELTA = 3;
const EARLY_STOP_PATIENCE = 5;

function balancedAssignment(scenario: Scenario): Assignment {
  return scenario.people.map((person, index) => {
    const target = EXIT_ORDER[index % EXIT_ORDER.length];
    const found = person.candidates.findIndex((route) => route.exitId === target);
    return found >= 0 ? found : 0;
  });
}

function randomAssignment(scenario: Scenario, rng: () => number): Assignment {
  return scenario.people.map((person) => Math.floor(rng() * person.candidates.length));
}

export function runGA(scenario: Scenario, options: { trackHistory?: boolean } = {}): GAResult {
  const start = performance.now();
  const trackHistory = Boolean(options.trackHistory);
  const rng = mulberry32(RNG_SEEDS.ga + scenario.people.length);
  const cache = new Map<string, SimulationMetrics>();
  const evaluate = (genes: Assignment) => {
    const key = genes.join("|");
    const cached = cache.get(key);
    if (cached) return cached;
    const metrics = simulate(scenario, genes);
    cache.set(key, metrics);
    return metrics;
  };
  const scorePopulation = (population: Assignment[]) =>
    population
      .map((genes) => {
        const metrics = evaluate(genes);
        return { genes, metrics, score: metrics.score };
      })
      .sort((a, b) => a.score - b.score);
  const history: GAEvolutionStep[] = [];
  const rememberBaseline = (genes: Assignment) => {
    if (!trackHistory) return;
    const metrics = simulate(scenario, genes);
    history.push({
      generation: 0,
      label: "최단경로",
      assignment: genes.slice(),
      metrics,
      bestScore: metrics.score,
      averageScore: metrics.score
    });
  };
  const rememberGeneration = (
    generation: number,
    scored: Array<{ genes: Assignment; metrics: SimulationMetrics; score: number }>
  ) => {
    if (!trackHistory) return;
    const best = scored[0];
    const averageScore = scored.reduce((sum, item) => sum + item.score, 0) / scored.length;
    history.push({
      generation,
      label: `${generation}세대`,
      assignment: best.genes.slice(),
      metrics: best.metrics,
      bestScore: best.score,
      averageScore
    });
  };
  const base = baselineAssignment(scenario);
  const balanced = balancedAssignment(scenario);
  let population = [base, balanced];

  while (population.length < GA_CONFIG.populationSize)
    population.push(randomAssignment(scenario, rng));
  rememberBaseline(base);
  let scored = scorePopulation(population);
  rememberGeneration(1, scored);

  let bestScore = scored[0].score;
  let stagnationCount = 0;

  const tournament = (candidates: Array<{ genes: Assignment; score: number }>) => {
    let best = candidates[Math.floor(rng() * candidates.length)];
    for (let i = 0; i < GA_CONFIG.tournamentExtraPicks; i++) {
      const candidate = candidates[Math.floor(rng() * candidates.length)];
      if (candidate.score < best.score) best = candidate;
    }
    return best.genes;
  };

  for (let gen = 2; gen <= GA_CONFIG.generations; gen++) {
    const next = scored.slice(0, GA_CONFIG.eliteCount).map((item) => item.genes.slice());

    while (next.length < GA_CONFIG.populationSize) {
      const a = tournament(scored);
      const b = tournament(scored);
      const split = 1 + Math.floor(rng() * (scenario.people.length - 2));
      const child = a.slice(0, split).concat(b.slice(split));

      for (let i = 0; i < child.length; i++) {
        const mutationRate =
          gen < GA_CONFIG.highMutationUntilGeneration
            ? GA_CONFIG.highMutationRate
            : GA_CONFIG.mutationRate;
        if (rng() < mutationRate)
          child[i] = Math.floor(rng() * scenario.people[i].candidates.length);
      }
      next.push(child);
    }
    population = next;
    scored = scorePopulation(population);
    rememberGeneration(gen, scored);

    const currentBest = scored[0].score;
    const improvement = bestScore - currentBest;

    if (improvement < EARLY_STOP_DELTA) {
      stagnationCount++;
    } else {
      stagnationCount = 0;
      bestScore = currentBest;
    }

    if (stagnationCount >= EARLY_STOP_PATIENCE) break;
  }

  const best = scored[0].genes;
  const metrics = evaluate(best);

  return {
    label: "EarlyStop GA",
    mode: "ga",
    assignment: best,
    metrics,
    computeTimeMs: performance.now() - start,
    history
  };
}

export interface GAIncrementalResult {
  done: boolean;
  result: GAResult | null;
}

export async function* runGAIncremental(
  scenario: Scenario,
  options: { trackHistory?: boolean; yieldInterval?: number } = {}
): AsyncGenerator<GAIncrementalResult, GAResult, void> {
  const start = performance.now();
  const trackHistory = Boolean(options.trackHistory);
  const yieldInterval = options.yieldInterval ?? 1;
  const rng = mulberry32(RNG_SEEDS.ga + scenario.people.length);
  const cache = new Map<string, SimulationMetrics>();
  const evaluate = (genes: Assignment) => {
    const key = genes.join("|");
    const cached = cache.get(key);
    if (cached) return cached;
    const metrics = simulate(scenario, genes);
    cache.set(key, metrics);
    return metrics;
  };
  const scorePopulation = (population: Assignment[]) =>
    population
      .map((genes) => {
        const metrics = evaluate(genes);
        return { genes, metrics, score: metrics.score };
      })
      .sort((a, b) => a.score - b.score);
  const history: GAEvolutionStep[] = [];
  const rememberBaseline = (genes: Assignment) => {
    if (!trackHistory) return;
    const metrics = simulate(scenario, genes);
    history.push({
      generation: 0,
      label: "최단경로",
      assignment: genes.slice(),
      metrics,
      bestScore: metrics.score,
      averageScore: metrics.score
    });
  };
  const rememberGeneration = (
    generation: number,
    scored: Array<{ genes: Assignment; metrics: SimulationMetrics; score: number }>
  ) => {
    if (!trackHistory) return;
    const best = scored[0];
    const averageScore = scored.reduce((sum, item) => sum + item.score, 0) / scored.length;
    history.push({
      generation,
      label: `${generation}세대`,
      assignment: best.genes.slice(),
      metrics: best.metrics,
      bestScore: best.score,
      averageScore
    });
  };
  const buildResult = (): GAResult => {
    const best = scored[0]?.genes ?? baselineAssignment(scenario);
    const metrics = evaluate(best);
    return {
      label: "EarlyStop GA",
      mode: "ga",
      assignment: best,
      metrics,
      computeTimeMs: performance.now() - start,
      history: history.slice()
    };
  };
  const base = baselineAssignment(scenario);
  const balanced = balancedAssignment(scenario);
  let population = [base, balanced];

  while (population.length < GA_CONFIG.populationSize)
    population.push(randomAssignment(scenario, rng));
  rememberBaseline(base);
  let scored = scorePopulation(population);
  rememberGeneration(1, scored);

  let bestScore = scored[0].score;
  let stagnationCount = 0;

  yield { done: false, result: buildResult() };
  await delay(0);

  const tournament = (candidates: Array<{ genes: Assignment; score: number }>) => {
    let best = candidates[Math.floor(rng() * candidates.length)];
    for (let i = 0; i < GA_CONFIG.tournamentExtraPicks; i++) {
      const candidate = candidates[Math.floor(rng() * candidates.length)];
      if (candidate.score < best.score) best = candidate;
    }
    return best.genes;
  };

  for (let gen = 2; gen <= GA_CONFIG.generations; gen++) {
    const next = scored.slice(0, GA_CONFIG.eliteCount).map((item) => item.genes.slice());

    while (next.length < GA_CONFIG.populationSize) {
      const a = tournament(scored);
      const b = tournament(scored);
      const split = 1 + Math.floor(rng() * (scenario.people.length - 2));
      const child = a.slice(0, split).concat(b.slice(split));

      for (let i = 0; i < child.length; i++) {
        const mutationRate =
          gen < GA_CONFIG.highMutationUntilGeneration
            ? GA_CONFIG.highMutationRate
            : GA_CONFIG.mutationRate;
        if (rng() < mutationRate)
          child[i] = Math.floor(rng() * scenario.people[i].candidates.length);
      }
      next.push(child);
    }
    population = next;
    scored = scorePopulation(population);
    rememberGeneration(gen, scored);

    const currentBest = scored[0].score;
    const improvement = bestScore - currentBest;

    if (improvement < EARLY_STOP_DELTA) {
      stagnationCount++;
    } else {
      stagnationCount = 0;
      bestScore = currentBest;
    }

    if (stagnationCount >= EARLY_STOP_PATIENCE) {
      const result = buildResult();
      yield { done: true, result };
      // eslint-disable-next-line no-await-in-loop
      await delay(0);
      return result;
    }

    if (gen % yieldInterval === 0 || gen === GA_CONFIG.generations) {
      yield { done: gen === GA_CONFIG.generations, result: buildResult() };
      // eslint-disable-next-line no-await-in-loop
      await delay(0);
    }
  }

  return buildResult();
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
