import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const transactionTypeSchema = z.enum(["despesa", "receita"]);
const transactionStatusSchema = z.enum(["paga", "pendente"]);
const naturezaSchema = z.enum(["fixa", "variavel"]);

const parseDate = (value?: string): { date: Date; error?: string } => {
  if (!value) return { date: new Date() };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: new Date(), error: "Data inválida" };
  }
  return { date };
};

const toMesReferencia = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const toMesReferenciaInt = (mesRef: string): number | null => {
  const match = /^\d{4}-\d{2}$/.test(mesRef);
  if (!match) return null;
  return Number(mesRef.replace("-", ""));
};

export async function registerTransactionRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/transactions",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const querySchema = z.object({
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        tipo: transactionTypeSchema.optional(),
        status: transactionStatusSchema.optional(),
        natureza: naturezaSchema.optional(),
        wallet_id: z.string().uuid().optional(),
        category_id: z.string().uuid().optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
      });

      const query = querySchema.parse(request.query);
      const userId = request.user!.id;

      const where: Prisma.TransactionWhereInput = {
        user_id: userId,
        deleted_at: null,
      };

      if (query.tipo) where.tipo = query.tipo;
      if (query.status) where.status = query.status;
      if (query.natureza) where.natureza = query.natureza;
      if (query.wallet_id) where.wallet_id = query.wallet_id;
      if (query.category_id) where.category_id = query.category_id;
      if (query.start_date || query.end_date) {
        where.data = {};
        if (query.start_date) where.data.gte = new Date(query.start_date);
        if (query.end_date) where.data.lte = new Date(query.end_date);
      }

      const transactions = await fastify.prisma.transaction.findMany({
        where,
        orderBy: { data: "desc" },
        take: query.limit ?? 50,
      });

      const categoryIds = Array.from(
        new Set(transactions.map((t) => t.category_id))
      );
      const walletIds = Array.from(
        new Set(transactions.map((t) => t.wallet_id).filter(Boolean))
      ) as string[];

      const [categories, wallets] = await Promise.all([
        categoryIds.length
          ? fastify.prisma.category.findMany({
              where: { id: { in: categoryIds } },
              select: { id: true, nome: true, tipo: true },
            })
          : Promise.resolve([]),
        walletIds.length
          ? fastify.prisma.wallet.findMany({
              where: { id: { in: walletIds } },
              select: { id: true, nome: true },
            })
          : Promise.resolve([]),
      ]);

      const categoryMap = new Map(categories.map((c) => [c.id, c]));
      const walletMap = new Map(wallets.map((w) => [w.id, w]));

      return transactions.map((t) => ({
        ...t,
        valor: Number(t.valor),
        valor_parcela: t.valor_parcela ? Number(t.valor_parcela) : null,
        valor_total_parcelado: t.valor_total_parcelado ? Number(t.valor_total_parcelado) : null,
        category: categoryMap.get(t.category_id) || null,
        wallet: t.wallet_id ? walletMap.get(t.wallet_id) || null : null,
      }));
    }
  );

  fastify.post(
    "/transactions",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodySchema = z.object({
        tipo: transactionTypeSchema,
        descricao: z.string().min(1),
        valor: z.number().nonnegative(),
        data: z.string().optional(),
        status: transactionStatusSchema.optional(),
        category_id: z.string().uuid(),
        wallet_id: z.string().uuid().optional(),
        forma_pagamento: z.string().optional(),
        payment_method_id: z.string().uuid().optional(),
        natureza: naturezaSchema.optional(),
        parcela_numero: z.number().int().positive().optional(),
        parcela_total: z.number().int().positive().optional(),
        valor_parcela: z.number().nonnegative().optional(),
        valor_total_parcelado: z.number().nonnegative().optional(),
        grupo_parcelamento: z.string().uuid().optional(),
      });

      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;
      const { date, error: dateError } = parseDate(data.data);
      if (dateError) {
        reply.code(400);
        return { error: dateError };
      }

      const category = await fastify.prisma.category.findFirst({
        where: { id: data.category_id, user_id: userId, deleted_at: null },
        select: { id: true },
      });
      if (!category) {
        reply.code(404);
        return { error: "Categoria não encontrada" };
      }

      if (data.wallet_id) {
        const wallet = await fastify.prisma.wallet.findFirst({
          where: { id: data.wallet_id, user_id: userId, deleted_at: null },
          select: { id: true },
        });
        if (!wallet) {
          reply.code(404);
          return { error: "Carteira não encontrada" };
        }
      }
      const mesRef = toMesReferencia(date);
      const mesRefInt = toMesReferenciaInt(mesRef);

      try {
        const created = await fastify.prisma.transaction.create({
          data: {
            user_id: userId,
            tipo: data.tipo,
            descricao: data.descricao,
            valor: new Prisma.Decimal(data.valor),
            data: date,
            status: data.status ?? "pendente",
            category_id: data.category_id,
            wallet_id: data.wallet_id ?? null,
            forma_pagamento: data.forma_pagamento ?? null,
            payment_method_id: data.payment_method_id ?? null,
            natureza: data.natureza ?? null,
            parcela_numero: data.parcela_numero ?? null,
            parcela_total: data.parcela_total ?? null,
            valor_parcela: data.valor_parcela ? new Prisma.Decimal(data.valor_parcela) : null,
            valor_total_parcelado: data.valor_total_parcelado
              ? new Prisma.Decimal(data.valor_total_parcelado)
              : null,
            grupo_parcelamento: data.grupo_parcelamento ?? null,
            mes_referencia: mesRef,
            mes_referencia_int: mesRefInt,
          },
        });

        reply.code(201);
        return {
          ...created,
          valor: Number(created.valor),
          valor_parcela: created.valor_parcela ? Number(created.valor_parcela) : null,
          valor_total_parcelado: created.valor_total_parcelado
            ? Number(created.valor_total_parcelado)
            : null,
        };
      } catch (error: any) {
        if (error.code === "P2002") {
          reply.code(409);
          return { error: "Transação duplicada" };
        }
        throw error;
      }
    }
  );

  fastify.patch(
    "/transactions/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        tipo: transactionTypeSchema.optional(),
        descricao: z.string().min(1).optional(),
        valor: z.number().nonnegative().optional(),
        data: z.string().optional(),
        status: transactionStatusSchema.optional(),
        category_id: z.string().uuid().optional(),
        wallet_id: z.string().uuid().optional(),
        forma_pagamento: z.string().optional(),
        payment_method_id: z.string().uuid().optional(),
        natureza: naturezaSchema.optional(),
        parcela_numero: z.number().int().positive().optional(),
        parcela_total: z.number().int().positive().optional(),
        valor_parcela: z.number().nonnegative().optional(),
        valor_total_parcelado: z.number().nonnegative().optional(),
        grupo_parcelamento: z.string().uuid().optional(),
      });

      const { id } = paramsSchema.parse(request.params);
      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      if (Object.keys(data).length === 0) {
        reply.code(400);
        return { error: "Nada para atualizar" };
      }

      const updateData: Prisma.TransactionUpdateManyMutationInput = {
        ...data,
      };

      if (data.category_id) {
        const category = await fastify.prisma.category.findFirst({
          where: { id: data.category_id, user_id: userId, deleted_at: null },
          select: { id: true },
        });
        if (!category) {
          reply.code(404);
          return { error: "Categoria não encontrada" };
        }
      }

      if (data.wallet_id) {
        const wallet = await fastify.prisma.wallet.findFirst({
          where: { id: data.wallet_id, user_id: userId, deleted_at: null },
          select: { id: true },
        });
        if (!wallet) {
          reply.code(404);
          return { error: "Carteira não encontrada" };
        }
      }

      if (data.valor !== undefined) {
        updateData.valor = new Prisma.Decimal(data.valor);
      }
      if (data.valor_parcela !== undefined) {
        updateData.valor_parcela = new Prisma.Decimal(data.valor_parcela);
      }
      if (data.valor_total_parcelado !== undefined) {
        updateData.valor_total_parcelado = new Prisma.Decimal(data.valor_total_parcelado);
      }

      if (data.data) {
        const { date, error: dateError } = parseDate(data.data);
        if (dateError) {
          reply.code(400);
          return { error: dateError };
        }
        const mesRef = toMesReferencia(date);
        const mesRefInt = toMesReferenciaInt(mesRef);
        updateData.data = date;
        updateData.mes_referencia = mesRef;
        updateData.mes_referencia_int = mesRefInt;
      }

      const updated = await fastify.prisma.transaction.updateMany({
        where: { id, user_id: userId, deleted_at: null },
        data: updateData,
      });

      if (updated.count === 0) {
        reply.code(404);
        return { error: "Transação não encontrada" };
      }

      return { ok: true };
    }
  );

  fastify.delete(
    "/transactions/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const updated = await fastify.prisma.transaction.updateMany({
        where: { id, user_id: userId, deleted_at: null },
        data: { deleted_at: new Date() },
      });

      if (updated.count === 0) {
        reply.code(404);
        return { error: "Transação não encontrada" };
      }

      return { ok: true };
    }
  );
}
