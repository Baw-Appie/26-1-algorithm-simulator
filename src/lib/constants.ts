export const FIRE_DELAY = 7;
export const MAX_TICKS = 230;

// 방 구역 지정: (x1, y1)에서 (x2, y2)까지, 양 끝 포함
export const ROOM_AREAS = [
  [8, 11, 21, 16],
  [2, 2, 8, 6],
  [10, 2, 14, 6],
  [17, 2, 27, 6],
  [2, 12, 7, 16],
  [23, 12, 27, 16]
] as const;

// 복도 구역 지정: (x1, y1)에서 (x2, y2)까지, 양 끝 포함
export const CORRIDOR_AREAS = [
  [1, 8, 28, 10],
  [15, 0, 15, 10],
  [6, 6, 6, 8],
  [12, 6, 12, 8],
  [24, 6, 24, 8],
  [6, 10, 6, 12],
  [24, 10, 24, 12]
] as const;

// 화재 시작점 지정
export const FIRE_START_POINTS = [
  [5, 16],
  [26, 4]
] as const;

// 대피 인원 입력 UI와 시나리오 초기 인원 기준
export const PEOPLE_RANGE = {
  min: 50,
  max: 300,
  step: 10,
  default: 200
} as const;

// 시뮬레이션과 GA 진화 재생 속도 입력 범위
export const SPEED_RANGE = {
  min: 4,
  max: 48,
  step: 2,
  default: 24
} as const;

export const RNG_SEEDS = {
  // 대피자 시작 위치와 인원 분포 생성용 기본 시드
  // scenario: Math.floor(Math.random() * 1000000),
  scenario: 123456,
  // 인원 수별로 다른 시나리오를 만들기 위한 배율
  // scenarioPeopleFactor: Math.floor(Math.random() * 100),
  scenarioPeopleFactor: 42,
  // GA 초기 개체군, 선택, 교차, 돌연변이용 기본 시드
  // ga: Math.floor(Math.random() * 100000),
  ga: 654321,
  // SA 이웃 해 생성과 확률 수락 판단용 기본 시드
  // sa: Math.floor(Math.random() * 100000)
  sa: 111222
} as const;

// GA 탐색 규모, 엘리트 보존, 선택, 돌연변이 튜닝값
export const GA_CONFIG = {
  populationSize: 24,
  generations: 36,
  eliteCount: 2,
  tournamentExtraPicks: 2,
  highMutationUntilGeneration: 10,
  highMutationRate: 0.035,
  mutationRate: 0.018
} as const;

// SA 반복 횟수, 온도 감소, 이웃 해 생성 튜닝값
export const SA_CONFIG = {
  iterations: 620,
  initialTemperature: 82,
  coolingRate: 0.987,
  temperatureFloor: 0.2,
  neighborBaseChanges: 1,
  neighborRandomBase: 2,
  neighborTemperatureDivisor: 8
} as const;

// 시뮬레이션 평가 점수에서 실패와 혼잡도를 벌점화하는 가중치
export const SCORE_WEIGHTS = {
  failedPerson: 420,
  maxCongestion: 1.8,
  congestionSum: 0.018
} as const;

// 최단경로 계산 시 화재가 가까운 경로에 추가하는 위험 비용
export const ROUTE_RISK = {
  fireTimeWindow: 44,
  weight: 0.05
} as const;

// 화면 재생, 계산 상태 갱신, GA 진화 단계 전환 타이밍
export const PLAYBACK_CONFIG = {
  frameMs: 1000,
  statusDelayMs: 30,
  evolutionBaseInterval: 1100,
  evolutionSpeedFactor: 15,
  minEvolutionInterval: 220,
  maxEvolutionInterval: 900
} as const;

export const EXIT_ORDER = ["north", "west", "east"] as const;
export type ExitId = (typeof EXIT_ORDER)[number];

export const EXIT_INFO = {
  north: { name: "북쪽", color: "#178a54" },
  west: { name: "서쪽", color: "#2767b1" },
  east: { name: "동쪽", color: "#b25a24" }
} as const satisfies Record<ExitId, { name: string; color: string }>;

export const COLORS = {
  wall: "#242826",
  floor: "#eef1ec",
  corridor: "#dde8e5",
  exit: "#178a54",
  fire: "#e6472e",
  smoke: "rgba(213, 155, 45, 0.78)",
  person: "#2767b1"
};

export const MODE_LABELS = {
  baseline: "최단경로",
  ga: "GA",
  sa: "SA"
} as const;

export const EVOLUTION_MODE_LABELS = {
  ga: "GA",
  earlystopga: "EarlyStop GA"
} as const;

export type AlgorithmMode = keyof typeof MODE_LABELS;
export type ResultMode = Exclude<AlgorithmMode, "ga">;
export type GAEvolutionMode = keyof typeof EVOLUTION_MODE_LABELS;
