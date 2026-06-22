<template lang="pug">
section.ga-page
  aside.side.ga-side
    .control-group
      label(for="evolutionPeopleRange") 대피 인원
      .range-row
        input#evolutionPeopleRange(
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
      button.primary(:disabled="busy" @click="run") {{ label }} 진화

    .metrics
      .metric
        b 세대
        strong {{ evolution ? `${evolutionIndex + 1}/${evolution.history.length}` : "-" }}
      .metric
        b 완료 시간
        strong {{ activeStep ? formatSeconds(activeStep.metrics.completionTime) : "-" }}
      .metric
        b 성공 인원
        strong {{ activeStep ? `${activeStep.metrics.successCount}명` : "-" }}
      .metric
        b 최적 점수
        strong {{ activeStep ? Math.round(activeStep.bestScore) : "-" }}
      .metric
        b 계산 시간
        strong {{ evolution ? formatMs(evolution.computeTimeMs) : "-" }}

  .algorithm-main
    EvacuationCanvas(
      :scenario="scenario"
      :current="current"
      :frame="activeFrame"
    )
    GAEvolutionPanel(
      v-if="evolution"
      :label="label"
      :history="evolution.history"
      :active-index="evolutionIndex"
      :assignment="evolution.assignment"
      :copy-status="copyStatus"
      :compute-time-ms="evolution.computeTimeMs"
      @copy="copy"
    )
    .evolution-empty(v-else)
      strong 대기 중
</template>

<script setup lang="ts">
import { computed } from "vue";
import EvacuationCanvas from "../components/EvacuationCanvas.vue";
import GAEvolutionPanel from "../components/GAEvolutionPanel.vue";
import { useEvacuationOptimizer } from "../composables/useEvacuationOptimizer";
import { EVOLUTION_MODE_LABELS, PEOPLE_RANGE, type GAEvolutionMode } from "../lib/constants";
import { formatMs, formatSeconds } from "../lib/utils";

const props = defineProps<{
  mode: GAEvolutionMode;
}>();

const {
  activeFrame,
  busy,
  changePeopleEvent,
  copyEvolutionAssignment,
  copyStatus,
  current,
  evolutionIndex,
  evolutions,
  peopleCount,
  runGAEvolution,
  scenario
} = useEvacuationOptimizer();

const label = computed(() => EVOLUTION_MODE_LABELS[props.mode]);
const evolution = computed(() => evolutions[props.mode]);
const activeStep = computed(() => evolution.value?.history[evolutionIndex.value]);
const run = () => runGAEvolution(props.mode);
const copy = () => copyEvolutionAssignment(props.mode);
</script>
