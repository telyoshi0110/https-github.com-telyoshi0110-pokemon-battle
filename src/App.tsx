import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { calculateDamage } from "./lib/damage";
import { ITEM_OPTIONS, getSpeedMultiplier } from "./lib/items";
import { fetchMove, fetchPokemon } from "./lib/pokeapi";
import {
  addLog,
  loadLogs,
  loadParties,
  loadSavedDamage,
  loadSavedPokemon,
  saveLogs,
  saveParties,
  saveSavedDamage,
  saveSavedPokemon,
} from "./lib/storage";
import { calculateStats, getNatureEffect } from "./lib/stats";
import {
  DamageResult,
  LogEntry,
  MoveInfo,
  Party,
  PokemonInput,
  SavedDamageCalc,
  SavedPokemon,
  StatBlock,
} from "./types";

type JpNameMapFile = {
  generatedAt?: string;
  p?: Record<string, string>;
  m?: Record<string, string>;
  pokemon?: Record<string, string>;
  move?: Record<string, string>;
};

const emptyStats = (): StatBlock => ({
  hp: 0,
  atk: 0,
  def: 0,
  spa: 0,
  spd: 0,
  spe: 0,
});

const defaultIvs = (): StatBlock => ({
  hp: 31,
  atk: 31,
  def: 31,
  spa: 31,
  spd: 31,
  spe: 31,
});

const emptyPokemon = (): PokemonInput => ({
  name: "",
  level: 50,
  types: [],
  stats: emptyStats(),
  evs: emptyStats(),
  ivs: defaultIvs(),
  nature: "serious",
  item: "",
  moves: [],
});

const emptyMove = (): MoveInfo => ({
  name: "",
  power: null,
  type: "",
  damageClass: "",
});

function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date
    .toTimeString()
    .slice(0, 5)}`;
}

function cleanPokemon(pokemon: PokemonInput[]): PokemonInput[] {
  return pokemon.filter((p) => p.name.trim().length > 0);
}

function displayName(pokemon: PokemonInput): string {
  return pokemon.displayName?.trim() || pokemon.name;
}

const NATURE_OPTIONS = [
  { value: "adamant", label: "いじっぱり (攻撃↑ 特攻↓)" },
  { value: "modest", label: "ひかえめ (特攻↑ 攻撃↓)" },
  { value: "timid", label: "おくびょう (素早さ↑ 攻撃↓)" },
  { value: "jolly", label: "ようき (素早さ↑ 特攻↓)" },
  { value: "bold", label: "ずぶとい (防御↑ 攻撃↓)" },
  { value: "calm", label: "おだやか (特防↑ 攻撃↓)" },
  { value: "careful", label: "しんちょう (特防↑ 特攻↓)" },
  { value: "impish", label: "わんぱく (防御↑ 特攻↓)" },
  { value: "relaxed", label: "のんき (防御↑ 素早さ↓)" },
  { value: "quiet", label: "れいせい (特攻↑ 素早さ↓)" },
  { value: "brave", label: "ゆうかん (攻撃↑ 素早さ↓)" },
  { value: "mild", label: "おっとり (特攻↑ 防御↓)" },
  { value: "rash", label: "うっかりや (特攻↑ 特防↓)" },
  { value: "naive", label: "むじゃき (素早さ↑ 特防↓)" },
  { value: "hasty", label: "せっかち (素早さ↑ 防御↓)" },
  { value: "lonely", label: "さみしがり (攻撃↑ 防御↓)" },
  { value: "naughty", label: "やんちゃ (攻撃↑ 特防↓)" },
  { value: "lax", label: "のうてんき (防御↑ 特防↓)" },
  { value: "gentle", label: "おとなしい (特防↑ 防御↓)" },
  { value: "sassy", label: "なまいき (特防↑ 素早さ↓)" },
  { value: "docile", label: "すなお (補正なし)" },
  { value: "hardy", label: "がんばりや (補正なし)" },
  { value: "bashful", label: "てれや (補正なし)" },
  { value: "quirky", label: "きまぐれ (補正なし)" },
  { value: "serious", label: "まじめ (補正なし)" },
];

const EV_PRESETS: { label: string; values: Partial<StatBlock> }[] = [
  { label: "攻撃素早さ32 / 残り2", values: { atk: 32, spe: 32, hp: 2 } },
  { label: "特攻素早さ32 / 残り2", values: { spa: 32, spe: 32, hp: 2 } },
  { label: "HP攻撃32 / 残り2", values: { hp: 32, atk: 32, def: 2 } },
  { label: "HP防御32 / 残り2", values: { hp: 32, def: 32, spd: 2 } },
  { label: "HP特防32 / 残り2", values: { hp: 32, spd: 32, def: 2 } },
];

const MAX_STAT_POINT_PER_STAT = 32;
const MAX_STAT_POINT_TOTAL = 66;
const PARTY_MOVE_SLOTS = 4;

function normalizeSelectedMoves(moves: string[]): string[] {
  return moves
    .map((move) => move.trim())
    .filter(Boolean)
    .slice(0, PARTY_MOVE_SLOTS);
}

function filterMovesByAvailable(moves: string[], availableMoves: string[]): string[] {
  const availableSet = new Set(availableMoves);
  return normalizeSelectedMoves(moves).filter((move) => availableSet.has(move));
}

function totalEvs(evs: StatBlock): number {
  return evs.hp + evs.atk + evs.def + evs.spa + evs.spd + evs.spe;
}

function clampEvValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_STAT_POINT_PER_STAT, Math.floor(value)));
}

function clampEvsTotal(evs: StatBlock, changedKey: keyof StatBlock): StatBlock {
  const next = { ...evs };
  let total = totalEvs(next);
  if (total <= MAX_STAT_POINT_TOTAL) return next;
  const excess = total - MAX_STAT_POINT_TOTAL;
  next[changedKey] = Math.max(0, next[changedKey] - excess);
  return next;
}

function applyEvPreset(preset: Partial<StatBlock>): StatBlock {
  const base: StatBlock = {
    hp: 0,
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
  };
  return { ...base, ...preset };
}

function clampEv(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_STAT_POINT_PER_STAT, Math.floor(value)));
}

function normalizeEvs(evs: StatBlock): StatBlock {
  const order: (keyof StatBlock)[] = ["hp", "atk", "def", "spa", "spd", "spe"];
  const base = order.reduce((acc, key) => {
    acc[key] = clampEv(evs[key]);
    return acc;
  }, {} as StatBlock);
  let total = totalEvs(base);
  if (total > MAX_STAT_POINT_TOTAL) {
    const ratio = MAX_STAT_POINT_TOTAL / total;
    const scaled = order.reduce((acc, key) => {
      const raw = base[key] * ratio;
      acc[key] = Math.min(MAX_STAT_POINT_PER_STAT, Math.floor(raw));
      return acc;
    }, {} as StatBlock);

    let scaledTotal = totalEvs(scaled);
    if (scaledTotal < MAX_STAT_POINT_TOTAL) {
      const remainders = order
        .map((key) => ({
          key,
          remainder: base[key] * ratio - scaled[key],
        }))
        .sort((a, b) => b.remainder - a.remainder);
      let i = 0;
      while (scaledTotal < MAX_STAT_POINT_TOTAL && i < remainders.length * 200) {
        const key = remainders[i % remainders.length].key;
        if (scaled[key] + 1 <= MAX_STAT_POINT_PER_STAT) {
          scaled[key] += 1;
          scaledTotal += 1;
        }
        i += 1;
      }
    }
    return scaled;
  }

  let remaining = MAX_STAT_POINT_TOTAL - total;
  const filled = { ...base };
  let idx = 0;
  while (remaining > 0 && idx < order.length * 1000) {
    const key = order[idx % order.length];
    if (filled[key] + 1 <= MAX_STAT_POINT_PER_STAT) {
      filled[key] += 1;
      remaining -= 1;
    }
    idx += 1;
  }
  return filled;
}

function migrateLegacyEvValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const normalized = Math.floor(value);
  if (normalized <= MAX_STAT_POINT_PER_STAT) return normalized;
  // Legacy EV(0-252) -> Stat Point(0-32) conversion.
  return Math.max(0, Math.min(MAX_STAT_POINT_PER_STAT, Math.round(normalized / 8)));
}

function migrateLegacyEvs(evs: StatBlock): StatBlock {
  const migrated: StatBlock = {
    hp: migrateLegacyEvValue(evs.hp),
    atk: migrateLegacyEvValue(evs.atk),
    def: migrateLegacyEvValue(evs.def),
    spa: migrateLegacyEvValue(evs.spa),
    spd: migrateLegacyEvValue(evs.spd),
    spe: migrateLegacyEvValue(evs.spe),
  };
  return normalizeEvs(migrated);
}

function natureClass(nature: string, stat: keyof StatBlock): string {
  if (stat === "hp") return "";
  const effect = getNatureEffect(nature);
  if (effect.up === stat) return "up";
  if (effect.down === stat) return "down";
  return "";
}

function normalizePokemonInput(pokemon: Partial<PokemonInput>): PokemonInput {
  const knownItem = ITEM_OPTIONS.find((option) => option.value === pokemon.item);
  const itemValue =
    pokemon.item && !knownItem ? pokemon.item : (pokemon.item ?? "");
  const evs = migrateLegacyEvs(pokemon.evs ?? emptyStats());
  return {
    name: pokemon.name ?? "",
    displayName: pokemon.displayName,
    level: pokemon.level ?? 50,
    types: pokemon.types ?? [],
    stats: pokemon.stats ?? emptyStats(),
    evs,
    ivs: defaultIvs(),
    nature: pokemon.nature ?? "serious",
    item: itemValue,
    moves: pokemon.moves ?? [],
    notes: pokemon.notes,
  };
}

function clampHitCount(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(10, Math.floor(value)));
}

function toPercentText(value: number): string {
  return `${value.toFixed(1)}%`;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function remainingPercentRangeText(minDamagePercent: number, maxDamagePercent: number): string {
  const remainAtMinDamage = clampPercent(100 - minDamagePercent);
  const remainAtMaxDamage = clampPercent(100 - maxDamagePercent);
  return `${toPercentText(remainAtMaxDamage)} - ${toPercentText(remainAtMinDamage)}`;
}

function statNameJa(stat: "atk" | "def" | "spa" | "spd"): string {
  if (stat === "atk") return "攻撃";
  if (stat === "def") return "防御";
  if (stat === "spa") return "特攻";
  return "特防";
}

const TYPE_NAME_JA: Record<string, string> = {
  normal: "ノーマル",
  fire: "ほのお",
  water: "みず",
  electric: "でんき",
  grass: "くさ",
  ice: "こおり",
  fighting: "かくとう",
  poison: "どく",
  ground: "じめん",
  flying: "ひこう",
  psychic: "エスパー",
  bug: "むし",
  rock: "いわ",
  ghost: "ゴースト",
  dragon: "ドラゴン",
  dark: "あく",
  steel: "はがね",
  fairy: "フェアリー",
};

const TYPE_NAME_EN: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_NAME_JA).map(([en, ja]) => [ja, en])
);

function toTypeJa(type: string): string {
  const key = type.trim().toLowerCase();
  return TYPE_NAME_JA[key] ?? type;
}

function toTypeEn(type: string): string {
  const normalized = type.trim();
  const lower = normalized.toLowerCase();
  if (TYPE_NAME_JA[lower]) return lower;
  return TYPE_NAME_EN[normalized] ?? lower;
}

function App() {
  const [tab, setTab] = useState<"damage" | "party" | "register" | "log">("damage");
  const [attacker, setAttacker] = useState<PokemonInput>(emptyPokemon());
  const [defender, setDefender] = useState<PokemonInput>(emptyPokemon());
  const [registerPokemon, setRegisterPokemon] = useState<PokemonInput>(emptyPokemon());
  const [registerSaveLabel, setRegisterSaveLabel] = useState("");
  const [move, setMove] = useState<MoveInfo>(emptyMove());
  const [damageResult, setDamageResult] = useState<DamageResult | null>(null);
  const [hitCount, setHitCount] = useState(1);
  const [pokemonOptions, setPokemonOptions] = useState<string[]>([]);
  const [attackerSaveLabel, setAttackerSaveLabel] = useState("");
  const [DefenderSaveLabel, setDefenderSaveLabel] = useState("");
  const [partySaveLabels, setPartySaveLabels] = useState<string[]>(
    Array.from({ length: 6 }, () => "")
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [partyName, setPartyName] = useState("");
  const [partyMembers, setPartyMembers] = useState<PokemonInput[]>(
    Array.from({ length: 6 }, () => emptyPokemon())
  );
  const [partyMoveOptions, setPartyMoveOptions] = useState<string[][]>(
    Array.from({ length: 6 }, () => [])
  );
  const [parties, setParties] = useState<Party[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [savedPokemon, setSavedPokemon] = useState<SavedPokemon[]>([]);
  const [savedDamages, setSavedDamages] = useState<SavedDamageCalc[]>([]);
  const [selectedSavedDamageId, setSelectedSavedDamageId] = useState("");

  useEffect(() => {
    const loadedParties = loadParties().map((party) => ({
      ...party,
      members: party.members.map((member) => normalizePokemonInput(member)),
    }));
    const loadedLogs = loadLogs().map((log) => ({
      ...log,
      pokemon: log.pokemon.map((member) => normalizePokemonInput(member)),
    }));
    const loadedSaved = loadSavedPokemon().map((saved) => ({
      ...saved,
      pokemon: normalizePokemonInput(saved.pokemon),
    }));
    const loadedSavedDamage = loadSavedDamage();
    setParties(loadedParties);
    setLogs(loadedLogs);
    setSavedPokemon(loadedSaved);
    setSavedDamages(loadedSavedDamage);
  }, []);

  useEffect(() => {
    saveParties(parties);
  }, [parties]);

  useEffect(() => {
    saveLogs(logs);
  }, [logs]);

  useEffect(() => {
    saveSavedPokemon(savedPokemon);
  }, [savedPokemon]);

  useEffect(() => {
    saveSavedDamage(savedDamages);
  }, [savedDamages]);

  useEffect(() => {
    if (savedDamages.length === 0) {
      setSelectedSavedDamageId("");
      return;
    }
    const exists = savedDamages.some((entry) => entry.id === selectedSavedDamageId);
    if (!exists) {
      setSelectedSavedDamageId(savedDamages[0].id);
    }
  }, [savedDamages, selectedSavedDamageId]);

  useEffect(() => {
    const loadPokemonOptions = async () => {
      try {
        const res = await fetch("/jp-name-map.json", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Partial<JpNameMapFile>;
        const pokemonMap = data.p ?? data.pokemon ?? {};
        const names = Object.keys(pokemonMap).sort((a, b) =>
          a.localeCompare(b, "ja")
        );
        setPokemonOptions(names);
      } catch {
        setPokemonOptions([]);
      }
    };
    void loadPokemonOptions();
  }, []);

  const attackerTypes = useMemo(
    () => attacker.types.map(toTypeJa).join(" / "),
    [attacker.types]
  );
  const DefenderTypes = useMemo(
    () => defender.types.map(toTypeJa).join(" / "),
    [defender.types]
  );
  const pokemonOptionSet = useMemo(() => new Set(pokemonOptions), [pokemonOptions]);
  const attackerActual = useMemo(() => calculateStats(attacker), [attacker]);
  const DefenderActual = useMemo(() => calculateStats(defender), [defender]);
  const attackerEvTotal = useMemo(() => totalEvs(attacker.evs), [attacker.evs]);
  const DefenderEvTotal = useMemo(() => totalEvs(defender.evs), [defender.evs]);
  const attackerSpeedMultiplier = useMemo(
    () => getSpeedMultiplier(attacker.item),
    [attacker.item]
  );
  const DefenderSpeedMultiplier = useMemo(
    () => getSpeedMultiplier(defender.item),
    [defender.item]
  );
  const attackerMoveOptions = useMemo(
    () => Array.from(new Set(attacker.moves)).sort((a, b) => a.localeCompare(b, "ja")),
    [attacker.moves]
  );
  const attackerMoveOptionSet = useMemo(
    () => new Set(attackerMoveOptions),
    [attackerMoveOptions]
  );
  const registerMoveOptions = useMemo(
    () => Array.from(new Set(registerPokemon.moves)).sort((a, b) => a.localeCompare(b, "ja")),
    [registerPokemon.moves]
  );
  const registerEvTotal = useMemo(() => totalEvs(registerPokemon.evs), [registerPokemon.evs]);
  const DefenderHp = useMemo(() => Math.max(1, DefenderActual.hp), [DefenderActual.hp]);
  const damagePercent = useMemo(() => {
    if (!damageResult) return null;
    const min = (damageResult.min / DefenderHp) * 100;
    const max = (damageResult.max / DefenderHp) * 100;
    return { min, max };
  }, [damageResult, DefenderHp]);
  const totalDamage = useMemo(() => {
    if (!damageResult) return null;
    return {
      min: damageResult.min * hitCount,
      max: damageResult.max * hitCount,
    };
  }, [damageResult, hitCount]);
  const totalDamagePercent = useMemo(() => {
    if (!totalDamage) return null;
    return {
      min: (totalDamage.min / DefenderHp) * 100,
      max: (totalDamage.max / DefenderHp) * 100,
    };
  }, [totalDamage, DefenderHp]);
  const savedPokemonOptions = useMemo(
    () => savedPokemon.map((saved) => ({ id: saved.id, label: saved.label })),
    [savedPokemon]
  );
  const latestSavedDamage = useMemo(
    () => savedDamages.find((entry) => entry.id === selectedSavedDamageId) ?? null,
    [savedDamages, selectedSavedDamageId]
  );
  const latestSavedDamagePercent = useMemo(() => {
    if (!latestSavedDamage) return null;
    return {
      min: (latestSavedDamage.min / latestSavedDamage.defenderHp) * 100,
      max: (latestSavedDamage.max / latestSavedDamage.defenderHp) * 100,
    };
  }, [latestSavedDamage]);
  const combinedDamageWithSaved = useMemo(() => {
    if (!latestSavedDamage || !totalDamage) return null;
    return {
      min: latestSavedDamage.min + totalDamage.min,
      max: latestSavedDamage.max + totalDamage.max,
      canShowPercent: latestSavedDamage.defenderHp === DefenderHp,
    };
  }, [latestSavedDamage, totalDamage, DefenderHp]);
  const combinedDamagePercentWithSaved = useMemo(() => {
    if (!combinedDamageWithSaved || !combinedDamageWithSaved.canShowPercent) return null;
    return {
      min: (combinedDamageWithSaved.min / DefenderHp) * 100,
      max: (combinedDamageWithSaved.max / DefenderHp) * 100,
    };
  }, [combinedDamageWithSaved, DefenderHp]);

  const handleFetchPokemon = async (
    target: "attacker" | "defender",
    inputName?: string
  ) => {
    const pokemon = target === "attacker" ? attacker : defender;
    const name = inputName?.trim() ?? pokemon.name.trim();
    if (!name) {
      setError("ポケモン名を入力してください");
      return;
    }
    setError(null);
    setBusy(target);
    try {
      const fetched = await fetchPokemon(name);
      const displayName = fetched.displayName?.trim() || fetched.name;
      if (target === "attacker") {
        setAttacker((prev) => ({
          ...prev,
          name: displayName,
          displayName,
          types: fetched.types,
          stats: fetched.stats,
          moves: fetched.moves,
        }));
      } else {
        setDefender((prev) => ({
          ...prev,
          name: displayName,
          displayName,
          types: fetched.types,
          stats: fetched.stats,
          moves: fetched.moves,
        }));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handlePokemonNameInput = (
    target: "attacker" | "defender",
    value: string
  ) => {
    if (target === "attacker") {
      setAttacker((prev) => ({ ...prev, name: value }));
    } else {
      setDefender((prev) => ({ ...prev, name: value }));
    }
    if (pokemonOptionSet.has(value.trim())) {
      void handleFetchPokemon(target, value);
    }
  };

  const handlePokemonNameCommit = (target: "attacker" | "defender") => {
    const value = target === "attacker" ? attacker.name : defender.name;
    if (!value.trim()) return;
    void handleFetchPokemon(target, value);
  };

  const handleFetchMove = async (inputName?: string) => {
    const name = inputName?.trim() ?? move.name.trim();
    if (!name) {
      setError("技名を入力してください");
      return;
    }
    setError(null);
    setBusy("move");
    try {
      const fetched = await fetchMove(name);
      setMove(fetched);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleMoveNameInput = (value: string) => {
    setMove((prev) => ({ ...prev, name: value }));
    if (attackerMoveOptionSet.has(value.trim())) {
      void handleFetchMove(value);
    }
  };

  const handleMoveNameCommit = () => {
    if (!move.name.trim()) return;
    void handleFetchMove(move.name);
  };

  const handleCalculate = (shouldLog: boolean) => {
    if (!attacker.name.trim() || !defender.name.trim() || !move.name.trim()) {
      setError("攻撃側・防御側・技名を入力してください");
      return;
    }
    setError(null);
    const result = calculateDamage(attacker, defender, move);
    setDamageResult(result);
    if (shouldLog) {
      const hitText = hitCount > 1 ? ` x${hitCount}` : "";
      const detail = `${displayName(attacker)} → ${displayName(defender)} / ${move.name}${hitText}`;
      const updated = addLog(logs, "damage", cleanPokemon([attacker, defender]), detail);
      setLogs(updated);
      const totalMin = result.min * hitCount;
      const totalMax = result.max * hitCount;
      const entry: SavedDamageCalc = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        attackerName: displayName(attacker),
        defenderName: displayName(defender),
        moveName: move.name,
        hitCount,
        min: totalMin,
        max: totalMax,
        defenderHp: DefenderHp,
      };
      setSelectedSavedDamageId(entry.id);
      setSavedDamages((prev) => [entry, ...prev].slice(0, 30));
    }
  };

  const savePokemonPreset = (pokemon: PokemonInput, customLabel?: string) => {
    if (!pokemon.name.trim()) {
      setError("保存するポケモン名を入力してください");
      return;
    }
    const baseLabel = displayName(pokemon).trim() || pokemon.name.trim();
    const label = customLabel?.trim() || `${baseLabel} (${pokemon.nature})`;
    const entry: SavedPokemon = {
      id: crypto.randomUUID(),
      label,
      pokemon: normalizePokemonInput(pokemon),
      createdAt: new Date().toISOString(),
    };
    setSavedPokemon((prev) => [entry, ...prev]);
    setError(null);
  };

  const applySavedPokemonToTarget = (
    target: "attacker" | "defender",
    savedId: string
  ) => {
    const selected = savedPokemon.find((saved) => saved.id === savedId);
    if (!selected) return;
    if (target === "attacker") {
      setAttacker(normalizePokemonInput(selected.pokemon));
    } else {
      setDefender(normalizePokemonInput(selected.pokemon));
    }
  };

  const applySavedPokemonToPartyMember = (index: number, savedId: string) => {
    const selected = savedPokemon.find((saved) => saved.id === savedId);
    if (!selected) return;
    const normalized = normalizePokemonInput(selected.pokemon);
    const availableMoves = Array.from(
      new Set((normalized.moves ?? []).map((m) => m.trim()).filter(Boolean))
    );
    updatePartyMember(index, {
      ...normalized,
      moves: filterMovesByAvailable(normalized.moves, availableMoves),
    });
    setPartyMoveOptions((prev) =>
      prev.map((moves, idx) =>
        idx === index ? availableMoves : moves
      )
    );
  };

  const handleFetchPartyMember = async (index: number, inputName?: string) => {
    const member = partyMembers[index];
    if (!member) return;
    const name = inputName?.trim() ?? member.name.trim();
    if (!name) return;
    setError(null);
    setBusy(`party-${index}`);
    try {
      const fetched = await fetchPokemon(name);
      const displayName = fetched.displayName?.trim() || fetched.name;
      updatePartyMember(index, {
        name: displayName,
        displayName,
        types: fetched.types,
        stats: fetched.stats,
        moves: (fetched.moves ?? []).slice(0, PARTY_MOVE_SLOTS),
      });
      setPartyMoveOptions((prev) =>
        prev.map((moves, idx) =>
          idx === index
            ? Array.from(new Set((fetched.moves ?? []).map((m) => m.trim()).filter(Boolean)))
            : moves
        )
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handlePartyMemberNameInput = (index: number, value: string) => {
    updatePartyMember(index, { name: value });
    if (!value.trim()) {
      updatePartyMember(index, { moves: [] });
      setPartyMoveOptions((prev) => prev.map((moves, idx) => (idx === index ? [] : moves)));
    }
    if (pokemonOptionSet.has(value.trim())) {
      void handleFetchPartyMember(index, value);
    }
  };

  const handlePartyMemberNameCommit = (index: number) => {
    const member = partyMembers[index];
    if (!member?.name.trim()) return;
    void handleFetchPartyMember(index, member.name);
  };

  const handleFetchRegisterPokemon = async (inputName?: string) => {
    const name = inputName?.trim() ?? registerPokemon.name.trim();
    if (!name) return;
    setError(null);
    setBusy("register");
    try {
      const fetched = await fetchPokemon(name);
      const displayName = fetched.displayName?.trim() || fetched.name;
      setRegisterPokemon((prev) => ({
        ...prev,
        name: displayName,
        displayName,
        types: fetched.types,
        stats: fetched.stats,
        moves: (fetched.moves ?? []).slice(0, PARTY_MOVE_SLOTS),
      }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleRegisterPokemonNameInput = (value: string) => {
    setRegisterPokemon((prev) => ({ ...prev, name: value }));
    if (pokemonOptionSet.has(value.trim())) {
      void handleFetchRegisterPokemon(value);
    }
  };

  const handleRegisterPokemonNameCommit = () => {
    if (!registerPokemon.name.trim()) return;
    void handleFetchRegisterPokemon(registerPokemon.name);
  };

  const updateRegisterPokemonMove = (slot: number, value: string) => {
    setRegisterPokemon((prev) => {
      const nextMoves = Array.from(
        { length: PARTY_MOVE_SLOTS },
        (_, i) => prev.moves[i] ?? ""
      );
      nextMoves[slot] = value;
      return { ...prev, moves: nextMoves };
    });
  };

  const handleRegisterSavedPokemon = () => {
    savePokemonPreset(
      { ...registerPokemon, moves: normalizeSelectedMoves(registerPokemon.moves) },
      registerSaveLabel
    );
    setRegisterSaveLabel("");
  };

  const deleteSavedPokemon = (savedId: string) => {
    setSavedPokemon((prev) => prev.filter((saved) => saved.id !== savedId));
  };

  const updateSavedPokemonMemo = (savedId: string, memo: string) => {
    setSavedPokemon((prev) =>
      prev.map((saved) => (saved.id === savedId ? { ...saved, memo } : saved))
    );
  };

  const updatePartyMember = (index: number, patch: Partial<PokemonInput>) => {
    setPartyMembers((prev) =>
      prev.map((member, idx) => (idx === index ? { ...member, ...patch } : member))
    );
  };

  const updatePartyMemberMove = (index: number, slot: number, value: string) => {
    setPartyMembers((prev) =>
      prev.map((member, idx) => {
        if (idx !== index) return member;
        const nextMoves = Array.from(
          { length: PARTY_MOVE_SLOTS },
          (_, i) => member.moves[i] ?? ""
        );
        nextMoves[slot] = value;
        return { ...member, moves: nextMoves };
      })
    );
  };

  const updatePartyStat = (
    index: number,
    key: keyof StatBlock,
    value: number
  ) => {
    setPartyMembers((prev) =>
      prev.map((member, idx) =>
        idx === index
          ? { ...member, stats: { ...member.stats, [key]: value } }
          : member
      )
    );
  };

  const handleSaveParty = () => {
    const members = cleanPokemon(partyMembers).map((member) => ({
      ...member,
      moves: normalizeSelectedMoves(member.moves),
    }));
    if (!partyName.trim() && members.length === 0) {
      setError("パーティ名かメンバーを入力してください");
      return;
    }
    const name = partyName.trim() || `パーティ ${new Date().toLocaleDateString()}`;
    const newParty: Party = {
      id: crypto.randomUUID(),
      name,
      members,
      createdAt: new Date().toISOString(),
    };
    setParties((prev) => [newParty, ...prev]);
    const updated = addLog(logs, "party", members, `パーティ保存: ${name}`);
    setLogs(updated);
    const now = new Date().toISOString();
    const autoSavedPokemon: SavedPokemon[] = members.map((member, index) => ({
      id: crypto.randomUUID(),
      label: `${name} #${index + 1} ${displayName(member)}`,
      pokemon: normalizePokemonInput(member),
      createdAt: now,
    }));
    setSavedPokemon((prev) => [...autoSavedPokemon, ...prev]);
    setError(null);
    setPartyName("");
    setPartyMembers(Array.from({ length: 6 }, () => emptyPokemon()));
    setPartyMoveOptions(Array.from({ length: 6 }, () => []));
    setPartySaveLabels(Array.from({ length: 6 }, () => ""));
  };

  const handleLoadParty = (party: Party) => {
    const loadedMembers = Array.from(
      { length: 6 },
      (_, idx) => party.members[idx] ?? emptyPokemon()
    );
    const loadedMoveOptions = loadedMembers.map((member) =>
      Array.from(new Set((member.moves ?? []).map((move) => move.trim()).filter(Boolean)))
    );
    setPartyName(party.name);
    setPartyMembers(
      loadedMembers.map((member, idx) => ({
        ...member,
        moves: filterMovesByAvailable(member.moves ?? [], loadedMoveOptions[idx] ?? []),
      }))
    );
    setPartyMoveOptions(loadedMoveOptions);
    setPartySaveLabels(Array.from({ length: 6 }, () => ""));
    setTab("party");
  };

  const handleDeleteParty = (partyId: string) => {
    setParties((prev) => prev.filter((party) => party.id !== partyId));
  };

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="hero-eyebrow">ポケモン対戦ラボ</p>
          <h1>ダメージ計算とパーティ管理をひとつに。</h1>
          <p className="hero-sub">
            ローカルデータと保存機能で素早く管理。\n            対戦で使うポケモン、ステータス、技をひとつにまとめて扱えます。
          </p>
        </div>
        <div className="hero-badge">
          <span>ウィンドウズ / タウリ</span>
          <strong>ローカル専用</strong>
        </div>
      </header>

      <nav className="tabs">
        <button
          className={tab === "damage" ? "active" : ""}
          onClick={() => setTab("damage")}
        >
          ダメージ計算
        </button>
        <button
          className={tab === "party" ? "active" : ""}
          onClick={() => setTab("party")}
        >
          パーティ保存
        </button>
        <button
          className={tab === "register" ? "active" : ""}
          onClick={() => setTab("register")}
        >
          保存ポケモン登録
        </button>
        <button
          className={tab === "log" ? "active" : ""}
          onClick={() => setTab("log")}
        >
          保存済みポケモン
        </button>
      </nav>

      <p className="hint">ローカルDBを使用してオフラインで検索・反映します。</p>

      {error && <div className="notice error">{error}</div>}

      {tab === "damage" && (
        <section className="panel grid">
          <datalist id="pokemon-name-options">
            {pokemonOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <datalist id="attacker-move-options">
            {attackerMoveOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <div className="card">
            <h2>攻撃側</h2>
            <div className="field">
              <label>ポケモン名（検索）</label>
              <input
                list="pokemon-name-options"
                value={attacker.name}
                onChange={(e) => handlePokemonNameInput("attacker", e.target.value)}
                onBlur={() => handlePokemonNameCommit("attacker")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handlePokemonNameCommit("attacker");
                  }
                }}
                placeholder="リザードン"
              />
            </div>
            <div className="field">
              <label>保存済みポケモン呼び出し</label>
              <select
                value=""
                onChange={(e) => applySavedPokemonToTarget("attacker", e.target.value)}
              >
                <option value="">選択してください</option>
                {savedPokemonOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="actions">
              <input
                value={attackerSaveLabel}
                onChange={(e) => setAttackerSaveLabel(e.target.value)}
                placeholder="保存ラベル（任意）"
              />
              <button
                className="ghost"
                onClick={() => {
                  savePokemonPreset(attacker, attackerSaveLabel);
                  setAttackerSaveLabel("");
                }}
              >
                この調整を保存
              </button>
            </div>
            <div className="field">
              <label>レベル</label>
              <input
                type="number"
                value={attacker.level}
                onChange={(e) =>
                  setAttacker({ ...attacker, level: Number(e.target.value) })
                }
              />
            </div>
            <div className="field">
              <label>性格</label>
              <select
                value={attacker.nature}
                onChange={(e) =>
                  setAttacker({ ...attacker, nature: e.target.value })
                }
              >
                {NATURE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>持ち物</label>
              <select
                value={attacker.item ?? ""}
                onChange={(e) => setAttacker({ ...attacker, item: e.target.value })}
              >
                <option value="">なし</option>
                {attacker.item &&
                  !ITEM_OPTIONS.some((option) => option.value === attacker.item) && (
                    <option value={attacker.item}>カスタム: {attacker.item}</option>
                  )}
                {ITEM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>タイプ</label>
              <input value={attackerTypes} readOnly placeholder="ほのお / ひこう" />
            </div>
            <div className="stat-section">
              <p className="stat-title">種族値</p>
              <div className="stat-grid">
                {([
                  ["hp", "HP"],
                  ["atk", "攻撃"],
                  ["def", "防御"],
                  ["spa", "特攻"],
                  ["spd", "特防"],
                  ["spe", "素早さ"],
                ] as [keyof StatBlock, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label>{label}</label>
                    <input
                      type="number"
                      value={attacker.stats[key]}
                      onChange={(e) =>
                        setAttacker({
                          ...attacker,
                          stats: {
                            ...attacker.stats,
                            [key]: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="stat-section">
              <p className="stat-title">能力ポイント</p>
              <div className="stat-grid">
                {([
                  ["hp", "HP"],
                  ["atk", "攻撃"],
                  ["def", "防御"],
                  ["spa", "特攻"],
                  ["spd", "特防"],
                  ["spe", "素早さ"],
                ] as [keyof StatBlock, string][]).map(([key, label]) => (
                  <div key={`${key}-ev`}>
                    <label>{label}</label>
                    <input
                      type="number"
                      min={0}
                      max={MAX_STAT_POINT_PER_STAT}
                      step={1}
                      value={attacker.evs[key]}
                      onChange={(e) =>
                        setAttacker((prev) => {
                          const next = {
                            ...prev.evs,
                            [key]: clampEvValue(Number(e.target.value)),
                          };
                          return { ...prev, evs: clampEvsTotal(next, key) };
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              <p className={attackerEvTotal > MAX_STAT_POINT_TOTAL ? "ev-total warn" : "ev-total"}>
                能力ポイント合計: {attackerEvTotal} / {MAX_STAT_POINT_TOTAL}
              </p>
              {attackerEvTotal > MAX_STAT_POINT_TOTAL && (
                <p className="ev-warning">能力ポイントが66を超えています。</p>
              )}
              <div className="ev-actions">
                <button
                  className="ghost"
                  onClick={() =>
                    setAttacker({ ...attacker, evs: normalizeEvs(attacker.evs) })
                  }
                >
                  自動調整（66）
                </button>
                {EV_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    className="ghost"
                    onClick={() =>
                      setAttacker({
                        ...attacker,
                        evs: applyEvPreset(preset.values),
                      })
                    }
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="stat-section">
              <p className="stat-title">実数値</p>
              <div className="stat-grid">
                {([
                  ["hp", "HP"],
                  ["atk", "攻撃"],
                  ["def", "防御"],
                  ["spa", "特攻"],
                  ["spd", "特防"],
                  ["spe", "素早さ"],
                ] as [keyof StatBlock, string][]).map(([key, label]) => {
                  const cls = natureClass(attacker.nature, key);
                  const displayValue =
                    key === "spe"
                      ? Math.floor(attackerActual.spe * attackerSpeedMultiplier)
                      : attackerActual[key];
                  return (
                    <div key={`${key}-actual`}>
                      <label
                        className={`stat-label ${cls}`}
                        title={
                          cls === "up"
                            ? "性格補正: ↑"
                            : cls === "down"
                            ? "性格補正: ↓"
                            : "性格補正なし"
                        }
                      >
                        {label}
                        {cls === "up" && <span className="stat-arrow">↑</span>}
                        {cls === "down" && <span className="stat-arrow">↓</span>}
                        {key === "spe" && attackerSpeedMultiplier !== 1 && (
                          <span className="stat-mult">
                            x{attackerSpeedMultiplier.toFixed(1)}
                          </span>
                        )}
                      </label>
                      <input type="number" value={displayValue} readOnly />
                    </div>
                  );
                })}
              </div>
            </div>
            {busy === "attacker" && <p className="hint">攻撃側を反映中...</p>}
          </div>

          <div className="card">
            <h2>防御側</h2>
            <div className="field">
              <label>ポケモン名（検索）</label>
              <input
                list="pokemon-name-options"
                value={defender.name}
                onChange={(e) => handlePokemonNameInput("defender", e.target.value)}
                onBlur={() => handlePokemonNameCommit("defender")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handlePokemonNameCommit("defender");
                  }
                }}
                placeholder="ガブリアス"
              />
            </div>
            <div className="field">
              <label>保存済みポケモン呼び出し</label>
              <select
                value=""
                onChange={(e) => applySavedPokemonToTarget("defender", e.target.value)}
              >
                <option value="">選択してください</option>
                {savedPokemonOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="actions">
              <input
                value={DefenderSaveLabel}
                onChange={(e) => setDefenderSaveLabel(e.target.value)}
                placeholder="保存ラベル（任意）"
              />
              <button
                className="ghost"
                onClick={() => {
                  savePokemonPreset(defender, DefenderSaveLabel);
                  setDefenderSaveLabel("");
                }}
              >
                この調整を保存
              </button>
            </div>
            <div className="field">
              <label>レベル</label>
              <input
                type="number"
                value={defender.level}
                onChange={(e) =>
                  setDefender({ ...defender, level: Number(e.target.value) })
                }
              />
            </div>
            <div className="field">
              <label>性格</label>
              <select
                value={defender.nature}
                onChange={(e) =>
                  setDefender({ ...defender, nature: e.target.value })
                }
              >
                {NATURE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>持ち物</label>
              <select
                value={defender.item ?? ""}
                onChange={(e) => setDefender({ ...defender, item: e.target.value })}
              >
                <option value="">なし</option>
                {defender.item &&
                  !ITEM_OPTIONS.some((option) => option.value === defender.item) && (
                    <option value={defender.item}>カスタム: {defender.item}</option>
                  )}
                {ITEM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>タイプ</label>
              <input value={DefenderTypes} readOnly placeholder="ドラゴン / じめん" />
            </div>
            <div className="stat-section">
              <p className="stat-title">種族値</p>
              <div className="stat-grid">
                {([
                  ["hp", "HP"],
                  ["atk", "攻撃"],
                  ["def", "防御"],
                  ["spa", "特攻"],
                  ["spd", "特防"],
                  ["spe", "素早さ"],
                ] as [keyof StatBlock, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label>{label}</label>
                    <input
                      type="number"
                      value={defender.stats[key]}
                      onChange={(e) =>
                        setDefender({
                          ...defender,
                          stats: {
                            ...defender.stats,
                            [key]: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="stat-section">
              <p className="stat-title">能力ポイント</p>
              <div className="stat-grid">
                {([
                  ["hp", "HP"],
                  ["atk", "攻撃"],
                  ["def", "防御"],
                  ["spa", "特攻"],
                  ["spd", "特防"],
                  ["spe", "素早さ"],
                ] as [keyof StatBlock, string][]).map(([key, label]) => (
                  <div key={`${key}-ev`}>
                    <label>{label}</label>
                    <input
                      type="number"
                      min={0}
                      max={MAX_STAT_POINT_PER_STAT}
                      step={1}
                      value={defender.evs[key]}
                      onChange={(e) =>
                        setDefender((prev) => {
                          const next = {
                            ...prev.evs,
                            [key]: clampEvValue(Number(e.target.value)),
                          };
                          return { ...prev, evs: clampEvsTotal(next, key) };
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              <p className={DefenderEvTotal > MAX_STAT_POINT_TOTAL ? "ev-total warn" : "ev-total"}>
                能力ポイント合計: {DefenderEvTotal} / {MAX_STAT_POINT_TOTAL}
              </p>
              {DefenderEvTotal > MAX_STAT_POINT_TOTAL && (
                <p className="ev-warning">能力ポイントが66を超えています。</p>
              )}
              <div className="ev-actions">
                <button
                  className="ghost"
                  onClick={() =>
                    setDefender({ ...defender, evs: normalizeEvs(defender.evs) })
                  }
                >
                  自動調整（66）
                </button>
                {EV_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    className="ghost"
                    onClick={() =>
                      setDefender({
                        ...defender,
                        evs: applyEvPreset(preset.values),
                      })
                    }
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="stat-section">
              <p className="stat-title">実数値</p>
              <div className="stat-grid">
                {([
                  ["hp", "HP"],
                  ["atk", "攻撃"],
                  ["def", "防御"],
                  ["spa", "特攻"],
                  ["spd", "特防"],
                  ["spe", "素早さ"],
                ] as [keyof StatBlock, string][]).map(([key, label]) => {
                  const cls = natureClass(defender.nature, key);
                  const displayValue =
                    key === "spe"
                      ? Math.floor(DefenderActual.spe * DefenderSpeedMultiplier)
                      : DefenderActual[key];
                  return (
                    <div key={`${key}-actual`}>
                      <label
                        className={`stat-label ${cls}`}
                        title={
                          cls === "up"
                            ? "性格補正: ↑"
                            : cls === "down"
                            ? "性格補正: ↓"
                            : "性格補正なし"
                        }
                      >
                        {label}
                        {cls === "up" && <span className="stat-arrow">↑</span>}
                        {cls === "down" && <span className="stat-arrow">↓</span>}
                        {key === "spe" && DefenderSpeedMultiplier !== 1 && (
                          <span className="stat-mult">
                            x{DefenderSpeedMultiplier.toFixed(1)}
                          </span>
                        )}
                      </label>
                      <input type="number" value={displayValue} readOnly />
                    </div>
                  );
                })}
              </div>
            </div>
            {busy === "defender" && <p className="hint">防御側を反映中...</p>}
          </div>

          <div className="card wide">
            <h2>技</h2>
            <div className="field">
              <label>技名（検索）</label>
              <input
                list="attacker-move-options"
                value={move.name}
                onChange={(e) => handleMoveNameInput(e.target.value)}
                onBlur={handleMoveNameCommit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleMoveNameCommit();
                  }
                }}
                placeholder="かえんほうしゃ"
              />
            </div>
            <div className="inline-fields">
              <div>
                <label>威力</label>
                <input
                  type="number"
                  value={move.power ?? 0}
                  onChange={(e) =>
                    setMove({ ...move, power: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label>タイプ</label>
                <input
                  value={toTypeJa(move.type)}
                  onChange={(e) => setMove({ ...move, type: toTypeEn(e.target.value) })}
                  placeholder="ほのお"
                />
              </div>
              <div>
                <label>分類</label>
                <select
                  value={move.damageClass}
                  onChange={(e) =>
                    setMove({
                      ...move,
                      damageClass: e.target.value as MoveInfo["damageClass"],
                    })
                  }
                >
                  <option value="">不明</option>
                  <option value="physical">物理</option>
                  <option value="special">特殊</option>
                  <option value="status">変化</option>
                </select>
              </div>
              <div>
                <label>連続回数</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={hitCount}
                  onChange={(e) => setHitCount(clampHitCount(Number(e.target.value)))}
                />
              </div>
            </div>
            <div className="actions">
              <button className="primary" onClick={() => handleCalculate(true)}>
                計算して保存
              </button>
              <button onClick={() => handleCalculate(false)}>計算だけ</button>
            </div>
            {busy === "move" && <p className="hint">技情報を反映中...</p>}
            {damageResult && (
              <div className="result">
                <h3>ダメージ結果</h3>
                <div className="result-grid">
                  <div>
                    <strong>{damageResult.min}</strong>
                    <span>最小</span>
                  </div>
                  <div>
                    <strong>{damageResult.max}</strong>
                    <span>最大</span>
                  </div>
                  <div>
                    <strong className="result-range">
                      {damagePercent
                        ? `${toPercentText(damagePercent.min)} - ${toPercentText(
                            damagePercent.max
                          )}`
                        : "-"}
                    </strong>
                    <span>HP割合（1回）</span>
                  </div>
                  <div>
                    <strong className="result-range">
                      {totalDamage ? `${totalDamage.min} - ${totalDamage.max}` : "-"}
                    </strong>
                    <span>合計ダメージ（{hitCount}回）</span>
                  </div>
                  <div>
                    <strong className="result-range">
                      {totalDamagePercent
                        ? `${toPercentText(totalDamagePercent.min)} - ${toPercentText(
                            totalDamagePercent.max
                          )}`
                        : "-"}
                    </strong>
                    <span>合計HP割合（{hitCount}回）</span>
                  </div>
                  <div>
                    <strong>{damageResult.stab}x</strong>
                    <span>タイプ一致</span>
                  </div>
                  <div>
                    <strong>{damageResult.effectiveness}x</strong>
                    <span>相性</span>
                  </div>
                </div>
                <p className="hint">
                  防御側HP: {DefenderHp} ・
                  使用ステータス: {statNameJa(damageResult.usedStat)} / 
                  {statNameJa(damageResult.usedDef)} ・ 威力 {damageResult.basePower}
                </p>
                {damagePercent && (
                  <div className="hp-visual">
                    <div className="hp-visual-head">
                      <strong>HPバー（1回）</strong>
                      <span>
                        {toPercentText(damagePercent.min)} - {toPercentText(damagePercent.max)}
                      </span>
                    </div>
                    <div className="hp-bar">
                      <div
                        className="hp-bar-min"
                        style={{ width: `${clampPercent(damagePercent.min)}%` }}
                      />
                      <div
                        className="hp-bar-range"
                        style={{
                          left: `${clampPercent(damagePercent.min)}%`,
                          width: `${Math.max(
                            0,
                            clampPercent(damagePercent.max) -
                              clampPercent(damagePercent.min)
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="hp-remaining">
                      残HP: {remainingPercentRangeText(damagePercent.min, damagePercent.max)}
                    </p>
                  </div>
                )}
                {totalDamagePercent && (
                  <div className="hp-visual">
                    <div className="hp-visual-head">
                      <strong>HPバー（{hitCount}回合計）</strong>
                      <span>
                        {toPercentText(totalDamagePercent.min)} -{" "}
                        {toPercentText(totalDamagePercent.max)}
                      </span>
                    </div>
                    <div className="hp-bar">
                      <div
                        className="hp-bar-min"
                        style={{ width: `${clampPercent(totalDamagePercent.min)}%` }}
                      />
                      <div
                        className="hp-bar-range"
                        style={{
                          left: `${clampPercent(totalDamagePercent.min)}%`,
                          width: `${Math.max(
                            0,
                            clampPercent(totalDamagePercent.max) -
                              clampPercent(totalDamagePercent.min)
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="hp-remaining">
                      残HP:{" "}
                      {remainingPercentRangeText(
                        totalDamagePercent.min,
                        totalDamagePercent.max
                      )}
                    </p>
                  </div>
                )}
                {latestSavedDamage && (
                  <>
                    <h3>保存済みダメージ（選択）</h3>
                    <div className="field">
                      <label>合算する保存ダメージ</label>
                      <select
                        value={selectedSavedDamageId}
                        onChange={(e) => setSelectedSavedDamageId(e.target.value)}
                      >
                        {savedDamages.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {`${formatDate(entry.createdAt)} / ${entry.attackerName} → ${entry.defenderName} / ${entry.moveName}${entry.hitCount > 1 ? ` x${entry.hitCount}` : ""}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="hint">
                      {latestSavedDamage.attackerName} → {latestSavedDamage.defenderName} /{" "}
                      {latestSavedDamage.moveName}
                      {latestSavedDamage.hitCount > 1
                        ? ` x${latestSavedDamage.hitCount}`
                        : ""}
                    </p>
                    <div className="result-grid">
                      <div>
                        <strong className="result-range">
                          {latestSavedDamage.min} - {latestSavedDamage.max}
                        </strong>
                        <span>保存ダメージ</span>
                      </div>
                      <div>
                        <strong className="result-range">
                          {latestSavedDamagePercent
                            ? `${toPercentText(
                                latestSavedDamagePercent.min
                              )} - ${toPercentText(latestSavedDamagePercent.max)}`
                            : "-"}
                        </strong>
                        <span>保存時HP割合</span>
                      </div>
                      <div>
                        <strong className="result-range">
                          {combinedDamageWithSaved
                            ? `${combinedDamageWithSaved.min} - ${combinedDamageWithSaved.max}`
                            : "-"}
                        </strong>
                        <span>今回との合計ダメージ</span>
                      </div>
                      <div>
                        <strong className="result-range">
                          {combinedDamagePercentWithSaved
                            ? `${toPercentText(
                                combinedDamagePercentWithSaved.min
                              )} - ${toPercentText(combinedDamagePercentWithSaved.max)}`
                            : "-"}
                        </strong>
                        <span>今回との合計HP割合</span>
                      </div>
                    </div>
                    {combinedDamageWithSaved && !combinedDamageWithSaved.canShowPercent && (
                      <p className="hint">
                        合計HP割合は、防御側HPが保存時と現在で異なるため表示できません。
                      </p>
                    )}
                    {combinedDamagePercentWithSaved && (
                      <div className="hp-visual">
                        <div className="hp-visual-head">
                          <strong>HPバー（保存済み＋今回 合計）</strong>
                          <span>
                            {toPercentText(combinedDamagePercentWithSaved.min)} -{" "}
                            {toPercentText(combinedDamagePercentWithSaved.max)}
                          </span>
                        </div>
                        <div className="hp-bar">
                          <div
                            className="hp-bar-min"
                            style={{
                              width: `${clampPercent(combinedDamagePercentWithSaved.min)}%`,
                            }}
                          />
                          <div
                            className="hp-bar-range"
                            style={{
                              left: `${clampPercent(combinedDamagePercentWithSaved.min)}%`,
                              width: `${Math.max(
                                0,
                                clampPercent(combinedDamagePercentWithSaved.max) -
                                  clampPercent(combinedDamagePercentWithSaved.min)
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="hp-remaining">
                          残HP:{" "}
                          {remainingPercentRangeText(
                            combinedDamagePercentWithSaved.min,
                            combinedDamagePercentWithSaved.max
                          )}
                        </p>
                      </div>
                    )}
                    <div className="actions">
                      <button
                        className="ghost"
                        onClick={() =>
                          setSavedDamages((prev) =>
                            prev.filter((entry) => entry.id !== selectedSavedDamageId)
                          )
                        }
                      >
                        選択中の保存ダメージを外す
                      </button>
                      <button
                        className="ghost"
                        onClick={() => setSavedDamages([])}
                      >
                        保存ダメージをすべてクリア
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "party" && (
        <section className="panel">
          <div className="card wide">
            <h2>パーティ保存</h2>
            <div className="field">
              <label>パーティ名</label>
              <input
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="シーズンX用"
              />
            </div>
            <div className="party-grid">
              {partyMembers.map((member, idx) => {
                const memberActual = calculateStats(member);
                const memberSpeedMultiplier = getSpeedMultiplier(member.item);
                const memberName = member.name.trim();
                const memberSelectValue = pokemonOptionSet.has(memberName) ? member.name : "";
                const availableMoves = partyMoveOptions[idx] ?? [];
                return (
                  <div key={idx} className="party-card">
                  <div className="party-header">
                    <h3>#{idx + 1}</h3>
                    <div className="field" style={{ marginBottom: 0, width: "100%" }}>
                      <input
                        list="pokemon-name-options"
                        value={member.name}
                        onChange={(e) => handlePartyMemberNameInput(idx, e.target.value)}
                        onBlur={() => handlePartyMemberNameCommit(idx)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handlePartyMemberNameCommit(idx);
                          }
                        }}
                        placeholder="ポケモン名を検索"
                      />
                      <select
                        value={memberSelectValue}
                        onChange={(e) => handlePartyMemberNameInput(idx, e.target.value)}
                      >
                        <option value="">ドロップダウンから選択</option>
                        {pokemonOptions.map((name) => (
                          <option key={`${idx}-poke-${name}`} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label>保存済みポケモン呼び出し</label>
                    <select
                      value=""
                      onChange={(e) =>
                        applySavedPokemonToPartyMember(idx, e.target.value)
                      }
                    >
                      <option value="">選択してください</option>
                      {savedPokemonOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="actions">
                    <input
                      value={partySaveLabels[idx] ?? ""}
                      onChange={(e) =>
                        setPartySaveLabels((prev) =>
                          prev.map((label, i) => (i === idx ? e.target.value : label))
                        )
                      }
                      placeholder="保存ラベル（任意）"
                    />
                    <button
                      className="ghost"
                      onClick={() => {
                        savePokemonPreset(member, partySaveLabels[idx]);
                        setPartySaveLabels((prev) =>
                          prev.map((label, i) => (i === idx ? "" : label))
                        );
                      }}
                    >
                      この調整を保存
                    </button>
                  </div>
                  <div className="inline-fields">
                      <div>
                        <label>レベル</label>
                        <input
                          type="number"
                          value={member.level}
                          onChange={(e) =>
                            updatePartyMember(idx, { level: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label>性格</label>
                        <select
                          value={member.nature}
                          onChange={(e) =>
                            updatePartyMember(idx, { nature: e.target.value })
                          }
                        >
                          {NATURE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label>持ち物</label>
                        <select
                          value={member.item ?? ""}
                          onChange={(e) =>
                            updatePartyMember(idx, { item: e.target.value })
                          }
                        >
                          <option value="">なし</option>
                          {member.item &&
                            !ITEM_OPTIONS.some(
                              (option) => option.value === member.item
                            ) && (
                              <option value={member.item}>
                                カスタム: {member.item}
                              </option>
                            )}
                          {ITEM_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label>タイプ</label>
                        <input
                          value={member.types.map(toTypeJa).join(" / ")}
                          onChange={(e) =>
                            updatePartyMember(idx, {
                              types: e.target.value
                                .split("/")
                                .map((t) => toTypeEn(t.trim()))
                                .filter(Boolean),
                            })
                          }
                          placeholder="でんき"
                        />
                      </div>
                    </div>
                    <div className="stat-section">
                      <p className="stat-title">種族値</p>
                      <div className="stat-grid">
                        {([
                          ["hp", "HP"],
                          ["atk", "攻撃"],
                          ["def", "防御"],
                          ["spa", "特攻"],
                          ["spd", "特防"],
                          ["spe", "素早さ"],
                        ] as [keyof StatBlock, string][]).map(([key, label]) => (
                          <div key={key}>
                            <label>{label}</label>
                            <input
                              type="number"
                              value={member.stats[key]}
                              onChange={(e) =>
                                updatePartyStat(idx, key, Number(e.target.value))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="stat-section">
                      <p className="stat-title">能力ポイント</p>
                      <div className="stat-grid">
                        {([
                          ["hp", "HP"],
                          ["atk", "攻撃"],
                          ["def", "防御"],
                          ["spa", "特攻"],
                          ["spd", "特防"],
                          ["spe", "素早さ"],
                        ] as [keyof StatBlock, string][]).map(([key, label]) => (
                          <div key={`${key}-ev`}>
                            <label>{label}</label>
                            <input
                              type="number"
                              min={0}
                              max={MAX_STAT_POINT_PER_STAT}
                              step={1}
                              value={member.evs[key]}
                              onChange={(e) =>
                                updatePartyMember(idx, {
                                  evs: clampEvsTotal(
                                    {
                                      ...member.evs,
                                      [key]: clampEvValue(Number(e.target.value)),
                                    },
                                    key
                                  ),
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                      <p
                        className={
                          totalEvs(member.evs) > MAX_STAT_POINT_TOTAL ? "ev-total warn" : "ev-total"
                        }
                      >
                        能力ポイント合計: {totalEvs(member.evs)} / {MAX_STAT_POINT_TOTAL}
                      </p>
                      {totalEvs(member.evs) > MAX_STAT_POINT_TOTAL && (
                        <p className="ev-warning">能力ポイントが66を超えています。</p>
                      )}
                      <div className="ev-actions">
                        <button
                          className="ghost"
                          onClick={() =>
                            updatePartyMember(idx, {
                              evs: normalizeEvs(member.evs),
                            })
                          }
                        >
                          自動調整（66）
                        </button>
                        {EV_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            className="ghost"
                            onClick={() =>
                              updatePartyMember(idx, {
                                evs: applyEvPreset(preset.values),
                              })
                            }
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="stat-section">
                      <p className="stat-title">実数値</p>
                      <div className="stat-grid">
                        {([
                          ["hp", "HP"],
                          ["atk", "攻撃"],
                          ["def", "防御"],
                          ["spa", "特攻"],
                          ["spd", "特防"],
                          ["spe", "素早さ"],
                        ] as [keyof StatBlock, string][]).map(([key, label]) => {
                          const cls = natureClass(member.nature, key);
                          const displayValue =
                            key === "spe"
                              ? Math.floor(memberActual.spe * memberSpeedMultiplier)
                              : memberActual[key];
                          return (
                            <div key={`${key}-actual`}>
                              <label
                                className={`stat-label ${cls}`}
                                title={
                                  cls === "up"
                                    ? "性格補正: ↑"
                                    : cls === "down"
                                    ? "性格補正: ↓"
                                    : "性格補正なし"
                                }
                              >
                                {label}
                                {cls === "up" && <span className="stat-arrow">↑</span>}
                                {cls === "down" && (
                                  <span className="stat-arrow">↓</span>
                                )}
                                {key === "spe" && memberSpeedMultiplier !== 1 && (
                                  <span className="stat-mult">
                                    x{memberSpeedMultiplier.toFixed(1)}
                                  </span>
                                )}
                              </label>
                              <input type="number" value={displayValue} readOnly />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="field">
                      <label>技選択（4枠）</label>
                      <div className="inline-fields">
                        {Array.from({ length: PARTY_MOVE_SLOTS }, (_, slot) => {
                          const selectedMove = member.moves[slot] ?? "";
                          const selectValue = availableMoves.includes(selectedMove)
                            ? selectedMove
                            : "";
                          return (
                            <div key={`party-move-${idx}-${slot}`}>
                              <label>技{slot + 1}</label>
                              <select
                                value={selectValue}
                                onChange={(e) =>
                                  updatePartyMemberMove(idx, slot, e.target.value)
                                }
                                disabled={availableMoves.length === 0}
                              >
                                <option value="">
                                  {availableMoves.length === 0
                                    ? "ポケモン選択後に候補表示"
                                    : "ドロップダウンから選択"}
                                </option>
                                {selectedMove &&
                                  !availableMoves.includes(selectedMove) && (
                                    <option value={selectedMove}>{selectedMove}</option>
                                  )}
                                {availableMoves.map((option) => (
                                  <option key={`${idx}-move-${slot}-${option}`} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="field">
                      <label>メモ</label>
                      <input
                        value={member.notes ?? ""}
                        onChange={(e) => updatePartyMember(idx, { notes: e.target.value })}
                        placeholder="こだわりスカーフ"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="actions">
              <button className="primary" onClick={handleSaveParty}>
                パーティ保存 + ログ記録
              </button>
            </div>
          </div>

          <div className="card wide">
            <h2>保存済みパーティ</h2>
            {parties.length === 0 && <p className="hint">まだ保存されていません。</p>}
            <div className="saved-list">
              {parties.map((party) => (
                <div key={party.id} className="saved-item">
                  <div>
                    <strong>{party.name}</strong>
                    <span>{party.members.map((m) => displayName(m)).join(" / ")}</span>
                  </div>
                  <div className="saved-actions">
                    <button onClick={() => handleLoadParty(party)}>読み込み</button>
                    <button className="ghost" onClick={() => handleDeleteParty(party.id)}>
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card wide">
            <h2>保存済みポケモン</h2>
            {savedPokemon.length === 0 && (
              <p className="hint">まだ保存されていません。</p>
            )}
            <div className="saved-list">
              {savedPokemon.map((saved) => (
                <div key={saved.id} className="saved-item">
                  <div>
                    <strong>{saved.label}</strong>
                    <span>{saved.pokemon.moves.join(" / ")}</span>
                    <textarea
                      value={saved.memo ?? ""}
                      onChange={(e) => updateSavedPokemonMemo(saved.id, e.target.value)}
                      placeholder="メモ"
                    />
                  </div>
                  <div className="saved-actions">
                    <button className="ghost" onClick={() => deleteSavedPokemon(saved.id)}>
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "register" && (
        <section className="panel">
          <datalist id="pokemon-name-options-register">
            {pokemonOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <div className="card wide">
            <h2>保存ポケモン登録</h2>
            <div className="field">
              <label>ポケモン名（検索）</label>
              <input
                list="pokemon-name-options-register"
                value={registerPokemon.name}
                onChange={(e) => handleRegisterPokemonNameInput(e.target.value)}
                onBlur={handleRegisterPokemonNameCommit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleRegisterPokemonNameCommit();
                  }
                }}
                placeholder="ピカチュウ"
              />
              <select
                value={
                  pokemonOptionSet.has(registerPokemon.name.trim())
                    ? registerPokemon.name
                    : ""
                }
                onChange={(e) => handleRegisterPokemonNameInput(e.target.value)}
              >
                <option value="">ドロップダウンから選択</option>
                {pokemonOptions.map((name) => (
                  <option key={`register-poke-${name}`} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>保存ラベル（任意）</label>
              <input
                value={registerSaveLabel}
                onChange={(e) => setRegisterSaveLabel(e.target.value)}
                placeholder="例: 物理エース用"
              />
            </div>
            <div className="inline-fields">
              <div>
                <label>性格</label>
                <select
                  value={registerPokemon.nature}
                  onChange={(e) =>
                    setRegisterPokemon((prev) => ({ ...prev, nature: e.target.value }))
                  }
                >
                  {NATURE_OPTIONS.map((option) => (
                    <option key={`register-nature-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>持ち物</label>
                <select
                  value={registerPokemon.item ?? ""}
                  onChange={(e) =>
                    setRegisterPokemon((prev) => ({ ...prev, item: e.target.value }))
                  }
                >
                  <option value="">なし</option>
                  {registerPokemon.item &&
                    !ITEM_OPTIONS.some((option) => option.value === registerPokemon.item) && (
                      <option value={registerPokemon.item}>
                        カスタム: {registerPokemon.item}
                      </option>
                    )}
                  {ITEM_OPTIONS.map((option) => (
                    <option key={`register-item-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>メモ</label>
              <textarea
                value={registerPokemon.notes ?? ""}
                onChange={(e) =>
                  setRegisterPokemon((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="調整意図や役割メモ"
              />
            </div>
            <div className="stat-section">
              <p className="stat-title">能力ポイント</p>
              <div className="stat-grid">
                {([
                  ["hp", "HP"],
                  ["atk", "攻撃"],
                  ["def", "防御"],
                  ["spa", "特攻"],
                  ["spd", "特防"],
                  ["spe", "素早さ"],
                ] as [keyof StatBlock, string][]).map(([key, label]) => (
                  <div key={`register-${key}-ev`}>
                    <label>{label}</label>
                    <input
                      type="number"
                      min={0}
                      max={MAX_STAT_POINT_PER_STAT}
                      step={1}
                      value={registerPokemon.evs[key]}
                      onChange={(e) =>
                        setRegisterPokemon((prev) => {
                          const next = {
                            ...prev.evs,
                            [key]: clampEvValue(Number(e.target.value)),
                          };
                          return { ...prev, evs: clampEvsTotal(next, key) };
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              <p className={registerEvTotal > MAX_STAT_POINT_TOTAL ? "ev-total warn" : "ev-total"}>
                能力ポイント合計: {registerEvTotal} / {MAX_STAT_POINT_TOTAL}
              </p>
              {registerEvTotal > MAX_STAT_POINT_TOTAL && (
                <p className="ev-warning">能力ポイントが66を超えています。</p>
              )}
              <div className="ev-actions">
                <button
                  className="ghost"
                  onClick={() =>
                    setRegisterPokemon((prev) => ({
                      ...prev,
                      evs: normalizeEvs(prev.evs),
                    }))
                  }
                >
                  自動調整（66）
                </button>
                {EV_PRESETS.map((preset) => (
                  <button
                    key={`register-preset-${preset.label}`}
                    className="ghost"
                    onClick={() =>
                      setRegisterPokemon((prev) => ({
                        ...prev,
                        evs: applyEvPreset(preset.values),
                      }))
                    }
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>技選択（4枠）</label>
              <div className="inline-fields">
                {Array.from({ length: PARTY_MOVE_SLOTS }, (_, slot) => {
                  const selectedMove = registerPokemon.moves[slot] ?? "";
                  const selectValue = registerMoveOptions.includes(selectedMove)
                    ? selectedMove
                    : "";
                  return (
                    <div key={`register-move-${slot}`}>
                      <label>技{slot + 1}</label>
                      <select
                        value={selectValue}
                        onChange={(e) => updateRegisterPokemonMove(slot, e.target.value)}
                        disabled={registerMoveOptions.length === 0}
                      >
                        <option value="">
                          {registerMoveOptions.length === 0
                            ? "ポケモン選択後に候補表示"
                            : "ドロップダウンから選択"}
                        </option>
                        {registerMoveOptions.map((option) => (
                          <option key={`register-move-option-${slot}-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="actions">
              <button className="primary" onClick={handleRegisterSavedPokemon}>
                保存ポケモンとして登録
              </button>
            </div>
            {busy === "register" && <p className="hint">登録用ポケモンを反映中...</p>}
          </div>
        </section>
      )}

      {tab === "log" && (
        <section className="panel">
          <div className="card wide">
            <h2>保存済みポケモン一覧</h2>
            {savedPokemon.length === 0 && (
              <p className="hint">まだ保存されていません。</p>
            )}
            <div className="saved-list">
              {savedPokemon.map((saved) => (
                <div key={saved.id} className="saved-item">
                  <div>
                    <strong>{saved.label}</strong>
                    <span>{saved.pokemon.moves.join(" / ")}</span>
                    <textarea
                      value={saved.memo ?? ""}
                      onChange={(e) => updateSavedPokemonMemo(saved.id, e.target.value)}
                      placeholder="メモ"
                    />
                  </div>
                  <div className="saved-actions">
                    <span className="meta">{formatDate(saved.createdAt)}</span>
                    <button className="ghost" onClick={() => deleteSavedPokemon(saved.id)}>
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;





