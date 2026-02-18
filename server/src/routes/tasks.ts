import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ensureTenantAccess } from "../utils/tenant";

const statusSchema = z.enum(["open", "in_progress", "done"]);
const prioritySchema = z.enum(["low", "medium", "high"]);

export async function registerTaskRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/tasks",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const querySchema = z.object({
        tenant_id: z.string().uuid(),
        status: statusSchema.optional(),
        limit: z.coerce.number().int().min(1).max(200).optional(),
      });

      const query = querySchema.parse(request.query);
      const userId = request.user!.id;

      const allowed = await ensureTenantAccess(fastify, userId, query.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const tasks = await fastify.prisma.jarvisTask.findMany({
        where: {
          tenant_id: query.tenant_id,
          ...(query.status ? { status: query.status } : {}),
        },
        orderBy: { created_at: "desc" },
        take: query.limit ?? 200,
      });

      return tasks;
    }
  );

  fastify.post(
    "/tasks",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodySchema = z.object({
        tenant_id: z.string().uuid(),
        title: z.string().min(1),
        description: z.string().optional(),
        priority: prioritySchema.optional(),
        due_at: z.string().optional(),
        tags: z.array(z.string()).optional(),
      });

      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      const allowed = await ensureTenantAccess(fastify, userId, data.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const created = await fastify.prisma.jarvisTask.create({
        data: {
          tenant_id: data.tenant_id,
          created_by: userId,
          title: data.title,
          description: data.description ?? null,
          priority: data.priority ?? "medium",
          due_at: data.due_at && data.due_at.trim() ? new Date(data.due_at) : null,
          tags: data.tags ?? [],
          status: "open",
          source: "manual",
        },
      });

      reply.code(201);
      return created;
    }
  );

  fastify.patch(
    "/tasks/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        priority: prioritySchema.optional(),
        due_at: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
        status: statusSchema.optional(),
        completed_at: z.string().nullable().optional(),
      });

      const { id } = paramsSchema.parse(request.params);
      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      if (Object.keys(data).length === 0) {
        reply.code(400);
        return { error: "Nada para atualizar" };
      }

      const existing = await fastify.prisma.jarvisTask.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!existing) {
        reply.code(404);
        return { error: "Tarefa não encontrada" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, existing.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const updateData: Record<string, unknown> = {
        ...data,
      };

      if (data.due_at !== undefined) {
        updateData.due_at = data.due_at && data.due_at.trim() ? new Date(data.due_at) : null;
      }
      if (data.completed_at !== undefined) {
        updateData.completed_at = data.completed_at ? new Date(data.completed_at) : null;
      }
      if (data.status === "done" && data.completed_at === undefined) {
        updateData.completed_at = new Date();
      }
      if (data.status && data.status !== "done") {
        updateData.completed_at = null;
      }

      const updated = await fastify.prisma.jarvisTask.update({
        where: { id },
        data: updateData,
      });

      return updated;
    }
  );

  fastify.post(
    "/tasks/:id/complete",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const existing = await fastify.prisma.jarvisTask.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!existing) {
        reply.code(404);
        return { error: "Tarefa não encontrada" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, existing.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const updated = await fastify.prisma.jarvisTask.update({
        where: { id },
        data: { status: "done", completed_at: new Date() },
      });

      return updated;
    }
  );

  fastify.delete(
    "/tasks/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const existing = await fastify.prisma.jarvisTask.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!existing) {
        reply.code(404);
        return { error: "Tarefa não encontrada" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, existing.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      await fastify.prisma.jarvisTask.delete({ where: { id } });
      return { ok: true };
    }
  );
}
