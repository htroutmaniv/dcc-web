import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

let archivedColumnKnown: boolean | null = null;

export async function charactersHaveArchivedAt(tx: Tx): Promise<boolean> {
  if (archivedColumnKnown != null) return archivedColumnKnown;
  const rows = await tx.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'characters'
        AND column_name = 'archived_at'
    ) AS exists
  `;
  archivedColumnKnown = Boolean(rows[0]?.exists);
  return archivedColumnKnown;
}

/** Updates status timestamps without relying on Prisma model fields (works with stale clients). */
export async function applyCharacterStatus(
  tx: Tx,
  characterId: string,
  status: 'alive' | 'dead' | 'archived',
  options?: { bumpVersion?: boolean },
): Promise<void> {
  const bumpVersion = options?.bumpVersion ?? true;
  const versionClause = bumpVersion ? Prisma.sql`version = version + 1,` : Prisma.empty;
  const hasArchivedAt = await charactersHaveArchivedAt(tx);

  if (status === 'archived') {
    if (!hasArchivedAt) {
      throw new Error('CHARACTER_ARCHIVE_MIGRATION_REQUIRED');
    }
    await tx.$executeRaw`
      UPDATE characters
      SET status = 'archived'::"CharacterStatus",
          archived_at = NOW(),
          died_at = NULL,
          ${versionClause}
          updated_at = NOW()
      WHERE id = ${characterId}::uuid
    `;
    return;
  }

  const diedAt = status === 'dead' ? new Date() : null;

  if (hasArchivedAt) {
    await tx.$executeRaw`
      UPDATE characters
      SET status = ${status}::"CharacterStatus",
          died_at = ${diedAt},
          archived_at = NULL,
          ${versionClause}
          updated_at = NOW()
      WHERE id = ${characterId}::uuid
    `;
    return;
  }

  await tx.$executeRaw`
    UPDATE characters
    SET status = ${status}::"CharacterStatus",
        died_at = ${diedAt},
        ${versionClause}
        updated_at = NOW()
    WHERE id = ${characterId}::uuid
  `;
}
