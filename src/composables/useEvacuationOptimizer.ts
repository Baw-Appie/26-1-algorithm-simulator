import { computed, reactive, ref } from "vue";
import {
  runBaseline,
  runEarlyStopGAIncremental,
  runGAIncremental,
  runSAIncremental
} from "../lib/algorithms";
import {
  EVOLUTION_MODE_LABELS,
  MODE_LABELS,
  PEOPLE_RANGE,
  PLAYBACK_CONFIG,
  SPEED_RANGE,
  type GAEvolutionMode,
  type ResultMode
} from "../lib/constants";
import { clamp } from "../lib/utils";
import { prepareScenario } from "../lib/graph/scenario";
import { makeStaticFrame, simulate } from "../lib/simulation";
import type {
  Assignment,
  CurrentResult,
  Frame,
  GAEvolutionStep,
  GAResult,
  MetricSummary,
  OptimizerResult,
  Scenario
} from "../lib/types";

type ResultEntry = OptimizerResult & { mode: ResultMode };
type ResultsState = Record<ResultMode, ResultEntry | null>;
type EvolutionState = Record<GAEvolutionMode, GAResult | null>;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const peopleCount = ref<number>(PEOPLE_RANGE.default);
const speed = ref<number>(SPEED_RANGE.default);
const status = ref("준비됨");
const busy = ref(false);
const scenario = ref<Scenario>(prepareScenario(PEOPLE_RANGE.default));
const results = reactive<ResultsState>({ baseline: null, sa: null });
const current = ref<CurrentResult | null>(null);
const frameIndex = ref(0);
const playing = ref(false);
const evolutions = reactive<EvolutionState>({ ga: null, earlystopga: null });
const evolutionIndex = ref(0);
const assignmentText = ref("");
const copyStatus = ref("");
let rafId = 0;
let lastStepAt = 0;
let evolutionTimer = 0;
let gaAbortController: AbortController | null = null;

const activeFrame = computed<Frame>(
  () => current.value?.frames[frameIndex.value] || makeStaticFrame(scenario.value)
);

const metricSummary = computed<MetricSummary>(() => {
  const result = current.value;
  if (!result)
    return {
      mode: "-",
      tick: activeFrame.value.tick,
      success: activeFrame.value.success,
      congestion: 0
    };
  return {
    mode: result.label || MODE_LABELS[result.mode],
    tick: activeFrame.value.tick,
    success: activeFrame.value.success,
    congestion: result.metrics.maxCongestion,
    computeTimeMs: result.computeTimeMs
  };
});

function stopTimers() {
  playing.value = false;
  cancelAnimationFrame(rafId);
  clearTimeout(evolutionTimer);
  gaAbortController?.abort();
  gaAbortController = null;
}

function setResult(result: ResultEntry) {
  results[result.mode] = result;
}

function setCurrent(result: OptimizerResult) {
  const metrics = simulate(scenario.value, result.assignment, { record: true });
  current.value = { ...result, metrics, frames: metrics.frames };
  frameIndex.value = 0;
  playing.value = false;
}

function pause() {
  stopTimers();
  status.value = "일시정지됨";
}

function resetScenario() {
  pause();
  scenario.value = prepareScenario(peopleCount.value);
  results.baseline = null;
  results.sa = null;
  current.value = null;
  evolutions.ga = null;
  evolutions.earlystopga = null;
  evolutionIndex.value = 0;
  copyStatus.value = "";
  frameIndex.value = 0;
  status.value = "준비됨";
}

function changePeopleCount(value: number) {
  peopleCount.value = clamp(value, PEOPLE_RANGE.min, PEOPLE_RANGE.max);
  resetScenario();
}

function changePeopleEvent(event: Event) {
  changePeopleCount(Number((event.target as HTMLInputElement).value) || PEOPLE_RANGE.min);
}

function changeSpeedEvent(event: Event) {
  speed.value = clamp(
    Number((event.target as HTMLInputElement).value) || SPEED_RANGE.default,
    SPEED_RANGE.min,
    SPEED_RANGE.max
  );
}

function stepAnimation(time: number) {
  if (!playing.value || !current.value) return;
  const frameDelay = PLAYBACK_CONFIG.frameMs / speed.value;
  if (!lastStepAt || time - lastStepAt >= frameDelay) {
    lastStepAt = time;
    frameIndex.value = Math.min(frameIndex.value + 1, current.value.frames.length - 1);
    if (frameIndex.value >= current.value.frames.length - 1) {
      playing.value = false;
      status.value = `${current.value.label} 완료`;
      return;
    }
  }
  rafId = requestAnimationFrame(stepAnimation);
}

function play() {
  clearTimeout(evolutionTimer);
  if (!current.value) {
    const baseline = results.baseline || runBaseline(scenario.value);
    setResult(baseline);
    setCurrent(baseline);
  }
  const active = current.value;
  if (!active) return;
  if (frameIndex.value >= active.frames.length - 1) frameIndex.value = 0;
  playing.value = true;
  lastStepAt = 0;
  status.value = `${active.label} 재생 중`;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(stepAnimation);
}

async function runAlgorithm(mode: ResultMode) {
  pause();
  busy.value = true;
  evolutions.ga = null;
  evolutions.earlystopga = null;
  evolutionIndex.value = 0;
  copyStatus.value = "";
  status.value = `${MODE_LABELS[mode]} 계산 중`;
  await delay(PLAYBACK_CONFIG.statusDelayMs);

  if (mode === "baseline") {
    const result = runBaseline(scenario.value);
    setResult(result);
    setCurrent(result);
    status.value = `${MODE_LABELS[mode]} 계산 완료`;
    busy.value = false;
    return;
  }

  const controller = new AbortController();
  gaAbortController = controller;

  const generator = runSAIncremental(scenario.value);
  let finalResult: ResultEntry | null = null;

  for await (const step of generator) {
    if (controller.signal.aborted) break;
    if (!step.result) continue;

    finalResult = step.result;
    setResult(step.result);
    setCurrent(step.result);
    status.value = `${MODE_LABELS[mode]} 계산 중: ${Math.round(step.result.metrics.score)}점`;
  }

  gaAbortController = null;
  busy.value = false;

  if (finalResult) {
    setResult(finalResult);
    setCurrent(finalResult);
    status.value = `${MODE_LABELS[mode]} 계산 완료`;
  }
}

function parseAssignment(value: string): Assignment | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    status.value = "이동 프리셋 형식 오류";
    return null;
  }

  if (!Array.isArray(parsed)) {
    status.value = "이동 프리셋은 배열이어야 합니다";
    return null;
  }

  const people = scenario.value.people;
  if (parsed.length !== people.length) {
    status.value = `이동 프리셋 길이 불일치: ${parsed.length}/${people.length}`;
    return null;
  }

  const assignment: Assignment = [];
  for (let i = 0; i < parsed.length; i++) {
    const gene = parsed[i];
    if (!Number.isInteger(gene)) {
      status.value = `이동 프리셋 오류: ${i + 1}번째 값`;
      return null;
    }
    if (gene < 0 || gene >= people[i].candidates.length) {
      status.value = `이동 프리셋 범위 오류: ${i + 1}번째 값`;
      return null;
    }
    assignment.push(gene);
  }
  return assignment;
}

function testAssignment() {
  const assignment = parseAssignment(assignmentText.value.trim());
  if (!assignment) return;
  stopTimers();
  const metrics = simulate(scenario.value, assignment, { record: true });
  current.value = {
    label: "이동 프리셋",
    mode: "ga",
    assignment,
    metrics,
    frames: metrics.frames,
    computeTimeMs: 0
  };
  frameIndex.value = 0;
  status.value = `이동 프리셋 테스트 완료: ${metrics.completionTime}초`;
}

function makeCurrentFromStep(
  mode: GAEvolutionMode,
  step: GAEvolutionStep,
  computeTimeMs: number
): CurrentResult {
  const metrics = simulate(scenario.value, step.assignment, { record: true });
  return {
    label: `${EVOLUTION_MODE_LABELS[mode]} ${step.label}`,
    mode: "ga",
    assignment: step.assignment,
    metrics,
    frames: metrics.frames,
    computeTimeMs
  };
}

function setEvolutionFrame(mode: GAEvolutionMode, index: number) {
  const result = evolutions[mode];
  if (!result) return;
  const step = result.history[index];
  if (!step) return;
  const label = EVOLUTION_MODE_LABELS[mode];
  evolutionIndex.value = index;
  current.value = makeCurrentFromStep(mode, step, result.computeTimeMs);
  frameIndex.value = 0;
  status.value = `${label} 진화 ${step.generation}세대: 완료 ${step.metrics.completionTime}초, 최대 혼잡 ${step.metrics.maxCongestion}명`;
}

async function runGAEvolution(mode: GAEvolutionMode = "ga") {
  stopTimers();
  busy.value = true;
  copyStatus.value = "";
  const label = EVOLUTION_MODE_LABELS[mode];
  status.value = `${label} 진화 계산 중`;
  await delay(PLAYBACK_CONFIG.statusDelayMs);

  evolutions[mode] = null;
  evolutionIndex.value = 0;
  current.value = null;
  frameIndex.value = 0;

  const controller = new AbortController();
  gaAbortController = controller;

  const generator =
    mode === "earlystopga"
      ? runEarlyStopGAIncremental(scenario.value, { trackHistory: true })
      : runGAIncremental(scenario.value, { trackHistory: true });
  let finalResult: GAResult | null = null;

  for await (const step of generator) {
    if (controller.signal.aborted) break;
    if (!step.result) continue;

    finalResult = step.result;
    evolutions[mode] = step.result;
    evolutionIndex.value = step.result.history.length - 1;

    const latest = step.result.history[step.result.history.length - 1];
    if (latest) {
      current.value = makeCurrentFromStep(mode, latest, step.result.computeTimeMs);
      frameIndex.value = current.value.frames.length - 1;
      status.value = `${label} 진화 ${latest.generation}세대: 완료 ${latest.metrics.completionTime}초, 최대 혼잡 ${latest.metrics.maxCongestion}명`;
    }
  }

  busy.value = false;
  gaAbortController = null;

  if (finalResult) {
    evolutions[mode] = finalResult;
    evolutionIndex.value = finalResult.history.length - 1;
    const latest = finalResult.history[finalResult.history.length - 1];
    if (latest) {
      current.value = makeCurrentFromStep(mode, latest, finalResult.computeTimeMs);
      frameIndex.value = current.value.frames.length - 1;
    }
    status.value = `${label} 진화 완료: ${finalResult.history.length}세대`;
  }
}

async function copyPreset(assignment: Assignment, label = "") {
  try {
    await navigator.clipboard.writeText(JSON.stringify(assignment));
    status.value = `${label}이동 프리셋 복사 완료`;
    return true;
  } catch {
    status.value = `${label}이동 프리셋 복사 실패`;
    return false;
  }
}

async function copyEvolutionAssignment(mode: GAEvolutionMode = "ga") {
  const evolution = evolutions[mode];
  if (!evolution) return;
  copyStatus.value = (await copyPreset(evolution.assignment)) ? "복사됨" : "복사 실패";
}

async function copyResultPreset(mode: ResultMode) {
  const result = results[mode];
  if (!result) return;
  copyStatus.value = (await copyPreset(result.assignment, `${result.label} `))
    ? "복사됨"
    : "복사 실패";
}

function showAlgorithmResult(mode: ResultMode) {
  const result = results[mode];
  if (result) {
    setCurrent(result);
    return;
  }
  current.value = null;
  frameIndex.value = 0;
}

function showEvolutionResult(mode: GAEvolutionMode = "ga") {
  const evolution = evolutions[mode];
  if (evolution?.history.length) {
    setEvolutionFrame(mode, Math.min(evolutionIndex.value, evolution.history.length - 1));
    return;
  }
  current.value = null;
  frameIndex.value = 0;
}

export function useEvacuationOptimizer() {
  return {
    activeFrame,
    assignmentText,
    busy,
    changePeopleCount,
    changePeopleEvent,
    changeSpeedEvent,
    copyEvolutionAssignment,
    copyResultPreset,
    copyStatus,
    current,
    evolutionIndex,
    evolutions,
    metricSummary,
    pause,
    peopleCount,
    play,
    resetScenario,
    results,
    runAlgorithm,
    runGAEvolution,
    scenario,
    showAlgorithmResult,
    showEvolutionResult,
    speed,
    status,
    stopTimers,
    testAssignment
  };
}
