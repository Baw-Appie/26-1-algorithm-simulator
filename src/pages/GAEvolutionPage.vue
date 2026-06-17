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
      button.primary(:disabled="busy" @click="runGAEvolution") GA 진화

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
      :history="evolution.history"
      :active-index="evolutionIndex"
      :assignment="evolution.assignment"
      :copy-status="copyStatus"
      :compute-time-ms="evolution.computeTimeMs"
      @copy="copyEvolutionAssignment"
    )
    .evolution-empty(v-else)
      strong 대기 중
</template>

<script setup lang="ts">
import { computed } from "vue";
import EvacuationCanvas from "../components/EvacuationCanvas.vue";
import GAEvolutionPanel from "../components/GAEvolutionPanel.vue";
import { useEvacuationOptimizer } from "../composables/useEvacuationOptimizer";
import { PEOPLE_RANGE } from "../lib/constants";
import { formatMs, formatSeconds } from "../lib/utils";

const {
  activeFrame,
  busy,
  changePeopleEvent,
  copyEvolutionAssignment,
  copyStatus,
  current,
  evolution,
  evolutionIndex,
  peopleCount,
  runGAEvolution,
  scenario
} = useEvacuationOptimizer();

const activeStep = computed(() => evolution.value?.history[evolutionIndex.value]);
</script>
