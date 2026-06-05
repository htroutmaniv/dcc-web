import type { CharacterNameKind } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

let cachedFirstNames: string[] | null = null;
let cachedLastNames: string[] | null = null;

async function loadNamesByKind(kind: CharacterNameKind): Promise<string[]> {
  const rows = await prisma.characterName.findMany({
    where: { kind },
    orderBy: { sortOrder: 'asc' },
    select: { name: true },
  });
  if (rows.length === 0) {
    throw new Error(
      `Character ${kind} names table is empty. Run: bun run db:seed (from repo root) or apps/api.`,
    );
  }
  return rows.map((row) => row.name);
}

export async function loadCharacterNamesFromDb(): Promise<void> {
  const [firstNames, lastNames] = await Promise.all([
    loadNamesByKind('first'),
    loadNamesByKind('last'),
  ]);
  cachedFirstNames = firstNames;
  cachedLastNames = lastNames;
}

export async function ensureCharacterNamesLoaded(): Promise<void> {
  if (!cachedFirstNames || !cachedLastNames) {
    await loadCharacterNamesFromDb();
  }
}

function getFirstNames(): string[] {
  if (!cachedFirstNames) {
    throw new Error('Character names not loaded — server startup must call ensureCharacterNamesLoaded()');
  }
  return cachedFirstNames;
}

function getLastNames(): string[] {
  if (!cachedLastNames) {
    throw new Error('Character names not loaded — server startup must call ensureCharacterNamesLoaded()');
  }
  return cachedLastNames;
}

/** Pick a random "First Last" name from the DCC name tables. */
export function rollRandomCharacterName(
  pickIndex: (min: number, max: number) => number,
): string {
  const first = getFirstNames()[pickIndex(0, getFirstNames().length - 1)]!;
  const last = getLastNames()[pickIndex(0, getLastNames().length - 1)]!;
  return `${first} ${last}`;
}

export function clearCharacterNameCache(): void {
  cachedFirstNames = null;
  cachedLastNames = null;
}
