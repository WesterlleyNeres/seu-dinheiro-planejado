import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ensureTenantAccess } from "../utils/tenant";

const statusSchema = z.enum(["active", "completed", "archived"]);

export async function registerProjectRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/projects",
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

      const projects = await fastify.prisma.jarvisProject.findMany({
        where: {
          tenant_id: query.tenant_id,
          ...(query.status ? { status: query.status } : {}),
        },
        orderBy: { created_at: "desc" },
        include: { task_links: { select: { id: true } } },
      });

      return projects.map((project) => ({
        ...project,
        task_count: project.task_links.length,
      }));
    }
  );

  fastify.get(
    "/projects/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const project = await fastify.prisma.jarvisProject.findUnique({
        where: { id },
        include: { task_links: { include: { task: true } } },
      });

      if (!project) {
        reply.code(404);
        return { error: "Projeto não encontrado" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, project.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      return {
        ...project,
        tasks: project.task_links.map((link) => link.task),
      };
    }
  );

  fastify.get(
    "/projects/:id/tasks",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const project = await fastify.prisma.jarvisProject.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!project) {
        reply.code(404);
        return { error: "Projeto não encontrado" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, project.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const links = await fastify.prisma.jarvisProjectTask.findMany({
        where: { project_id: id },
        include: { task: true },
        orderBy: { created_at: "desc" },
      });

      return links.map((link) => link.task);
    }
  );

  fastify.post(
    "/projects",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const bodySchema = z.object({
        tenant_id: z.string().uuid(),
        title: z.string().min(1),
        description: z.string().optional(),
        status: statusSchema.optional(),
      });

      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      const allowed = await ensureTenantAccess(fastify, userId, data.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const created = await fastify.prisma.jarvisProject.create({
        data: {
          tenant_id: data.tenant_id,
          created_by: userId,
          title: data.title,
          description: data.description ?? null,
          status: data.status ?? "active",
        },
      });

      reply.code(201);
      return created;
    }
  );

  fastify.patch(
    "/projects/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        status: statusSchema.optional(),
      });

      const { id } = paramsSchema.parse(request.params);
      const data = bodySchema.parse(request.body);
      const userId = request.user!.id;

      if (Object.keys(data).length === 0) {
        reply.code(400);
        return { error: "Nada para atualizar" };
      }

      const existing = await fastify.prisma.jarvisProject.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!existing) {
        reply.code(404);
        return { error: "Projeto não encontrado" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, existing.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const updated = await fastify.prisma.jarvisProject.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
        },
      });

      return updated;
    }
  );

  fastify.delete(
    "/projects/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const existing = await fastify.prisma.jarvisProject.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!existing) {
        reply.code(404);
        return { error: "Projeto não encontrado" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, existing.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      await fastify.prisma.jarvisProject.delete({ where: { id } });
      return { ok: true };
    }
  );

  fastify.post(
    "/projects/:id/tasks",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z
        .object({
          task_id: z.string().uuid().optional(),
          task_ids: z.array(z.string().uuid()).optional(),
        })
        .refine((value) => value.task_id || (value.task_ids && value.task_ids.length > 0), {
          message: "Informe task_id ou task_ids",
        });

      const { id } = paramsSchema.parse(request.params);
      const body = bodySchema.parse(request.body);
      const userId = request.user!.id;

      const project = await fastify.prisma.jarvisProject.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!project) {
        reply.code(404);
        return { error: "Projeto não encontrado" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, project.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const taskIds = body.task_ids ?? (body.task_id ? [body.task_id] : []);

      const tasks = await fastify.prisma.jarvisTask.findMany({
        where: { id: { in: taskIds }, tenant_id: project.tenant_id },
        select: { id: true },
      });

      if (tasks.length !== taskIds.length) {
        reply.code(404);
        return { error: "Uma ou mais tarefas não foram encontradas" };
      }

      await fastify.prisma.jarvisProjectTask.createMany({
        data: taskIds.map((taskId) => ({
          tenant_id: project.tenant_id,
          project_id: id,
          task_id: taskId,
        })),
        skipDuplicates: true,
      });

      return { ok: true, linked: taskIds.length };
    }
  );

  fastify.delete(
    "/projects/:id/tasks/:taskId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
        taskId: z.string().uuid(),
      });

      const { id, taskId } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const project = await fastify.prisma.jarvisProject.findUnique({
        where: { id },
        select: { tenant_id: true },
      });

      if (!project) {
        reply.code(404);
        return { error: "Projeto não encontrado" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, project.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      await fastify.prisma.jarvisProjectTask.deleteMany({
        where: { project_id: id, task_id: taskId },
      });

      return { ok: true };
    }
  );
}
