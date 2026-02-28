import type { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ensureTenantAccess } from "../utils/tenant.js";

export async function registerMemoryRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/memory",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const querySchema = z.object({
        tenant_id: z.string().uuid(),
        limit: z.coerce.number().int().min(1).max(500).optional(),
      });

      const query = querySchema.parse(request.query);
      const userId = request.user!.id;

      const allowed = await ensureTenantAccess(fastify, userId, query.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const items = await fastify.prisma.jarvisMemoryItem.findMany({
        where: { tenant_id: query.tenant_id },
        orderBy: { created_at: "desc" },
        take: query.limit ?? 500,
      });

      return items;
    }
  );

  fastify.post(
    "/memory",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodySchema = z.object({
        tenant_id: z.string().uuid(),
        kind: z.string().min(1),
        content: z.string().min(1),
        title: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
        source: z.string().optional(),
      });

      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      const allowed = await ensureTenantAccess(fastify, userId, data.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const created = await fastify.prisma.jarvisMemoryItem.create({
        data: {
          tenant_id: data.tenant_id,
          user_id: userId,
          kind: data.kind,
          title: data.title ?? null,
          content: data.content,
          metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
          source: data.source ?? "manual",
        },
      });

      reply.code(201);
      return created;
    }
  );

  fastify.delete(
    "/memory/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const existing = await fastify.prisma.jarvisMemoryItem.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!existing) {
        reply.code(404);
        return { error: "Memória não encontrada" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, existing.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      await fastify.prisma.jarvisMemoryItem.delete({ where: { id } });
      return { ok: true };
    }
  );
}
