import { MoveInfo } from "../types";

export type ItemEffect =
  | {
      id: string;
      label: string;
      type: "attack";
      stat: "atk" | "spa";
      multiplier: number;
    }
  | {
      id: string;
      label: string;
      type: "speed";
      multiplier: number;
    }
  | {
      id: string;
      label: string;
      type: "damage";
      multiplier: number;
      appliesTo?: "physical" | "special" | "all";
    }
  | {
      id: string;
      label: string;
      type: "defense";
      stat: "def" | "spd" | "both";
      multiplier: number;
    }
  | {
      id: string;
      label: string;
      type: "damage-reduction";
      moveType: string;
      multiplier: number;
      requiresSuperEffective?: boolean;
    }
  | {
      id: string;
      label: string;
      type: "type-boost";
      moveType: string;
      multiplier: number;
    }
  | {
      id: string;
      label: string;
      type: "expert-belt";
      multiplier: number;
    };

const ITEM_EFFECTS: ItemEffect[] = [
  { id: "choice-band", label: "こだわりハチマキ", type: "attack", stat: "atk", multiplier: 1.5 },
  { id: "choice-specs", label: "こだわりメガネ", type: "attack", stat: "spa", multiplier: 1.5 },
  { id: "choice-scarf", label: "こだわりスカーフ", type: "speed", multiplier: 1.5 },
  { id: "life-orb", label: "いのちのたま", type: "damage", multiplier: 1.3, appliesTo: "all" },
  { id: "muscle-band", label: "ちからのハチマキ", type: "damage", multiplier: 1.1, appliesTo: "physical" },
  { id: "wise-glasses", label: "ものしりメガネ", type: "damage", multiplier: 1.1, appliesTo: "special" },
  { id: "expert-belt", label: "たつじんのおび", type: "expert-belt", multiplier: 1.2 },
  { id: "assault-vest", label: "とつげきチョッキ", type: "defense", stat: "spd", multiplier: 1.5 },
  { id: "eviolite", label: "しんかのきせき", type: "defense", stat: "both", multiplier: 1.5 },
  {
    id: "occa-berry",
    label: "オッカのみ",
    type: "damage-reduction",
    moveType: "fire",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "passho-berry",
    label: "イトケのみ",
    type: "damage-reduction",
    moveType: "water",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "wacan-berry",
    label: "ソクノのみ",
    type: "damage-reduction",
    moveType: "electric",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "rindo-berry",
    label: "リンドのみ",
    type: "damage-reduction",
    moveType: "grass",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "yache-berry",
    label: "ヤチェのみ",
    type: "damage-reduction",
    moveType: "ice",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "chople-berry",
    label: "ヨプのみ",
    type: "damage-reduction",
    moveType: "fighting",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "kebia-berry",
    label: "ビアーのみ",
    type: "damage-reduction",
    moveType: "poison",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "shuca-berry",
    label: "シュカのみ",
    type: "damage-reduction",
    moveType: "ground",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "coba-berry",
    label: "バコウのみ",
    type: "damage-reduction",
    moveType: "flying",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "payapa-berry",
    label: "ウタンのみ",
    type: "damage-reduction",
    moveType: "psychic",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "tanga-berry",
    label: "タンガのみ",
    type: "damage-reduction",
    moveType: "bug",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "charti-berry",
    label: "ヨロギのみ",
    type: "damage-reduction",
    moveType: "rock",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "kasib-berry",
    label: "カシブのみ",
    type: "damage-reduction",
    moveType: "ghost",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "haban-berry",
    label: "ハバンのみ",
    type: "damage-reduction",
    moveType: "dragon",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "colbur-berry",
    label: "ナモのみ",
    type: "damage-reduction",
    moveType: "dark",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "babiri-berry",
    label: "リリバのみ",
    type: "damage-reduction",
    moveType: "steel",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  {
    id: "roseli-berry",
    label: "ロゼルのみ",
    type: "damage-reduction",
    moveType: "fairy",
    multiplier: 0.5,
    requiresSuperEffective: true,
  },
  { id: "charcoal", label: "もくたん", type: "type-boost", moveType: "fire", multiplier: 1.2 },
  { id: "mystic-water", label: "しんぴのしずく", type: "type-boost", moveType: "water", multiplier: 1.2 },
  { id: "magnet", label: "じしゃく", type: "type-boost", moveType: "electric", multiplier: 1.2 },
  { id: "miracle-seed", label: "きせきのタネ", type: "type-boost", moveType: "grass", multiplier: 1.2 },
  { id: "never-melt-ice", label: "とけないこおり", type: "type-boost", moveType: "ice", multiplier: 1.2 },
  { id: "black-belt", label: "くろおび", type: "type-boost", moveType: "fighting", multiplier: 1.2 },
  { id: "soft-sand", label: "やわらかいすな", type: "type-boost", moveType: "ground", multiplier: 1.2 },
  { id: "sharp-beak", label: "するどいくちばし", type: "type-boost", moveType: "flying", multiplier: 1.2 },
  { id: "dragon-fang", label: "りゅうのキバ", type: "type-boost", moveType: "dragon", multiplier: 1.2 },
  { id: "poison-barb", label: "どくバリ", type: "type-boost", moveType: "poison", multiplier: 1.2 },
  { id: "spell-tag", label: "のろいのおふだ", type: "type-boost", moveType: "ghost", multiplier: 1.2 },
  { id: "twisted-spoon", label: "まがったスプーン", type: "type-boost", moveType: "psychic", multiplier: 1.2 },
  { id: "silver-powder", label: "ぎんのこな", type: "type-boost", moveType: "bug", multiplier: 1.2 },
  { id: "hard-stone", label: "かたいいし", type: "type-boost", moveType: "rock", multiplier: 1.2 },
  { id: "metal-coat", label: "メタルコート", type: "type-boost", moveType: "steel", multiplier: 1.2 },
  { id: "silk-scarf", label: "シルクのスカーフ", type: "type-boost", moveType: "normal", multiplier: 1.2 },
  { id: "black-glasses", label: "くろいメガネ", type: "type-boost", moveType: "dark", multiplier: 1.2 },
  { id: "pixie-plate", label: "せいれいプレート", type: "type-boost", moveType: "fairy", multiplier: 1.2 },
];

export const ITEM_OPTIONS = ITEM_EFFECTS.map((item) => ({
  value: item.id,
  label: item.label,
}));

export function getItemEffect(id: string | undefined): ItemEffect | null {
  if (!id) return null;
  return ITEM_EFFECTS.find((item) => item.id === id) ?? null;
}

export function getAttackMultiplier(
  itemId: string | undefined,
  move: MoveInfo
): number {
  const effect = getItemEffect(itemId);
  if (!effect || effect.type !== "attack") return 1;
  if (effect.stat === "atk" && move.damageClass === "physical") return effect.multiplier;
  if (effect.stat === "spa" && move.damageClass === "special") return effect.multiplier;
  return 1;
}

export function getSpeedMultiplier(itemId: string | undefined): number {
  const effect = getItemEffect(itemId);
  if (!effect || effect.type !== "speed") return 1;
  return effect.multiplier;
}

export function getDamageMultiplier(
  itemId: string | undefined,
  move: MoveInfo,
  effectiveness: number
): number {
  const effect = getItemEffect(itemId);
  if (!effect) return 1;
  if (effect.type === "damage") {
    if (effect.appliesTo === "all") return effect.multiplier;
    if (effect.appliesTo === move.damageClass) return effect.multiplier;
    return 1;
  }
  if (effect.type === "type-boost") {
    return move.type === effect.moveType ? effect.multiplier : 1;
  }
  if (effect.type === "expert-belt") {
    return effectiveness > 1 ? effect.multiplier : 1;
  }
  return 1;
}

export function getDefenseMultiplier(
  itemId: string | undefined,
  move: MoveInfo
): number {
  const effect = getItemEffect(itemId);
  if (!effect || effect.type !== "defense") return 1;
  if (move.damageClass === "physical" && (effect.stat === "def" || effect.stat === "both")) {
    return effect.multiplier;
  }
  if (move.damageClass === "special" && (effect.stat === "spd" || effect.stat === "both")) {
    return effect.multiplier;
  }
  return 1;
}

export function getDefenderDamageMultiplier(
  itemId: string | undefined,
  move: MoveInfo,
  effectiveness: number
): number {
  const effect = getItemEffect(itemId);
  if (!effect || effect.type !== "damage-reduction") return 1;
  if (effect.moveType !== move.type) return 1;
  if (effect.requiresSuperEffective && effectiveness <= 1) return 1;
  return effect.multiplier;
}
