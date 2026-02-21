import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ensureTenantAccess } from "../utils/tenant";

const prioritySchema = z.enum(["low", "medium", "high"]);
const statusSchema = z.enum(["scheduled", "cancelled", "completed"]);

export async function registerEventRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/events",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const querySchema = z.object({
        tenant_id: z.string().uuid(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(500).optional(),
      });

      const query = querySchema.parse(request.query);
      const userId = request.user!.id;

      const allowed = await ensureTenantAccess(fastify, userId, query.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const where: Record<string, unknown> = { tenant_id: query.tenant_id };

      if (query.start_date || query.end_date) {
        where.start_at = {};
        if (query.start_date) {
          (where.start_at as any).gte = new Date(query.start_date);
        }
        if (query.end_date) {
          (where.start_at as any).lte = new Date(query.end_date);
        }
      }

      const events = await fastify.prisma.jarvisEvent.findMany({
        where,
        orderBy: { start_at: "asc" },
        take: query.limit ?? 500,
      });

      return events;
    }
  );

  fastify.post(
    "/events",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodySchema = z.object({
        tenant_id: z.string().uuid(),
        title: z.string().min(1),
        description: z.string().optional(),
        location: z.string().optional(),
        start_at: z.string(),
        end_at: z.string().optional().nullable(),
        all_day: z.boolean().optional(),
        priority: prioritySchema.optional(),
      });

      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      const allowed = await ensureTenantAccess(fastify, userId, data.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const startAt = new Date(data.start_at);
      if (Number.isNaN(startAt.getTime())) {
        reply.code(400);
        return { error: "Data inválida" };
      }
      let endAt: Date | null = null;
      if (data.end_at !== undefined && data.end_at !== null) {
        endAt = new Date(data.end_at);
        if (Number.isNaN(endAt.getTime())) {
          reply.code(400);
          return { error: "Data inválida" };
        }
      }

      const created = await fastify.prisma.jarvisEvent.create({
        data: {
          tenant_id: data.tenant_id,
          created_by: userId,
          title: data.title,
          description: data.description ?? null,
          location: data.location ?? null,
          start_at: startAt,
          end_at: endAt,
          all_day: data.all_day ?? false,
          priority: data.priority ?? "medium",
          status: "scheduled",
          source: "manual",
        },
      });

      reply.code(201);
      return created;
    }
  );

  fastify.patch(
    "/events/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        start_at: z.string().optional(),
        end_at: z.string().nullable().optional(),
        all_day: z.boolean().optional(),
        priority: prioritySchema.optional(),
        status: statusSchema.optional(),
      });

      const { id } = paramsSchema.parse(request.params);
      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      if (Object.keys(data).length === 0) {
        reply.code(400);
        return { error: "Nada para atualizar" };
      }

      const existing = await fastify.prisma.jarvisEvent.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!existing) {
        reply.code(404);
        return { error: "Evento não encontrado" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, existing.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const updateData: Record<string, unknown> = { ...data };
      if (data.start_at) {
        const startAt = new Date(data.start_at);
        if (Number.isNaN(startAt.getTime())) {
          reply.code(400);
          return { error: "Data inválida" };
        }
        updateData.start_at = startAt;
      }
      if (data.end_at !== undefined) {
        if (data.end_at === null) {
          updateData.end_at = null;
        } else {
          const endAt = new Date(data.end_at);
          if (Number.isNaN(endAt.getTime())) {
            reply.code(400);
            return { error: "Data inválida" };
          }
          updateData.end_at = endAt;
        }
      }

      const updated = await fastify.prisma.jarvisEvent.update({
        where: { id },
        data: updateData,
      });

      return updated;
    }
  );

  fastify.delete(
    "/events/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const existing = await fastify.prisma.jarvisEvent.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!existing) {
        reply.code(404);
        return { error: "Evento não encontrado" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, existing.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      await fastify.prisma.jarvisEvent.delete({ where: { id } });
      return { ok: true };
    }
  );
}
