import { createRouter, createWebHistory } from "vue-router";
import AlgorithmPage from "../pages/AlgorithmPage.vue";
import GAEvolutionPage from "../pages/GAEvolutionPage.vue";
import HomePage from "../pages/HomePage.vue";

const routes = [
  { path: "/", name: "home", component: HomePage, meta: { label: "테스트" } },
  {
    path: "/baseline",
    name: "baseline",
    component: AlgorithmPage,
    props: { mode: "baseline" },
    meta: { label: "최단경로" }
  },
  {
    path: "/ga-evolution",
    name: "ga-evolution",
    component: GAEvolutionPage,
    meta: { label: "GA 진화" }
  },
  {
    path: "/sa",
    name: "sa",
    component: AlgorithmPage,
    props: { mode: "sa" },
    meta: { label: "SA" }
  },
  { path: "/:pathMatch(.*)*", redirect: "/" }
];

export const navigationItems = routes
  .filter((r) => r.meta?.label)
  .map((r) => ({ to: r.path, label: r.meta!.label }));

export const router = createRouter({
  history: createWebHistory(),
  routes
});
