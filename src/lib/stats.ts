import { PokemonInput, StatBlock } from "../types";

const DEFAULT_IV = 31;
const DEFAULT_NATURE = "serious";

type NatureEffect = {
  up?: keyof StatBlock;
  down?: keyof StatBlock;
};

export const NATURES: Record<string, NatureEffect> = {
  adamant: { up: "atk", down: "spa" },
  bashful: {},
  bold: { up: "def", down: "atk" },
  brave: { up: "atk", down: "spe" },
  calm: { up: "spd", down: "atk" },
  careful: { up: "spd", down: "spa" },
  docile: {},
  gentle: { up: "spd", down: "def" },
  hardy: {},
  hasty: { up: "spe", down: "def" },
  impish: { up: "def", down: "spa" },
  jolly: { up: "spe", down: "spa" },
  lax: { up: "def", down: "spd" },
  lonely: { up: "atk", down: "def" },
  mild: { up: "spa", down: "def" },
  modest: { up: "spa", down: "atk" },
  naive: { up: "spe", down: "spd" },
  naughty: { up: "atk", down: "spd" },
  quiet: { up: "spa", down: "spe" },
  quirky: {},
  rash: { up: "spa", down: "spd" },
  relaxed: { up: "def", down: "spe" },
  sassy: { up: "spd", down: "spe" },
  serious: {},
  timid: { up: "spe", down: "atk" },
};

export function getNatureEffect(nature: string): NatureEffect {
  return NATURES[nature] ?? {};
}

function normalizeLevel(level: number): number {
  if (!Number.isFinite(level) || level <= 0) return 1;
  return Math.floor(level);
}

export function calculateStat(
  base: number,
  statPoint: number,
  iv: number,
  level: number,
  isHp: boolean,
  natureMultiplier = 1
): number {
  const safeBase = Number.isFinite(base) ? Math.max(0, Math.floor(base)) : 0;
  const safeStatPoint = Number.isFinite(statPoint)
    ? Math.min(32, Math.max(0, Math.floor(statPoint)))
    : 0;
  const safeIv = Number.isFinite(iv)
    ? Math.min(31, Math.max(0, Math.floor(iv)))
    : DEFAULT_IV;
  const safeLevel = normalizeLevel(level);
  const baseTerm = 2 * safeBase + safeIv;
  if (isHp) {
    const baseHp = Math.floor((baseTerm * safeLevel) / 100) + safeLevel + 10;
    return baseHp + safeStatPoint;
  }
  const raw = Math.floor((baseTerm * safeLevel) / 100) + 5;
  const withStatPoint = raw + safeStatPoint;
  return Math.floor(withStatPoint * natureMultiplier);
}

export function calculateStats(pokemon: PokemonInput): StatBlock {
  const level = pokemon.level ?? 50;
  const stats = pokemon.stats;
  const evs = pokemon.evs ?? {
    hp: 0,
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
  };
  const ivs = pokemon.ivs ?? {
    hp: DEFAULT_IV,
    atk: DEFAULT_IV,
    def: DEFAULT_IV,
    spa: DEFAULT_IV,
    spd: DEFAULT_IV,
    spe: DEFAULT_IV,
  };
  const natureKey = pokemon.nature ?? DEFAULT_NATURE;
  const effect = getNatureEffect(natureKey);
  const natureMultiplier = (stat: keyof StatBlock) => {
    if (stat === "hp") return 1;
    if (effect.up === stat) return 1.1;
    if (effect.down === stat) return 0.9;
    return 1;
  };

  return {
    hp: calculateStat(stats.hp, evs.hp, ivs.hp, level, true, 1),
    atk: calculateStat(
      stats.atk,
      evs.atk,
      ivs.atk,
      level,
      false,
      natureMultiplier("atk")
    ),
    def: calculateStat(
      stats.def,
      evs.def,
      ivs.def,
      level,
      false,
      natureMultiplier("def")
    ),
    spa: calculateStat(
      stats.spa,
      evs.spa,
      ivs.spa,
      level,
      false,
      natureMultiplier("spa")
    ),
    spd: calculateStat(
      stats.spd,
      evs.spd,
      ivs.spd,
      level,
      false,
      natureMultiplier("spd")
    ),
    spe: calculateStat(
      stats.spe,
      evs.spe,
      ivs.spe,
      level,
      false,
      natureMultiplier("spe")
    ),
  };
}
