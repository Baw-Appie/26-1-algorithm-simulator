<template lang="pug">
main
  header
    .title-block
      h1 화재 대피 경로 최적화
      nav.view-tabs(aria-label="화면")
        RouterLink(
          v-for="item in navigationItems"
          :key="item.to"
          :to="item.to"
        ) {{ item.label }}
    .status {{ status }}

  RouterView
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useEvacuationOptimizer } from "./composables/useEvacuationOptimizer";
import { navigationItems } from "./router";
import type { ResultMode } from "./lib/constants";

const route = useRoute();
const { copyStatus, showAlgorithmResult, showEvolutionResult, status, stopTimers } =
  useEvacuationOptimizer();

const pathModes: Record<string, ResultMode> = {
  "/baseline": "baseline",
  "/sa": "sa"
};

watch(
  () => route.path,
  (path) => {
    stopTimers();
    copyStatus.value = "";
    if (path === "/ga-evolution") {
      showEvolutionResult();
      return;
    }
    const mode = pathModes[path];
    if (mode) showAlgorithmResult(mode);
  },
  { immediate: true }
);

onBeforeUnmount(stopTimers);
</script>
