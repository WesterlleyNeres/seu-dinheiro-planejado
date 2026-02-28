import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ensureTenantAccess } from "../utils/tenant.js";

const channelSchema = z.enum(["whatsapp", "email", "push"]);
const statusSchema = z.enum(["pending", "sent", "dismissed", "canceled"]);

export async function registerReminderRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/reminders",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const querySchema = z.object({
        tenant_id: z.string().uuid(),
        status: statusSchema.optional(),
      });

      const query = querySchema.parse(request.query);
      const userId = request.user!.id;

      const allowed = await ensureTenantAccess(fastify, userId, query.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const reminders = await fastify.prisma.jarvisReminder.findMany({
        where: {
          tenant_id: query.tenant_id,
          ...(query.status ? { status: query.status } : {}),
        },
        orderBy: { remind_at: "asc" },
      });

      return reminders;
    }
  );

  fastify.post(
    "/reminders",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodySchema = z.object({
        tenant_id: z.string().uuid(),
        title: z.string().min(1),
        remind_at: z.string(),
        channel: channelSchema.optional(),
      });

      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      const allowed = await ensureTenantAccess(fastify, userId, data.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const remindAt = new Date(data.remind_at);
      if (Number.isNaN(remindAt.getTime())) {
        reply.code(400);
        return { error: "Data inválida" };
      }

      const created = await fastify.prisma.jarvisReminder.create({
        data: {
          tenant_id: data.tenant_id,
          created_by: userId,
          title: data.title,
          remind_at: remindAt,
          channel: data.channel ?? "push",
          status: "pending",
          attempt_count: 0,
        },
      });

      reply.code(201);
      return created;
    }
  );

  fastify.patch(
    "/reminders/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        title: z.string().min(1).optional(),
        remind_at: z.string().optional(),
        channel: channelSchema.optional(),
        status: statusSchema.optional(),
      });

      const { id } = paramsSchema.parse(request.params);
      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      if (Object.keys(data).length === 0) {
        reply.code(400);
        return { error: "Nada para atualizar" };
      }

      const existing = await fastify.prisma.jarvisReminder.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!existing) {
        reply.code(404);
        return { error: "Lembrete não encontrado" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, existing.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const updateData: Record<string, unknown> = { ...data };
      if (data.remind_at) {
        const remindAt = new Date(data.remind_at);
        if (Number.isNaN(remindAt.getTime())) {
          reply.code(400);
          return { error: "Data inválida" };
        }
        updateData.remind_at = remindAt;
      }

      const updated = await fastify.prisma.jarvisReminder.update({
        where: { id },
        data: updateData,
      });

      return updated;
    }
  );

  fastify.delete(
    "/reminders/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const existing = await fastify.prisma.jarvisReminder.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!existing) {
        reply.code(404);
        return { error: "Lembrete não encontrado" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, existing.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      await fastify.prisma.jarvisReminder.delete({ where: { id } });
      return { ok: true };
    }
  );
}
