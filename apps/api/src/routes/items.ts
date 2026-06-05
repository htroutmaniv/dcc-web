import { itemCatalogQuerySchema } from '@dcc-web/shared';
import type { ItemCategory } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

export async function itemRoutes(app: FastifyInstance) {
  app.get(
    '/items/catalog',
    { onRequest: [app.authenticate] },
    async (request) => {
      const parsed = itemCatalogQuerySchema.safeParse(request.query);
      if (!parsed.success) return app.httpErrors.badRequest(parsed.error.message);

      const { category, q, limit } = parsed.data;
      try {
        const rows = await prisma.itemCatalog.findMany({
          where: {
            category: category as ItemCategory,
            ...(q?.trim()
              ? { name: { contains: q.trim(), mode: 'insensitive' as const } }
              : {}),
          },
          orderBy: { name: 'asc' },
          take: limit,
        });
        return { items: rows };
      } catch (e) {
        const code = e && typeof e === 'object' && 'code' in e ? String(e.code) : '';
        if (code === 'P2021' || code === 'P2022') {
          throw app.httpErrors.serviceUnavailable(
            'Item catalog is not ready. Run: bun run db:migrate && bun run db:seed',
          );
        }
        throw e;
      }
    },
  );
}
