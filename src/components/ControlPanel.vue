<template lang="pug">
aside.side
  .control-group
    label(for="peopleRange") 대피 인원
    .range-row
      input#peopleRange(
        type="range"
        :min="PEOPLE_RANGE.min"
        :max="PEOPLE_RANGE.max"
        :step="PEOPLE_RANGE.step"
        :value="peopleCount"
        @input="emitPeople"
      )
      input(
        type="number"
        :min="PEOPLE_RANGE.min"
        :max="PEOPLE_RANGE.max"
        :step="PEOPLE_RANGE.step"
        :value="peopleCount"
        @change="emitPeople"
      )

  .control-group
    label(for="speedRange") 재생 속도
    .range-row
      input#speedRange(
        type="range"
        :min="SPEED_RANGE.min"
        :max="SPEED_RANGE.max"
        :step="SPEED_RANGE.step"
        :value="speed"
        @input="emitSpeed"
      )
      input(
        type="number"
        :min="SPEED_RANGE.min"
        :max="SPEED_RANGE.max"
        :step="SPEED_RANGE.step"
        :value="speed"
        @change="emitSpeed"
      )

  .buttons
    button.primary(:disabled="busy" @click="$emit('play')") 시작
    button(:disabled="busy" @click="$emit('pause')") 일시정지
    button(:disabled="busy" @click="$emit('reset')") 리셋

  .control-group
    label(for="assignmentInput") 이동 프리셋
    textarea#assignmentInput.assignment-input(
      rows="4"
      :value="assignment"
      placeholder="[0,2,1,...]"
      @input="emitAssignment"
    )
    button.primary(:disabled="busy || !assignment.trim()" @click="$emit('test-assignment')") 이동 프리셋 테스트

  .metrics
    .metric
      b 알고리즘
      strong {{ metrics.mode }}
    .metric
      b 진행 시간
      strong {{ metrics.tick }}초
    .metric
      b 대피 성공
      strong {{ metrics.success }}명
    .metric
      b 최대 혼잡
      strong {{ metrics.congestion }}명
    .metric
      b 계산 시간
      strong {{ metrics.computeTimeMs ? formatMs(metrics.computeTimeMs) : "-" }}
</template>

<script setup lang="ts">
import { PEOPLE_RANGE, SPEED_RANGE } from "../lib/constants";
import { clamp, formatMs } from "../lib/utils";
import type { MetricSummary } from "../lib/types";

defineProps<{
  peopleCount: number;
  speed: number;
  busy: boolean;
  metrics: MetricSummary;
  assignment: string;
}>();

const emit = defineEmits<{
  "update:people-count": [value: number];
  "update:speed": [value: number];
  "update:assignment": [value: string];
  play: [];
  pause: [];
  reset: [];
  "test-assignment": [];
}>();

function inputValue(event: Event) {
  return Number((event.target as HTMLInputElement).value);
}

function emitPeople(event: Event) {
  emit(
    "update:people-count",
    clamp(inputValue(event) || PEOPLE_RANGE.min, PEOPLE_RANGE.min, PEOPLE_RANGE.max)
  );
}

function emitSpeed(event: Event) {
  emit(
    "update:speed",
    clamp(inputValue(event) || SPEED_RANGE.default, SPEED_RANGE.min, SPEED_RANGE.max)
  );
}

function emitAssignment(event: Event) {
  emit("update:assignment", (event.target as HTMLTextAreaElement).value);
}
</script>
