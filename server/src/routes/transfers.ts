import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export async function registerTransferRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/transfers",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const querySchema = z.object({
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        wallet_id: z.string().uuid().optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
      });

      const query = querySchema.parse(request.query);
      const userId = request.user!.id;

      const where: Prisma.TransferWhereInput = {
        user_id: userId,
        deleted_at: null,
      };

      if (query.wallet_id) {
        where.OR = [
          { from_wallet_id: query.wallet_id },
          { to_wallet_id: query.wallet_id },
        ];
      }

      if (query.start_date || query.end_date) {
        where.data = {};
        if (query.start_date) where.data.gte = new Date(query.start_date);
        if (query.end_date) where.data.lte = new Date(query.end_date);
      }

      const transfers = await fastify.prisma.transfer.findMany({
        where,
        orderBy: { data: "desc" },
        take: query.limit ?? 50,
      });

      const walletIds = Array.from(
        new Set(
          transfers.flatMap((t) => [t.from_wallet_id, t.to_wallet_id])
        )
      );

      const wallets = walletIds.length
        ? await fastify.prisma.wallet.findMany({
            where: { id: { in: walletIds } },
            select: { id: true, nome: true },
          })
        : [];

      const walletMap = new Map(wallets.map((w) => [w.id, w]));

      return transfers.map((t) => ({
        ...t,
        valor: Number(t.valor),
        from_wallet: walletMap.get(t.from_wallet_id) || null,
        to_wallet: walletMap.get(t.to_wallet_id) || null,
      }));
    }
  );

  fastify.get(
    "/wallets/balances",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = request.user!.id;
      const balances = await fastify.prisma.$queryRaw<
        Array<{ wallet_id: string; wallet_nome: string; wallet_tipo: string; saldo: string }>
      >(
        Prisma.sql`select wallet_id, wallet_nome, wallet_tipo, saldo from public.v_wallet_balance where user_id = ${userId}::uuid`
      );
      return balances.map((b) => ({
        ...b,
        saldo: Number(b.saldo),
      }));
    }
  );

  fastify.post(
    "/transfers",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodySchema = z.object({
        from_wallet_id: z.string().uuid(),
        to_wallet_id: z.string().uuid(),
        valor: z.number().positive(),
        data: z.string().optional(),
        descricao: z.string().optional(),
      });

      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      if (data.from_wallet_id === data.to_wallet_id) {
        reply.code(400);
        return { error: "Carteiras de origem e destino devem ser diferentes" };
      }

      const created = await fastify.prisma.transfer.create({
        data: {
          user_id: userId,
          from_wallet_id: data.from_wallet_id,
          to_wallet_id: data.to_wallet_id,
          valor: new Prisma.Decimal(data.valor),
          data: data.data ? new Date(data.data) : new Date(),
          descricao: data.descricao ?? null,
        },
      });

      reply.code(201);
      return {
        ...created,
        valor: Number(created.valor),
      };
    }
  );

  fastify.patch(
    "/transfers/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        from_wallet_id: z.string().uuid().optional(),
        to_wallet_id: z.string().uuid().optional(),
        valor: z.number().positive().optional(),
        data: z.string().optional(),
        descricao: z.string().optional(),
      });

      const { id } = paramsSchema.parse(request.params);
      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      if (Object.keys(data).length === 0) {
        reply.code(400);
        return { error: "Nada para atualizar" };
      }

      if (data.from_wallet_id && data.to_wallet_id && data.from_wallet_id === data.to_wallet_id) {
        reply.code(400);
        return { error: "Carteiras de origem e destino devem ser diferentes" };
      }

      const updateData: Prisma.TransferUpdateManyMutationInput = {
        ...data,
      };

      if (data.valor !== undefined) {
        updateData.valor = new Prisma.Decimal(data.valor);
      }
      if (data.data) {
        updateData.data = new Date(data.data);
      }

      const updated = await fastify.prisma.transfer.updateMany({
        where: { id, user_id: userId, deleted_at: null },
        data: updateData,
      });

      if (updated.count === 0) {
        reply.code(404);
        return { error: "Transferência não encontrada" };
      }

      return { ok: true };
    }
  );

  fastify.delete(
    "/transfers/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const updated = await fastify.prisma.transfer.updateMany({
        where: { id, user_id: userId, deleted_at: null },
        data: { deleted_at: new Date() },
      });

      if (updated.count === 0) {
        reply.code(404);
        return { error: "Transferência não encontrada" };
      }

      return { ok: true };
    }
  );
}
