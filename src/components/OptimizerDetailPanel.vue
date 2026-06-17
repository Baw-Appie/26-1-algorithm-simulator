<template lang="pug">
section.algorithm-detail
  .evolution-head
    div
      h2 {{ result.label }} 결과
      p {{ result.assignment.length }}명 기준 이동 프리셋
    .evolution-score
      b 점수
      strong {{ Math.round(result.metrics.score) }}

  .evolution-grid
    .evolution-metric
      b 완료 시간
      strong {{ formatSeconds(result.metrics.completionTime) }}
    .evolution-metric
      b 평균 시간
      strong {{ formatSeconds(result.metrics.avgTime) }}
    .evolution-metric
      b 성공 인원
      strong {{ result.metrics.successCount }}명
    .evolution-metric
      b 최대 혼잡
      strong {{ result.metrics.maxCongestion }}명
    .evolution-metric
      b 계산 시간
      strong {{ formatMs(result.computeTimeMs) }}

  .evolution-details
    .detail-block
      b 대피 상세
      .detail-row
        span 실패 인원
        strong {{ result.metrics.failedCount }}명
      .detail-row
        span 혼잡 누적
        strong {{ Math.round(result.metrics.congestionSum) }}
      .detail-row
        span 이동 프리셋 길이
        strong {{ result.assignment.length }}명
    .detail-block
      b 출구 배분
      .detail-row(v-for="exit in exits" :key="exit.id")
        span {{ exit.name }}
        strong {{ result.metrics.loads[exit.id] }}명 · {{ loadPercent(exit.id).toFixed(1) }}%

  .load-bars
    .load-row(v-for="exit in exits" :key="exit.id")
      span {{ exit.name }}
      .load-track
        i(:style="{ width: `${loadPercent(exit.id)}%`, background: exit.color }")
      b {{ result.metrics.loads[exit.id] }}명 · {{ loadPercent(exit.id).toFixed(1) }}%

  .assignment-copy
    textarea(readonly rows="4" :value="copyText" aria-label="이동 프리셋")
    .copy-actions
      button.primary(type="button" @click="$emit('copy')") 프리셋 복사
      span(v-if="copyStatus") {{ copyStatus }}
</template>

<script setup lang="ts">
import { computed } from "vue";
import { EXIT_INFO, EXIT_ORDER, type ExitId } from "../lib/constants";
import { formatMs, formatSeconds } from "../lib/utils";
import type { OptimizerResult } from "../lib/types";

const props = defineProps<{
  result: OptimizerResult;
  copyStatus?: string;
}>();

defineEmits<{ copy: [] }>();

const exits = EXIT_ORDER.map((id) => ({ id, ...EXIT_INFO[id] }));
const copyText = computed(() => JSON.stringify(props.result.assignment));
const assignedTotal = computed(() =>
  EXIT_ORDER.reduce((sum, id) => sum + props.result.metrics.loads[id], 0)
);

function loadPercent(exitId: ExitId) {
  if (!assignedTotal.value) return 0;
  return (props.result.metrics.loads[exitId] / assignedTotal.value) * 100;
}
</script>
