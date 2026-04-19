export type StatBlock = {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
};

export type PokemonInput = {
  name: string;
  displayName?: string;
  level: number;
  types: string[];
  stats: StatBlock;
  evs: StatBlock;
  ivs: StatBlock;
  nature: string;
  item?: string;
  moves: string[];
  notes?: string;
};

export type MoveInfo = {
  name: string;
  power: number | null;
  type: string;
  damageClass: "physical" | "special" | "status" | "";
};

export type DamageResult = {
  min: number;
  max: number;
  stab: number;
  effectiveness: number;
  usedStat: "atk" | "spa";
  usedDef: "def" | "spd";
  basePower: number;
};

export type Party = {
  id: string;
  name: string;
  members: PokemonInput[];
  createdAt: string;
};

export type LogEntry = {
  id: string;
  createdAt: string;
  source: "damage" | "party";
  pokemon: PokemonInput[];
  details: string;
};

export type SavedPokemon = {
  id: string;
  label: string;
  memo?: string;
  pokemon: PokemonInput;
  createdAt: string;
};

export type SavedDamageCalc = {
  id: string;
  createdAt: string;
  attackerName: string;
  defenderName: string;
  moveName: string;
  hitCount: number;
  min: number;
  max: number;
  defenderHp: number;
};
