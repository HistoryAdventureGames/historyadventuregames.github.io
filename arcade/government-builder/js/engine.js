// Pure game-rule functions: turn resolution, crisis outcomes, upgrade
// costs, and scoring. Kept free of DOM/state mutation (beyond the round
// object passed in) so the numbers are easy to reason about on their own.
import { POLICIES, UPGRADES, SCORING } from "./state.js";

export function computeGeneration(round) {
  const totals = { treasuryPerTurn: 0, approvalPerTurn: 0, stabilityPerTurn: 0 };

  POLICIES.forEach((policy) => {
    const stance = policy.stances.find((candidate) => candidate.id === round.policyStances[policy.id]);
    addEffects(totals, stance && stance.effects);
  });

  UPGRADES.forEach((upgrade) => {
    const level = round.upgradeLevels[upgrade.id] || 0;
    if (level > 0) addEffects(totals, scalePerTurnEffects(upgrade.effects, level));
  });

  if (round.goldenAgeActive) {
    totals.treasuryPerTurn = Math.round(totals.treasuryPerTurn * SCORING.goldenAgeMultiplier);
  }

  return totals;
}

export function applyGeneration(round) {
  const generation = computeGeneration(round);
  round.treasury = Math.max(0, round.treasury + generation.treasuryPerTurn);
  round.approval = clamp(round.approval + generation.approvalPerTurn, 0, 100);
  round.stability = clamp(round.stability + generation.stabilityPerTurn, 0, 100);
  return generation;
}

// A streak of turns spent above both thresholds unlocks a Treasury
// multiplier -- the reward for keeping a nation genuinely well-run, not
// just one good turn. Falling below either threshold resets the streak.
export function updateGoldenAge(round) {
  const qualifies = round.approval >= SCORING.goldenAgeApprovalThreshold && round.stability >= SCORING.goldenAgeStabilityThreshold;
  round.goldenAgeStreak = qualifies ? round.goldenAgeStreak + 1 : 0;
  round.bestGoldenAgeStreak = Math.max(round.bestGoldenAgeStreak, round.goldenAgeStreak);

  const wasActive = round.goldenAgeActive;
  round.goldenAgeActive = round.goldenAgeStreak >= SCORING.goldenAgeStreakToActivate;
  return { justActivated: round.goldenAgeActive && !wasActive, justLapsed: wasActive && !round.goldenAgeActive };
}

export function checkGameOver(round) {
  if (round.approval <= 0 || round.stability <= 0) return "collapsed";
  if (round.turnBudget != null && round.turn >= round.turnBudget) return "completed";
  return null;
}

export function upgradeCost(upgrade, level) {
  return Math.round(upgrade.baseCost * upgrade.costGrowth ** level);
}

export function purchaseUpgrade(round, upgradeId) {
  const upgrade = UPGRADES.find((candidate) => candidate.id === upgradeId);
  if (!upgrade) return false;

  const level = round.upgradeLevels[upgradeId] || 0;
  const cost = upgradeCost(upgrade, level);
  if (round.treasury < cost) return false;

  round.treasury -= cost;
  round.upgradeLevels[upgradeId] = level + 1;
  if (upgrade.effects.shields) round.shields += upgrade.effects.shields;
  return true;
}

// Crisis resolution: Diplomatic Corps softens every crisis's losses a
// little, a banked shield cancels them outright (once), and an option's own
// `favoredBy` bonus rewards a matching policy stance or upgrade with a
// better result than the preview promised -- the same choice plays out
// differently depending on how the nation has actually been run.
export function resolveCrisisOption(round, crisis, optionIndex) {
  const option = crisis.options[optionIndex];
  const resilience = Math.min(0.4, (round.upgradeLevels.diplomaticCorps || 0) * 0.08);
  const favored = isFavored(round, option.favoredBy);
  const usedShield = round.shields > 0;

  const deltas = {};
  Object.entries(option.effects || {}).forEach(([resource, value]) => {
    let next = value;
    if (favored) next = next < 0 ? next * 0.6 : next * 1.25;
    if (next < 0) {
      next *= 1 - resilience;
      if (usedShield) next = 0;
    }
    deltas[resource] = Math.round(next);
  });

  if (usedShield) round.shields -= 1;

  round.treasury = Math.max(0, round.treasury + (deltas.treasury || 0));
  round.approval = clamp(round.approval + (deltas.approval || 0), 0, 100);
  round.stability = clamp(round.stability + (deltas.stability || 0), 0, 100);
  round.crisesResolved += 1;

  const netOutcome = (deltas.treasury || 0) / 10 + (deltas.approval || 0) + (deltas.stability || 0);
  return { deltas, favored, usedShield, resilience, isGoodOutcome: netOutcome >= 0 };
}

export function computeScore(round) {
  const base =
    round.turn * SCORING.turnSurvivedPoints +
    round.approval * SCORING.approvalPoints +
    round.stability * SCORING.stabilityPoints +
    round.treasury * SCORING.treasuryPoints +
    round.bestGoldenAgeStreak * SCORING.goldenAgeStreakPoints +
    round.crisesResolved * SCORING.crisisResolvedPoints;
  return Math.max(0, Math.round(base));
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function addEffects(totals, effects) {
  if (!effects) return;
  if (effects.treasuryPerTurn) totals.treasuryPerTurn += effects.treasuryPerTurn;
  if (effects.approvalPerTurn) totals.approvalPerTurn += effects.approvalPerTurn;
  if (effects.stabilityPerTurn) totals.stabilityPerTurn += effects.stabilityPerTurn;
}

function scalePerTurnEffects(effects, level) {
  const scaled = {};
  Object.keys(effects).forEach((key) => {
    if (key.endsWith("PerTurn")) scaled[key] = effects[key] * level;
  });
  return scaled;
}

function isFavored(round, favoredBy) {
  if (!favoredBy) return false;
  if (favoredBy.upgrade && (round.upgradeLevels[favoredBy.upgrade] || 0) > 0) return true;
  if (favoredBy.policy && round.policyStances[favoredBy.policy.id] === favoredBy.policy.stance) return true;
  return false;
}
