import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const rolloverPolicySchema = z.enum(["none", "carry_over", "clamp"]);

const resolveCategoryId = async (
  fastify: FastifyInstance,
  userId: string,
  input: string
): Promise<string | null> => {
  if (/^[0-9a-fA-F-]{36}$/.test(input)) return input;

  const category = await fastify.prisma.category.findFirst({
    where: {
      user_id: userId,
      deleted_at: null,
      nome: { contains: input, mode: "insensitive" },
    },
    select: { id: true },
  });

  return category?.id || null;
};

export async function registerBudgetRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/budgets",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const querySchema = z.object({
        year: z.coerce.number().int().optional(),
        month: z.coerce.number().int().min(1).max(12).optional(),
        mode: z.enum(["pagas", "pagas_e_pendentes"]).optional(),
      });

      const { year, month, mode } = querySchema.parse(request.query);
      const userId = request.user!.id;
      const now = new Date();
      const targetYear = year ?? now.getFullYear();
      const targetMonth = month ?? now.getMonth() + 1;
      const modeValue = mode ?? "pagas";
      const statusFilter = modeValue === "pagas" ? ["paga"] : ["paga", "pendente"];

      const budgets = await fastify.prisma.budget.findMany({
        where: {
          user_id: userId,
          ano: targetYear,
          mes: targetMonth,
          deleted_at: null,
        },
        orderBy: { created_at: "desc" },
      });

      if (budgets.length === 0) {
        return {
          budgets: [],
          totals: { orcado: 0, realizado: 0, saldo: 0, percentual: 0 },
        };
      }

      const lastDay = new Date(targetYear, targetMonth, 0).getDate();
      const startDate = new Date(`${targetYear}-${String(targetMonth).padStart(2, "0")}-01`);
      const endDate = new Date(`${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`);

      const transactions = await fastify.prisma.transaction.findMany({
        where: {
          user_id: userId,
          tipo: "despesa",
          status: { in: statusFilter as any },
          data: { gte: startDate, lte: endDate },
          deleted_at: null,
        },
        select: { category_id: true, valor: true },
      });

      const realizedMap = new Map<string, number>();
      transactions.forEach((t) => {
        const current = realizedMap.get(t.category_id) || 0;
        realizedMap.set(t.category_id, current + Number(t.valor));
      });

      const categoryIds = Array.from(new Set(budgets.map((b) => b.category_id)));
      const categories = await fastify.prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, nome: true, tipo: true },
      });
      const categoryMap = new Map(categories.map((c) => [c.id, c]));

      const enriched = budgets.map((b) => {
        const limite = Number(b.limite_valor);
        const realizado = realizedMap.get(b.category_id) || 0;
        const percentual = limite > 0 ? Math.round((realizado / limite) * 1000) / 10 : 0;
        const restante = limite - realizado;
        return {
          ...b,
          limite_valor: limite,
          rollover_cap: b.rollover_cap ? Number(b.rollover_cap) : null,
          category: categoryMap.get(b.category_id) || null,
          realizado,
          percentual,
          restante,
        };
      });

      const totalOrcado = enriched.reduce((sum, b) => sum + Number(b.limite_valor), 0);
      const totalRealizado = enriched.reduce((sum, b) => sum + (b.realizado || 0), 0);
      const totalSaldo = totalOrcado - totalRealizado;
      const totalPercentual = totalOrcado > 0 ? Math.round((totalRealizado / totalOrcado) * 1000) / 10 : 0;

      enriched.sort((a, b) => (b.percentual || 0) - (a.percentual || 0));

      return {
        budgets: enriched,
        totals: {
          orcado: totalOrcado,
          realizado: totalRealizado,
          saldo: totalSaldo,
          percentual: totalPercentual,
        },
      };
    }
  );

  fastify.post(
    "/budgets",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodySchema = z.object({
        category_id: z.string().min(1),
        ano: z.number().int().optional(),
        mes: z.number().int().min(1).max(12).optional(),
        limite_valor: z.number().nonnegative(),
        rollover_policy: rolloverPolicySchema.optional(),
        rollover_cap: z.number().nonnegative().optional(),
      });

      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;
      const now = new Date();
      const ano = data.ano ?? now.getFullYear();
      const mes = data.mes ?? now.getMonth() + 1;

      const resolvedCategoryId = await resolveCategoryId(fastify, userId, data.category_id);
      if (!resolvedCategoryId) {
        reply.code(404);
        return { error: "Categoria não encontrada" };
      }

      const existing = await fastify.prisma.budget.findFirst({
        where: {
          user_id: userId,
          category_id: resolvedCategoryId,
          ano,
          mes,
          deleted_at: null,
        },
        select: { id: true },
      });

      if (existing) {
        reply.code(409);
        return { error: "Orçamento já existe" };
      }

      const created = await fastify.prisma.budget.create({
        data: {
          user_id: userId,
          category_id: resolvedCategoryId,
          ano,
          mes,
          limite_valor: new Prisma.Decimal(data.limite_valor),
          rollover_policy: data.rollover_policy ?? "none",
          rollover_cap: data.rollover_cap ? new Prisma.Decimal(data.rollover_cap) : null,
        },
      });

      reply.code(201);
      return {
        ...created,
        limite_valor: Number(created.limite_valor),
        rollover_cap: created.rollover_cap ? Number(created.rollover_cap) : null,
      };
    }
  );

  fastify.patch(
    "/budgets/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        limite_valor: z.number().nonnegative().optional(),
        rollover_policy: rolloverPolicySchema.optional(),
        rollover_cap: z.number().nonnegative().optional(),
      });

      const { id } = paramsSchema.parse(request.params);
      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      if (Object.keys(data).length === 0) {
        reply.code(400);
        return { error: "Nada para atualizar" };
      }

      const updateData: Prisma.BudgetUpdateManyMutationInput = {
        ...data,
      };
      if (data.limite_valor !== undefined) {
        updateData.limite_valor = new Prisma.Decimal(data.limite_valor);
      }
      if (data.rollover_cap !== undefined) {
        updateData.rollover_cap = new Prisma.Decimal(data.rollover_cap);
      }

      const updated = await fastify.prisma.budget.updateMany({
        where: { id, user_id: userId, deleted_at: null },
        data: updateData,
      });

      if (updated.count === 0) {
        reply.code(404);
        return { error: "Orçamento não encontrado" };
      }

      return { ok: true };
    }
  );

  fastify.delete(
    "/budgets/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const updated = await fastify.prisma.budget.updateMany({
        where: { id, user_id: userId, deleted_at: null },
        data: { deleted_at: new Date() },
      });

      if (updated.count === 0) {
        reply.code(404);
        return { error: "Orçamento não encontrado" };
      }

      return { ok: true };
    }
  );
}
