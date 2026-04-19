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

const CHAMPIONS_ITEM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "bright-powder", label: "ひかりのこな" },
  { value: "white-herb", label: "しろいハーブ" },
  { value: "quick-claw", label: "せんせいのツメ" },
  { value: "mental-herb", label: "メンタルハーブ" },
  { value: "kings-rock", label: "おうじゃのしるし" },
  { value: "silver-powder", label: "ぎんのこな" },
  { value: "focus-band", label: "きあいのハチマキ" },
  { value: "scope-lens", label: "ピントレンズ" },
  { value: "metal-coat", label: "メタルコート" },
  { value: "leftovers", label: "たべのこし" },
  { value: "soft-sand", label: "やわらかいすな" },
  { value: "hard-stone", label: "かたいいし" },
  { value: "miracle-seed", label: "きせきのタネ" },
  { value: "black-glasses", label: "くろいメガネ" },
  { value: "black-belt", label: "くろおび" },
  { value: "magnet", label: "じしゃく" },
  { value: "mystic-water", label: "しんぴのしずく" },
  { value: "sharp-beak", label: "するどいくちばし" },
  { value: "poison-barb", label: "どくバリ" },
  { value: "never-melt-ice", label: "とけないこおり" },
  { value: "spell-tag", label: "のろいのおふだ" },
  { value: "twisted-spoon", label: "まがったスプーン" },
  { value: "charcoal", label: "もくたん" },
  { value: "dragon-fang", label: "りゅうのキバ" },
  { value: "silk-scarf", label: "シルクのスカーフ" },
  { value: "shell-bell", label: "かいがらのすず" },
  { value: "focus-sash", label: "きあいのタスキ" },
  { value: "choice-scarf", label: "こだわりスカーフ" },
  { value: "cheri-berry", label: "クラボのみ" },
  { value: "chesto-berry", label: "カゴのみ" },
  { value: "pecha-berry", label: "モモンのみ" },
  { value: "rawst-berry", label: "チーゴのみ" },
  { value: "aspear-berry", label: "ナナシのみ" },
  { value: "leppa-berry", label: "ヒメリのみ" },
  { value: "oran-berry", label: "オレンのみ" },
  { value: "persim-berry", label: "キーのみ" },
  { value: "lum-berry", label: "ラムのみ" },
  { value: "sitrus-berry", label: "オボンのみ" },
  { value: "occa-berry", label: "オッカのみ" },
  { value: "passho-berry", label: "イトケのみ" },
  { value: "wacan-berry", label: "ソクノのみ" },
  { value: "rindo-berry", label: "リンドのみ" },
  { value: "yache-berry", label: "ヤチェのみ" },
  { value: "chople-berry", label: "ヨプのみ" },
  { value: "kebia-berry", label: "ビアーのみ" },
  { value: "shuca-berry", label: "シュカのみ" },
  { value: "coba-berry", label: "バコウのみ" },
  { value: "payapa-berry", label: "ウタンのみ" },
  { value: "tanga-berry", label: "タンガのみ" },
  { value: "charti-berry", label: "ヨロギのみ" },
  { value: "kasib-berry", label: "カシブのみ" },
  { value: "haban-berry", label: "ハバンのみ" },
  { value: "colbur-berry", label: "ナモのみ" },
  { value: "babiri-berry", label: "リリバのみ" },
  { value: "roseli-berry", label: "ロゼルのみ" },
  { value: "hoz-berry", label: "ホズのみ" },
  { value: "fairy-feather", label: "ようせいのハネ" },
  { value: "light-ball", label: "でんきだま" },
  { value: "feraligatrite", label: "オーダイルナイト" },
  { value: "meganiumite", label: "メガニウムナイト" },
  { value: "emboarite", label: "エンブオナイト" },
  { value: "beedrillite", label: "スピアナイト" },
  { value: "ampharosite", label: "デンリュウナイト" },
  { value: "starmite", label: "スターミナイト" },
  { value: "victreebelite", label: "ウツボットナイト" },
  { value: "altarianite", label: "チルタリスナイト" },
  { value: "banettite", label: "ジュペッタナイト" },
  { value: "cameruptite", label: "バクーダナイト" },
  { value: "absolite", label: "アブソルナイト" },
  { value: "slowbronite", label: "ヤドランナイト" },
  { value: "dragoniteite", label: "カイリュナイト" },
  { value: "froslassite", label: "ユキメノコナイト" },
  { value: "hawluchanite", label: "ルチャブルナイト" },
  { value: "tyranitarite", label: "バンギラスナイト" },
];

export const ITEM_OPTIONS = CHAMPIONS_ITEM_OPTIONS;

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
