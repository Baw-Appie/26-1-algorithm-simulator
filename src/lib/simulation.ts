import { EXIT_ORDER, MAX_TICKS, SCORE_WEIGHTS } from "./constants";
import { TILE } from "./graph/grid";
import type { Assignment, Frame, RouteLoads, Scenario, SimulationMetrics } from "./types";

interface Agent {
  id: number;
  pos: number;
  step: number;
  path: number[];
  escaped: boolean;
  failed: boolean;
}

function routeLoads(scenario: Scenario, assignment: Assignment): RouteLoads {
  const loads = Object.fromEntries(EXIT_ORDER.map((id) => [id, 0])) as RouteLoads;
  assignment.forEach((gene, index) => {
    const route = scenario.people[index].candidates[gene] || scenario.people[index].candidates[0];
    loads[route.exitId]++;
  });
  return loads;
}

export function makeStaticFrame(scenario: Scenario): Frame {
  const positions = new Map<number, number>();
  scenario.people.forEach((person) =>
    positions.set(person.start, (positions.get(person.start) || 0) + 1)
  );
  return { tick: 0, success: 0, failed: 0, positions: [...positions.entries()] };
}

export function simulate(
  scenario: Scenario,
  assignment: Assignment,
  options: { record?: boolean } = {}
): SimulationMetrics {
  const record = Boolean(options.record);
  const agents: Agent[] = scenario.people.map((person, index) => {
    const route = person.candidates[assignment[index]] || person.candidates[0];
    return {
      id: person.id,
      pos: person.start,
      step: 0,
      path: route.path,
      escaped: false,
      failed: false
    };
  });
  const frames: Frame[] = [];
  let success = 0;
  let failed = 0;
  let exitTotal = 0;
  let lastExit = 0;
  let maxCongestion = 0;
  let congestionSum = 0;

  const snapshot = (tick: number) => {
    const positions = new Map<number, number>();
    for (const agent of agents) {
      if (!agent.escaped && !agent.failed) {
        positions.set(agent.pos, (positions.get(agent.pos) || 0) + 1);
      }
    }
    frames.push({ tick, success, failed, positions: [...positions.entries()] });
  };

  if (record) snapshot(0);

  for (let tick = 0; tick < MAX_TICKS && success + failed < agents.length; tick++) {
    const requests = new Map<number, number[]>();

    for (const agent of agents) {
      if (agent.escaped || agent.failed) continue;
      if (scenario.fireAt[agent.pos] <= tick) {
        agent.failed = true;
        failed++;
        continue;
      }

      if (agent.step >= agent.path.length - 1) {
        agent.escaped = true;
        success++;
        exitTotal += tick;
        lastExit = Math.max(lastExit, tick);
        continue;
      }

      const next = agent.path[agent.step + 1];
      if (scenario.fireAt[next] <= tick + 1) continue;
      if (!requests.has(next)) requests.set(next, []);
      requests.get(next)!.push(agent.id);
    }

    for (const [cell, ids] of requests) {
      const cap = scenario.capacity[cell] || 1;
      if (ids.length > cap) {
        const overflow = ids.length - cap;
        maxCongestion = Math.max(maxCongestion, overflow);
        congestionSum += overflow;
      }

      for (let i = 0; i < Math.min(cap, ids.length); i++) {
        const agent = agents[ids[i]];
        if (!agent || agent.escaped || agent.failed) continue;
        agent.pos = cell;
        agent.step++;

        if (scenario.grid[cell] === TILE.EXIT) {
          const exitTick = tick + 1;
          agent.escaped = true;
          success++;
          exitTotal += exitTick;
          lastExit = Math.max(lastExit, exitTick);
        }
      }
    }

    if (record) snapshot(tick + 1);
  }

  const failedCount = agents.length - success;
  const allEscaped = success === agents.length;
  const completionTime = allEscaped ? lastExit : MAX_TICKS;
  const avgTime = success ? exitTotal / success : MAX_TICKS;
  const score =
    completionTime +
    failedCount * SCORE_WEIGHTS.failedPerson +
    maxCongestion * SCORE_WEIGHTS.maxCongestion +
    congestionSum * SCORE_WEIGHTS.congestionSum;

  return {
    completionTime,
    avgTime,
    successCount: success,
    failedCount,
    maxCongestion,
    congestionSum,
    score,
    loads: routeLoads(scenario, assignment),
    frames
  };
}
