import { DamageResult, MoveInfo, PokemonInput } from "../types";
import { calculateStats } from "./stats";
import { getEffectiveness } from "./typeChart";
import {
  getAttackMultiplier,
  getDamageMultiplier,
  getDefenseMultiplier,
  getDefenderDamageMultiplier,
} from "./items";

function clampPower(power: number | null): number {
  if (!power || power < 0) return 0;
  return power;
}

export function calculateDamage(
  attacker: PokemonInput,
  defender: PokemonInput,
  move: MoveInfo
): DamageResult {
  const power = clampPower(move.power);
  const usePhysical = move.damageClass !== "special";
  const attackerStats = calculateStats(attacker);
  const defenderStats = calculateStats(defender);
  const attackMultiplier = getAttackMultiplier(attacker.item, move);
  const atk = Math.floor((usePhysical ? attackerStats.atk : attackerStats.spa) * attackMultiplier);
  const defenseMultiplier = getDefenseMultiplier(defender.item, move);
  const def = Math.floor((usePhysical ? defenderStats.def : defenderStats.spd) * defenseMultiplier);
  const level = attacker.level || 50;

  const base =
    Math.floor(
      Math.floor(
        Math.floor((2 * level) / 5 + 2) * power * (atk || 1) / (def || 1)
      ) / 50
    ) + 2;

  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const effectiveness = getEffectiveness(move.type, defender.types);
  const itemMultiplier = getDamageMultiplier(attacker.item, move, effectiveness);
  const defenderMultiplier = getDefenderDamageMultiplier(defender.item, move, effectiveness);
  const min = Math.floor(base * 0.85 * stab * effectiveness * itemMultiplier * defenderMultiplier);
  const max = Math.floor(base * 1.0 * stab * effectiveness * itemMultiplier * defenderMultiplier);

  return {
    min,
    max,
    stab,
    effectiveness,
    usedStat: usePhysical ? "atk" : "spa",
    usedDef: usePhysical ? "def" : "spd",
    basePower: power,
  };
}
