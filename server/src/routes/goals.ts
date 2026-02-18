import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export async function registerGoalRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/goals",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = request.user!.id;

      const goals = await fastify.prisma.goal.findMany({
        where: { user_id: userId, deleted_at: null },
        orderBy: { created_at: "desc" },
      });

      if (goals.length === 0) {
        return {
          goals: [],
          totals: {
            metasAtivas: 0,
            totalAlvo: 0,
            totalEconomizado: 0,
            totalRestante: 0,
          },
        };
      }

      const goalIds = goals.map((g) => g.id);
      const contribs = await fastify.prisma.goalContribution.findMany({
        where: { goal_id: { in: goalIds } },
        orderBy: { data: "desc" },
      });

      const contribMap = new Map<string, typeof contribs>();
      contribs.forEach((c) => {
        const list = contribMap.get(c.goal_id) || [];
        list.push(c);
        contribMap.set(c.goal_id, list);
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const enriched = goals.map((g) => {
        const list = (contribMap.get(g.id) || []).map((c) => ({
          ...c,
          valor: Number(c.valor),
        }));
        const valorMeta = Number(g.valor_meta);
        const economizado = list.reduce((sum, c) => sum + Number(c.valor), 0);
        const percentual = valorMeta > 0 ? Math.round((economizado / valorMeta) * 100) : 0;
        const restante = valorMeta - economizado;
        let diasRestantes: number | null = null;
        if (g.prazo) {
          const diff = new Date(g.prazo).getTime() - today.getTime();
          diasRestantes = Math.ceil(diff / (1000 * 60 * 60 * 24));
        }
        return {
          ...g,
          valor_meta: valorMeta,
          contribuicoes: list,
          economizado,
          percentual,
          restante,
          diasRestantes,
          ultimaContribuicao: list.length > 0 ? list[0] : null,
        };
      });

      const totalAlvo = enriched.reduce((sum, g) => sum + Number(g.valor_meta), 0);
      const totalEconomizado = enriched.reduce((sum, g) => sum + (g.economizado || 0), 0);
      const totalRestante = Math.max(0, totalAlvo - totalEconomizado);

      return {
        goals: enriched,
        totals: {
          metasAtivas: enriched.length,
          totalAlvo,
          totalEconomizado,
          totalRestante,
        },
      };
    }
  );

  fastify.post(
    "/goals",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodySchema = z.object({
        nome: z.string().min(1),
        valor_meta: z.number().positive(),
        prazo: z.string().optional(),
      });

      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      const created = await fastify.prisma.goal.create({
        data: {
          user_id: userId,
          nome: data.nome,
          valor_meta: new Prisma.Decimal(data.valor_meta),
          prazo: data.prazo ? new Date(data.prazo) : null,
        },
      });

      reply.code(201);
      return {
        ...created,
        valor_meta: Number(created.valor_meta),
      };
    }
  );

  fastify.patch(
    "/goals/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        nome: z.string().min(1).optional(),
        valor_meta: z.number().positive().optional(),
        prazo: z.string().optional(),
      });

      const { id } = paramsSchema.parse(request.params);
      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      if (Object.keys(data).length === 0) {
        reply.code(400);
        return { error: "Nada para atualizar" };
      }

      const updateData: Prisma.GoalUpdateManyMutationInput = {
        ...data,
      };

      if (data.valor_meta !== undefined) {
        updateData.valor_meta = new Prisma.Decimal(data.valor_meta);
      }
      if (data.prazo !== undefined) {
        updateData.prazo = data.prazo ? new Date(data.prazo) : null;
      }

      const updated = await fastify.prisma.goal.updateMany({
        where: { id, user_id: userId, deleted_at: null },
        data: updateData,
      });

      if (updated.count === 0) {
        reply.code(404);
        return { error: "Meta não encontrada" };
      }

      return { ok: true };
    }
  );

  fastify.delete(
    "/goals/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const updated = await fastify.prisma.goal.updateMany({
        where: { id, user_id: userId, deleted_at: null },
        data: { deleted_at: new Date() },
      });

      if (updated.count === 0) {
        reply.code(404);
        return { error: "Meta não encontrada" };
      }

      return { ok: true };
    }
  );

  fastify.post(
    "/goals/:id/contributions",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        valor: z.number().positive(),
        data: z.string(),
      });

      const { id } = paramsSchema.parse(request.params);
      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      const goal = await fastify.prisma.goal.findFirst({
        where: { id, user_id: userId, deleted_at: null },
        select: { id: true },
      });

      if (!goal) {
        reply.code(404);
        return { error: "Meta não encontrada" };
      }

      const created = await fastify.prisma.goalContribution.create({
        data: {
          goal_id: id,
          valor: new Prisma.Decimal(data.valor),
          data: new Date(data.data),
        },
      });

      reply.code(201);
      return {
        ...created,
        valor: Number(created.valor),
      };
    }
  );

  fastify.delete(
    "/goals/contributions/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const contrib = await fastify.prisma.goalContribution.findFirst({
        where: { id },
        select: { goal_id: true },
      });

      if (!contrib) {
        reply.code(404);
        return { error: "Contribuição não encontrada" };
      }

      const goal = await fastify.prisma.goal.findFirst({
        where: { id: contrib.goal_id, user_id: userId, deleted_at: null },
        select: { id: true },
      });

      if (!goal) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      await fastify.prisma.goalContribution.delete({ where: { id } });
      return { ok: true };
    }
  );
}
