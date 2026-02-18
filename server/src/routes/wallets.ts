import type { FastifyInstance } from "fastify";
import { z } from "zod";

const walletTypeSchema = z.enum(["conta", "cartao"]);

export async function registerWalletRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/wallets",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = request.user!.id;
      const wallets = await fastify.prisma.wallet.findMany({
        where: { user_id: userId, deleted_at: null },
        orderBy: { nome: "asc" },
      });
      return wallets;
    }
  );

  fastify.post(
    "/wallets",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodySchema = z.object({
        nome: z.string().min(1),
        tipo: walletTypeSchema,
        instituicao: z.string().nullable().optional(),
        dia_fechamento: z.number().int().min(1).max(31).nullable().optional(),
        dia_vencimento: z.number().int().min(1).max(31).nullable().optional(),
        saldo_inicial: z.number().nullable().optional(),
        limite_credito: z.number().nullable().optional(),
        limite_emergencia: z.number().nullable().optional(),
        ativo: z.boolean().optional(),
      });

      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      const created = await fastify.prisma.wallet.create({
        data: {
          user_id: userId,
          nome: data.nome,
          tipo: data.tipo,
          instituicao: data.instituicao ?? null,
          dia_fechamento: data.dia_fechamento ?? null,
          dia_vencimento: data.dia_vencimento ?? null,
          saldo_inicial: data.saldo_inicial ?? 0,
          limite_credito: data.limite_credito ?? null,
          limite_emergencia: data.limite_emergencia ?? null,
          ativo: data.ativo ?? true,
        },
      });

      reply.code(201);
      return created;
    }
  );

  fastify.patch(
    "/wallets/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        nome: z.string().min(1).optional(),
        tipo: walletTypeSchema.optional(),
        instituicao: z.string().nullable().optional(),
        dia_fechamento: z.number().int().min(1).max(31).nullable().optional(),
        dia_vencimento: z.number().int().min(1).max(31).nullable().optional(),
        saldo_inicial: z.number().nullable().optional(),
        limite_credito: z.number().nullable().optional(),
        limite_emergencia: z.number().nullable().optional(),
        ativo: z.boolean().optional(),
      });

      const { id } = paramsSchema.parse(request.params);
      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      if (Object.keys(data).length === 0) {
        reply.code(400);
        return { error: "Nada para atualizar" };
      }

      const updated = await fastify.prisma.wallet.updateMany({
        where: { id, user_id: userId, deleted_at: null },
        data: {
          ...data,
          instituicao: data.instituicao ?? undefined,
          dia_fechamento: data.dia_fechamento === null ? null : data.dia_fechamento ?? undefined,
          dia_vencimento: data.dia_vencimento === null ? null : data.dia_vencimento ?? undefined,
          saldo_inicial: data.saldo_inicial === null ? null : data.saldo_inicial ?? undefined,
          limite_credito: data.limite_credito === null ? null : data.limite_credito ?? undefined,
          limite_emergencia: data.limite_emergencia === null ? null : data.limite_emergencia ?? undefined,
          ativo: data.ativo ?? undefined,
        },
      });

      if (updated.count === 0) {
        reply.code(404);
        return { error: "Carteira não encontrada" };
      }

      return { ok: true };
    }
  );

  fastify.delete(
    "/wallets/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const updated = await fastify.prisma.wallet.updateMany({
        where: { id, user_id: userId, deleted_at: null },
        data: { deleted_at: new Date() },
      });

      if (updated.count === 0) {
        reply.code(404);
        return { error: "Carteira não encontrada" };
      }

      return { ok: true };
    }
  );
}
