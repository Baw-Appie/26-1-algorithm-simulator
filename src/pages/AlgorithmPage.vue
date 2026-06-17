<template lang="pug">
section.algorithm-page
  aside.side.algorithm-side
    .control-group
      label(for="algorithmPeopleRange") 대피 인원
      .range-row
        input#algorithmPeopleRange(
          type="range"
          :min="PEOPLE_RANGE.min"
          :max="PEOPLE_RANGE.max"
          :step="PEOPLE_RANGE.step"
          :value="peopleCount"
          @input="changePeopleEvent"
        )
        input(
          type="number"
          :min="PEOPLE_RANGE.min"
          :max="PEOPLE_RANGE.max"
          :step="PEOPLE_RANGE.step"
          :value="peopleCount"
          @change="changePeopleEvent"
        )

    .buttons
      button.primary(:disabled="busy" @click="run") {{ label }} 계산
      button(:disabled="busy" @click="resetScenario") 리셋

    .metrics
      .metric
        b 방식
        strong {{ label }}
      .metric
        b 완료 시간
        strong {{ result ? formatSeconds(result.metrics.completionTime) : "-" }}
      .metric
        b 성공 인원
        strong {{ result ? `${result.metrics.successCount}명` : "-" }}
      .metric
        b 점수
        strong {{ result ? Math.round(result.metrics.score) : "-" }}
      .metric
        b 계산 시간
        strong {{ result ? formatMs(result.computeTimeMs) : "-" }}

  .algorithm-main
    EvacuationCanvas(
      :scenario="scenario"
      :current="current"
      :frame="activeFrame"
    )
    OptimizerDetailPanel(
      v-if="result"
      :result="result"
      :copy-status="copyStatus"
      @copy="copy"
    )
    .evolution-empty(v-else)
      strong 대기 중
</template>

<script setup lang="ts">
import { computed } from "vue";
import EvacuationCanvas from "../components/EvacuationCanvas.vue";
import OptimizerDetailPanel from "../components/OptimizerDetailPanel.vue";
import { useEvacuationOptimizer } from "../composables/useEvacuationOptimizer";
import { MODE_LABELS, PEOPLE_RANGE, type ResultMode } from "../lib/constants";
import { formatMs, formatSeconds } from "../lib/utils";

const props = defineProps<{
  mode: ResultMode;
}>();

const {
  activeFrame,
  busy,
  changePeopleEvent,
  copyResultPreset,
  copyStatus,
  current,
  peopleCount,
  resetScenario,
  results,
  runAlgorithm,
  scenario
} = useEvacuationOptimizer();

const label = computed(() => MODE_LABELS[props.mode]);
const result = computed(() => results[props.mode]);

const run = () => runAlgorithm(props.mode);
const copy = () => copyResultPreset(props.mode);
</script>
