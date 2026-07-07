// Shared constants and state shapes for Government Builder.

export const MODES = {
  firstTerm: {
    id: "firstTerm",
    label: "First Term",
    turnBudget: 32,
    crisisChance: 0.3,
    startingTreasury: 300,
    startingApproval: 65,
    startingStability: 65,
  },
  secondTerm: {
    id: "secondTerm",
    label: "Second Term",
    turnBudget: 48,
    crisisChance: 0.4,
    startingTreasury: 220,
    startingApproval: 60,
    startingStability: 60,
  },
  legacy: {
    id: "legacy",
    label: "Legacy Run",
    turnBudget: 64,
    crisisChance: 0.5,
    startingTreasury: 160,
    startingApproval: 55,
    startingStability: 55,
  },
  endless: {
    id: "endless",
    label: "Endless Presidency",
    turnBudget: null,
    crisisChance: 0.35,
    startingTreasury: 220,
    startingApproval: 60,
    startingStability: 60,
  },
};

export const SCORING = {
  turnSurvivedPoints: 40,
  approvalPoints: 5,
  stabilityPoints: 5,
  treasuryPoints: 0.4,
  goldenAgeStreakPoints: 20,
  crisisResolvedPoints: 20,
  goldenAgeApprovalThreshold: 70,
  goldenAgeStabilityThreshold: 55,
  goldenAgeStreakToActivate: 3,
  goldenAgeMultiplier: 1.5,
};

// Thresholds that turn a final Approval/Stability reading into one of the
// named endings in engine.js's determineEnding(). Kept separate from
// SCORING since they drive narrative outcomes, not point totals.
export const ENDING_THRESHOLDS = {
  thriving: 75,
  healthy: 50,
  fragile: 35,
};

// Each policy is a dial with three stances. Switching stances changes what
// the nation generates starting next turn -- there's no immediate one-time
// cost, so a change is a bet on the future, not a snap judgment.
export const POLICIES = [
  {
    id: "taxation",
    label: "Taxation",
    stances: [
      { id: "low", label: "Low Taxes", effects: { treasuryPerTurn: -6, approvalPerTurn: 2 } },
      { id: "balanced", label: "Balanced Taxes", effects: {} },
      { id: "high", label: "High Taxes", effects: { treasuryPerTurn: 10, approvalPerTurn: -3 } },
    ],
  },
  {
    id: "publicPrograms",
    label: "Public Programs",
    stances: [
      { id: "low", label: "Minimal Programs", effects: { treasuryPerTurn: 5, approvalPerTurn: -2, stabilityPerTurn: -1 } },
      { id: "balanced", label: "Standard Programs", effects: {} },
      { id: "high", label: "Expanded Programs", effects: { treasuryPerTurn: -7, approvalPerTurn: 3, stabilityPerTurn: 1 } },
    ],
  },
  {
    id: "defense",
    label: "Defense Spending",
    stances: [
      { id: "low", label: "Minimal Defense", effects: { treasuryPerTurn: 4, stabilityPerTurn: -2 } },
      { id: "balanced", label: "Standard Defense", effects: {} },
      { id: "high", label: "Strong Defense", effects: { treasuryPerTurn: -6, stabilityPerTurn: 3 } },
    ],
  },
  {
    id: "civilLiberties",
    label: "Civil Liberties",
    stances: [
      { id: "low", label: "Restricted", effects: { approvalPerTurn: -3, stabilityPerTurn: 2 } },
      { id: "balanced", label: "Balanced", effects: {} },
      { id: "high", label: "Open", effects: { approvalPerTurn: 3, stabilityPerTurn: -1 } },
    ],
  },
];

// The Power-Up Shop: permanent, stacking purchases with an escalating cost
// per level (baseCost * costGrowth^level), the same shape as a typical
// incremental-game shop. diplomaticCorps and emergencyReserve don't touch
// per-turn generation -- they change how crises play out (see engine.js).
export const UPGRADES = [
  {
    id: "centralBank",
    label: "Central Bank",
    icon: "pi-column",
    description: "Generates more Treasury every turn.",
    baseCost: 100,
    costGrowth: 1.45,
    effects: { treasuryPerTurn: 4 },
  },
  {
    id: "publicSchools",
    label: "Public Schools",
    icon: "pi-chalkboard",
    description: "Generates more Approval every turn.",
    baseCost: 110,
    costGrowth: 1.45,
    effects: { approvalPerTurn: 3 },
  },
  {
    id: "nationalGuard",
    label: "National Guard",
    icon: "pi-gear",
    description: "Generates more Stability every turn.",
    baseCost: 110,
    costGrowth: 1.45,
    effects: { stabilityPerTurn: 3 },
  },
  {
    id: "diplomaticCorps",
    label: "Diplomatic Corps",
    icon: "pi-scroll",
    description: "Softens the impact of every crisis you face.",
    baseCost: 160,
    costGrowth: 1.55,
    effects: { crisisResilience: 0.08 },
  },
  {
    id: "emergencyReserve",
    label: "Emergency Reserve",
    icon: "pi-shield",
    description: "Banks a shield that cancels a crisis's losses once.",
    baseCost: 130,
    costGrowth: 1.35,
    effects: { shields: 1 },
  },
];

export function createInitialGameState() {
  return {
    screen: "menu",
    modeId: "firstTerm",
    teacherMode: false,
    round: null,
    settings: { soundEnabled: true, musicEnabled: true },
  };
}

export function defaultPolicyStances() {
  return POLICIES.reduce((stances, policy) => {
    stances[policy.id] = "balanced";
    return stances;
  }, {});
}

export function createRoundState({ modeId, teacherMode }) {
  const mode = MODES[modeId];
  return {
    modeId,
    teacherMode,
    turn: 0,
    turnBudget: mode.turnBudget,
    treasury: mode.startingTreasury,
    approval: mode.startingApproval,
    stability: mode.startingStability,
    policyStances: defaultPolicyStances(),
    upgradeLevels: UPGRADES.reduce((levels, upgrade) => {
      levels[upgrade.id] = 0;
      return levels;
    }, {}),
    shields: 0,
    goldenAgeStreak: 0,
    goldenAgeActive: false,
    bestGoldenAgeStreak: 0,
    crisesResolved: 0,
    activeCrisis: null,
    recentCrisisIds: [],
    lastTurnSummary: null,
    status: "playing",
    score: 0,
  };
}

export function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
