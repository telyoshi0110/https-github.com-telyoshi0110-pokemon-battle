import { LogEntry, Party, PokemonInput, SavedDamageCalc, SavedPokemon } from "../types";

const PARTY_KEY = "pb.parties";
const LOG_KEY = "pb.logs";
const SAVED_POKEMON_KEY = "pb.savedPokemon";
const SAVED_DAMAGE_KEY = "pb.savedDamage";

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function loadParties(): Party[] {
  return safeParse<Party[]>(localStorage.getItem(PARTY_KEY), []);
}

export function saveParties(parties: Party[]): void {
  localStorage.setItem(PARTY_KEY, JSON.stringify(parties));
}

export function loadLogs(): LogEntry[] {
  return safeParse<LogEntry[]>(localStorage.getItem(LOG_KEY), []);
}

export function saveLogs(logs: LogEntry[]): void {
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
}

export function loadSavedPokemon(): SavedPokemon[] {
  return safeParse<SavedPokemon[]>(localStorage.getItem(SAVED_POKEMON_KEY), []);
}

export function saveSavedPokemon(saved: SavedPokemon[]): void {
  localStorage.setItem(SAVED_POKEMON_KEY, JSON.stringify(saved));
}

export function loadSavedDamage(): SavedDamageCalc[] {
  return safeParse<SavedDamageCalc[]>(localStorage.getItem(SAVED_DAMAGE_KEY), []);
}

export function saveSavedDamage(saved: SavedDamageCalc[]): void {
  localStorage.setItem(SAVED_DAMAGE_KEY, JSON.stringify(saved));
}

export function addLog(
  logs: LogEntry[],
  source: "damage" | "party",
  pokemon: PokemonInput[],
  details: string
): LogEntry[] {
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    source,
    pokemon,
    details,
  };
  return [entry, ...logs];
}
