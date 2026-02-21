import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ensureTenantAccess } from "../utils/tenant";

const cadenceSchema = z.enum(["daily", "weekly", "monthly"]);
const targetTypeSchema = z.enum(["count", "duration"]);

export async function registerHabitRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/habits",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const querySchema = z.object({
        tenant_id: z.string().uuid(),
        active: z.coerce.boolean().optional(),
      });

      const query = querySchema.parse(request.query);
      const userId = request.user!.id;

      const allowed = await ensureTenantAccess(fastify, userId, query.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const habits = await fastify.prisma.jarvisHabit.findMany({
        where: {
          tenant_id: query.tenant_id,
          ...(query.active !== undefined ? { active: query.active } : {}),
        },
        orderBy: { created_at: "desc" },
      });

      return habits;
    }
  );

  fastify.get(
    "/habits/logs",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const querySchema = z.object({
        tenant_id: z.string().uuid(),
        habit_id: z.string().uuid().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
      });

      const query = querySchema.parse(request.query);
      const userId = request.user!.id;

      const allowed = await ensureTenantAccess(fastify, userId, query.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const where: Record<string, unknown> = { tenant_id: query.tenant_id };
      if (query.habit_id) where.habit_id = query.habit_id;
      if (query.start_date || query.end_date) {
        where.log_date = {};
        if (query.start_date) (where.log_date as any).gte = new Date(query.start_date);
        if (query.end_date) (where.log_date as any).lte = new Date(query.end_date);
      }

      const logs = await fastify.prisma.jarvisHabitLog.findMany({
        where,
        orderBy: { log_date: "desc" },
      });

      return logs;
    }
  );

  fastify.post(
    "/habits",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodySchema = z.object({
        tenant_id: z.string().uuid(),
        title: z.string().min(1),
        cadence: cadenceSchema.optional(),
        times_per_cadence: z.number().int().min(1).optional(),
        target_type: targetTypeSchema.optional(),
        target_value: z.number().positive().optional(),
      });

      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      const allowed = await ensureTenantAccess(fastify, userId, data.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const created = await fastify.prisma.jarvisHabit.create({
        data: {
          tenant_id: data.tenant_id,
          created_by: userId,
          title: data.title,
          cadence: data.cadence ?? "weekly",
          times_per_cadence: data.times_per_cadence ?? 3,
          target_type: data.target_type ?? "count",
          target_value: data.target_value ?? 1,
          active: true,
        },
      });

      reply.code(201);
      return created;
    }
  );

  fastify.patch(
    "/habits/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        title: z.string().min(1).optional(),
        cadence: cadenceSchema.optional(),
        times_per_cadence: z.number().int().min(1).optional(),
        target_type: targetTypeSchema.optional(),
        target_value: z.number().positive().optional(),
        active: z.boolean().optional(),
      });

      const { id } = paramsSchema.parse(request.params);
      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      if (Object.keys(data).length === 0) {
        reply.code(400);
        return { error: "Nada para atualizar" };
      }

      const existing = await fastify.prisma.jarvisHabit.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!existing) {
        reply.code(404);
        return { error: "Hábito não encontrado" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, existing.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const updated = await fastify.prisma.jarvisHabit.update({
        where: { id },
        data,
      });

      return updated;
    }
  );

  fastify.delete(
    "/habits/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const existing = await fastify.prisma.jarvisHabit.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!existing) {
        reply.code(404);
        return { error: "Hábito não encontrado" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, existing.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const updated = await fastify.prisma.jarvisHabit.update({
        where: { id },
        data: { active: false },
      });

      return updated;
    }
  );

  fastify.post(
    "/habits/:id/logs",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        value: z.number().positive().optional(),
        date: z.string().optional(),
      });

      const { id } = paramsSchema.parse(request.params);
      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      const habit = await fastify.prisma.jarvisHabit.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!habit) {
        reply.code(404);
        return { error: "Hábito não encontrado" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, habit.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      let logDate = new Date();
      if (data.date) {
        const parsed = new Date(data.date);
        if (Number.isNaN(parsed.getTime())) {
          reply.code(400);
          return { error: "Data inválida" };
        }
        logDate = parsed;
      }
      const dateKey = new Date(Date.UTC(logDate.getFullYear(), logDate.getMonth(), logDate.getDate()));

      const existingLog = await fastify.prisma.jarvisHabitLog.findFirst({
        where: {
          habit_id: id,
          log_date: dateKey,
        },
        select: { id: true },
      });

      if (existingLog) {
        const updated = await fastify.prisma.jarvisHabitLog.update({
          where: { id: existingLog.id },
          data: { value: data.value ?? 1 },
        });
        return updated;
      }

      const created = await fastify.prisma.jarvisHabitLog.create({
        data: {
          tenant_id: habit.tenant_id,
          habit_id: id,
          user_id: userId,
          log_date: dateKey,
          value: data.value ?? 1,
        },
      });

      reply.code(201);
      return created;
    }
  );
}
