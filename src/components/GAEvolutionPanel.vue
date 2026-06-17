<template lang="pug">
section.evolution
  .evolution-head
    div
      h2 GA 진화 과정
      p {{ current.label }} · {{ activeIndex + 1 }} / {{ history.length }}
    .evolution-score
      b 최적 점수
      strong {{ Math.round(current.bestScore) }}

  .evolution-progress
    span(:style="{ width: `${progress}%` }")

  .evolution-grid
    .evolution-metric
      b 완료 시간
      strong {{ current.metrics.completionTime }}초
    .evolution-metric
      b 성공 인원
      strong {{ current.metrics.successCount }}명
    .evolution-metric
      b 최대 혼잡
      strong {{ current.metrics.maxCongestion }}명
    .evolution-metric
      b 세대 평균
      strong {{ Math.round(current.averageScore) }}
    .evolution-metric
      b 계산 시간
      strong {{ formatMs(computeTimeMs) }}

  .evolution-details
    .detail-block
      b 점수 변화
      .detail-row
        span 이전 세대 대비
        strong(:class="scoreClass(previousScoreDelta)") {{ scoreDeltaText(previousScoreDelta) }}
      .detail-row
        span 시작 대비
        strong(:class="scoreClass(startScoreDelta)") {{ scoreDeltaText(startScoreDelta) }}
      .detail-row
        span 시작 대비 개선율
        strong {{ improvementPercent.toFixed(1) }}%
      .detail-row
        span 세대 평균과 차이
        strong {{ Math.round(averageGap) }}점
    .detail-block
      b 대피 상세
      .detail-row
        span 평균 대피 시간
        strong {{ formatSeconds(current.metrics.avgTime) }}
      .detail-row
        span 실패 인원
        strong {{ current.metrics.failedCount }}명
      .detail-row
        span 혼잡 누적
        strong {{ Math.round(current.metrics.congestionSum) }}
      .detail-row
        span 이동 프리셋 길이
        strong {{ current.assignment.length }}명

  .load-bars
    .load-row(v-for="exit in exits" :key="exit.id")
      span {{ exit.name }}
      .load-track
        i(:style="{ width: `${loadPercent(exit.id)}%`, background: exit.color }")
      b {{ current.metrics.loads[exit.id] }}명 · {{ loadPercent(exit.id).toFixed(1) }}%

  .score-chart(aria-label="세대별 GA 점수")
    button.score-bar(
      v-for="(step, index) in history"
      :key="`${step.generation}-${index}`"
      type="button"
      :class="{ active: index === activeIndex }"
      :style="{ height: `${barHeight(step)}%` }"
      :title="`${step.label}: ${Math.round(step.bestScore)}점`"
      disabled
    )

  .assignment-copy(v-if="copyText")
    textarea(readonly rows="4" :value="copyText" aria-label="이동 프리셋")
    .copy-actions
      button.primary(type="button" @click="$emit('copy')") 프리셋 복사
      span(v-if="copyStatus") {{ copyStatus }}
</template>

<script setup lang="ts">
import { computed } from "vue";
import { EXIT_INFO, EXIT_ORDER, type ExitId } from "../lib/constants";
import { formatMs, formatSeconds } from "../lib/utils";
import type { Assignment, GAEvolutionStep } from "../lib/types";

const props = defineProps<{
  history: GAEvolutionStep[];
  activeIndex: number;
  assignment?: Assignment;
  copyStatus?: string;
  computeTimeMs?: number;
}>();

defineEmits<{ copy: [] }>();

const exits = EXIT_ORDER.map((id) => ({ id, ...EXIT_INFO[id] }));
const current = computed<GAEvolutionStep>(
  () => props.history[props.activeIndex] || props.history[0]!
);
const computeTimeMs = computed(() => props.computeTimeMs ?? 0);
const previous = computed(() => props.history[props.activeIndex - 1]);
const first = computed(() => props.history[0]);
const copyText = computed(() => (props.assignment?.length ? JSON.stringify(props.assignment) : ""));
const progress = computed(() =>
  props.history.length <= 1 ? 100 : (props.activeIndex / (props.history.length - 1)) * 100
);
const assignedTotal = computed(() =>
  EXIT_ORDER.reduce((sum, id) => sum + current.value.metrics.loads[id], 0)
);
const previousScoreDelta = computed(() =>
  previous.value ? current.value.bestScore - previous.value.bestScore : null
);
const startScoreDelta = computed(() =>
  first.value ? current.value.bestScore - first.value.bestScore : null
);
const improvementPercent = computed(() => {
  const start = first.value?.bestScore || 0;
  return start ? ((start - current.value.bestScore) / start) * 100 : 0;
});
const averageGap = computed(() => current.value.averageScore - current.value.bestScore);
const scoreRange = computed(() => {
  const scores = props.history.map((step) => step.bestScore);
  return {
    min: Math.min(...scores),
    max: Math.max(...scores)
  };
});

function loadPercent(exitId: ExitId) {
  if (!assignedTotal.value) return 0;
  return (current.value.metrics.loads[exitId] / assignedTotal.value) * 100;
}

function scoreDeltaText(value: number | null) {
  if (value === null) return "-";
  const rounded = Math.round(value);
  if (!rounded) return "변화 없음";
  return `${rounded < 0 ? "개선" : "증가"} ${Math.abs(rounded)}점`;
}

function scoreClass(value: number | null) {
  return {
    good: value !== null && value < 0,
    bad: value !== null && value > 0
  };
}

function barHeight(step: GAEvolutionStep) {
  const { min, max } = scoreRange.value;
  if (max === min) return 35;
  return 18 + ((step.bestScore - min) / (max - min)) * 72;
}
</script>
