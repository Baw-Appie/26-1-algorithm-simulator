import { simulate } from "../simulation";
import type { Assignment, OptimizerResult, Scenario } from "../types";

type BaselineResult = OptimizerResult & { mode: "baseline" };

export function baselineAssignment(scenario: Scenario): Assignment {
  return scenario.people.map((person) => {
    let best = 0;
    for (let i = 1; i < person.candidates.length; i++) {
      if (person.candidates[i].staticCost < person.candidates[best].staticCost) best = i;
    }
    return best;
  });
}

export function runBaseline(scenario: Scenario): BaselineResult {
  const start = performance.now();
  const assignment = baselineAssignment(scenario);
  const metrics = simulate(scenario, assignment);
  return {
    label: "최단경로",
    mode: "baseline",
    assignment,
    metrics,
    computeTimeMs: performance.now() - start
  };
}
