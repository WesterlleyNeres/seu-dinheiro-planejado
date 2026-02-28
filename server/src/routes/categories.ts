import type { CategoryType } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const categoryTypeSchema = z.enum([
  "despesa",
  "receita",
  "investimento",
  "divida",
  "fixa",
  "variavel",
]);

const defaultCategories: Array<{ nome: string; tipo: CategoryType }> = [
  { nome: "Assinaturas", tipo: "despesa" },
  { nome: "Carro", tipo: "despesa" },
  { nome: "Casa", tipo: "despesa" },
  { nome: "Estudos", tipo: "despesa" },
  { nome: "Festas", tipo: "despesa" },
  { nome: "Ifood", tipo: "despesa" },
  { nome: "Lazer", tipo: "despesa" },
  { nome: "Mercado", tipo: "despesa" },
  { nome: "Pet", tipo: "despesa" },
  { nome: "Saúde e Fitness", tipo: "despesa" },
  { nome: "Uber e Transporte", tipo: "despesa" },
  { nome: "Shopping/Compras", tipo: "despesa" },
  { nome: "Viagens", tipo: "despesa" },
  { nome: "Salário", tipo: "receita" },
];

export async function registerCategoryRoutes(fastify: FastifyInstance) {
  const ensureDefaultCategories = async (userId: string) => {
    const existing = await fastify.prisma.category.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { nome: true, tipo: true },
    });

    const existingKeys = new Set(
      existing.map((category) => `${category.tipo}:${category.nome.toLowerCase()}`)
    );

    const missing = defaultCategories.filter(
      (category) =>
        !existingKeys.has(`${category.tipo}:${category.nome.toLowerCase()}`)
    );

    if (missing.length === 0) return;

    await fastify.prisma.category.createMany({
      data: missing.map((category) => ({
        ...category,
        user_id: userId,
      })),
    });
  };

  fastify.get(
    "/categories",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const querySchema = z.object({
        tipo: categoryTypeSchema.optional(),
        search: z.string().optional(),
      });

      const { tipo, search } = querySchema.parse(request.query);
      const userId = request.user!.id;

      await ensureDefaultCategories(userId);

      const categories = await fastify.prisma.category.findMany({
        where: {
          user_id: userId,
          deleted_at: null,
          ...(tipo ? { tipo } : {}),
          ...(search
            ? {
                nome: {
                  contains: search,
                  mode: "insensitive",
                },
              }
            : {}),
        },
        orderBy: { nome: "asc" },
      });

      return categories;
    }
  );

  fastify.post(
    "/categories",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodySchema = z.object({
        nome: z.string().min(1),
        tipo: categoryTypeSchema,
      });

      const { nome, tipo } = bodySchema.parse(request.body);
      const userId = request.user!.id;

      const existing = await fastify.prisma.category.findFirst({
        where: {
          user_id: userId,
          nome,
          tipo,
          deleted_at: null,
        },
      });

      if (existing) {
        reply.code(409);
        return { error: "Categoria já existe" };
      }

      const created = await fastify.prisma.category.create({
        data: {
          user_id: userId,
          nome,
          tipo,
        },
      });

      reply.code(201);
      return created;
    }
  );

  fastify.patch(
    "/categories/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        nome: z.string().min(1).optional(),
        tipo: categoryTypeSchema.optional(),
      });

      const { id } = paramsSchema.parse(request.params);
      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      if (Object.keys(data).length === 0) {
        reply.code(400);
        return { error: "Nada para atualizar" };
      }

      const updated = await fastify.prisma.category.updateMany({
        where: { id, user_id: userId, deleted_at: null },
        data,
      });

      if (updated.count === 0) {
        reply.code(404);
        return { error: "Categoria não encontrada" };
      }

      return { ok: true };
    }
  );

  fastify.delete(
    "/categories/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const updated = await fastify.prisma.category.updateMany({
        where: { id, user_id: userId, deleted_at: null },
        data: { deleted_at: new Date() },
      });

      if (updated.count === 0) {
        reply.code(404);
        return { error: "Categoria não encontrada" };
      }

      return { ok: true };
    }
  );
}
