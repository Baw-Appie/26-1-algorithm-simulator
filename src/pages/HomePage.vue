<template lang="pug">
section.layout
  EvacuationCanvas(
    :scenario="scenario"
    :current="current"
    :frame="activeFrame"
  )

  ControlPanel(
    :people-count="peopleCount"
    :speed="speed"
    :busy="busy"
    :metrics="metricSummary"
    :assignment="assignmentText"
    @update:people-count="changePeopleCount"
    @update:speed="speed = $event"
    @update:assignment="assignmentText = $event"
    @play="play"
    @pause="pause"
    @reset="resetScenario"
    @test-assignment="testAssignment"
  )
</template>

<script setup lang="ts">
import ControlPanel from "../components/ControlPanel.vue";
import EvacuationCanvas from "../components/EvacuationCanvas.vue";
import { useEvacuationOptimizer } from "../composables/useEvacuationOptimizer";

const {
  activeFrame,
  assignmentText,
  busy,
  changePeopleCount,
  current,
  metricSummary,
  pause,
  peopleCount,
  play,
  resetScenario,
  scenario,
  speed,
  testAssignment
} = useEvacuationOptimizer();
</script>
