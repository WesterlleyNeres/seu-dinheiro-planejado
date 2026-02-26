import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ensureTenantAccess } from "../utils/tenant";

const projectStatusSchema = z.enum(["active", "completed", "archived"]);
const taskStatusSchema = z.enum(["open", "in_progress", "done"]);
const stageStatusSchema = z.enum(["open", "in_progress", "done"]);
const prioritySchema = z.enum(["low", "medium", "high"]);
const DEFAULT_CHAT_TASK_SOURCES = ["jarvis", "jarvis-auto", "auto"];

const parseOptionalDate = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? new Date(trimmed) : null;
};

export async function registerProjectRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/projects",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const querySchema = z.object({
        tenant_id: z.string().uuid(),
        status: projectStatusSchema.optional(),
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

  fastify.get(
    "/projects/:id/structure",
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

      const stages = await fastify.prisma.jarvisProjectStage.findMany({
        where: { project_id: id },
        orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
        include: {
          items: {
            orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
            include: {
              checklist_items: {
                orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
              },
            },
          },
        },
      });

      return { stages };
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
        status: projectStatusSchema.optional(),
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

  fastify.post(
    "/projects/:id/stages",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z.object({
        title: z.string().min(1),
        sort_order: z.number().int().optional(),
        status: stageStatusSchema.optional(),
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

      const created = await fastify.prisma.jarvisProjectStage.create({
        data: {
          tenant_id: project.tenant_id,
          project_id: id,
          title: body.title,
          sort_order: body.sort_order ?? 0,
          status: body.status ?? "open",
        },
      });

      reply.code(201);
      return created;
    }
  );

  fastify.patch(
    "/projects/:id/stages/:stageId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
        stageId: z.string().uuid(),
      });
      const bodySchema = z.object({
        title: z.string().min(1).optional(),
        sort_order: z.number().int().optional(),
        status: stageStatusSchema.optional(),
      });

      const { id, stageId } = paramsSchema.parse(request.params);
      const body = bodySchema.parse(request.body);
      const userId = request.user!.id;

      if (Object.keys(body).length === 0) {
        reply.code(400);
        return { error: "Nada para atualizar" };
      }

      const stage = await fastify.prisma.jarvisProjectStage.findFirst({
        where: { id: stageId, project_id: id },
        select: { tenant_id: true },
      });

      if (!stage) {
        reply.code(404);
        return { error: "Etapa não encontrada" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, stage.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const updated = await fastify.prisma.jarvisProjectStage.update({
        where: { id: stageId },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.sort_order !== undefined ? { sort_order: body.sort_order } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
        },
      });

      return updated;
    }
  );

  fastify.delete(
    "/projects/:id/stages/:stageId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
        stageId: z.string().uuid(),
      });

      const { id, stageId } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const stage = await fastify.prisma.jarvisProjectStage.findFirst({
        where: { id: stageId, project_id: id },
        select: { tenant_id: true },
      });

      if (!stage) {
        reply.code(404);
        return { error: "Etapa não encontrada" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, stage.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      await fastify.prisma.jarvisProjectStage.delete({ where: { id: stageId } });
      return { ok: true };
    }
  );

  fastify.post(
    "/projects/:id/stages/:stageId/items",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
        stageId: z.string().uuid(),
      });
      const bodySchema = z.object({
        title: z.string().min(1),
        description: z.string().nullable().optional(),
        status: taskStatusSchema.optional(),
        priority: prioritySchema.optional(),
        due_at: z.string().nullable().optional(),
        sort_order: z.number().int().optional(),
      });

      const { id, stageId } = paramsSchema.parse(request.params);
      const body = bodySchema.parse(request.body);
      const userId = request.user!.id;

      const stage = await fastify.prisma.jarvisProjectStage.findFirst({
        where: { id: stageId, project_id: id },
        select: { tenant_id: true },
      });

      if (!stage) {
        reply.code(404);
        return { error: "Etapa não encontrada" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, stage.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const created = await fastify.prisma.jarvisProjectItem.create({
        data: {
          tenant_id: stage.tenant_id,
          project_id: id,
          stage_id: stageId,
          title: body.title,
          description: body.description ?? null,
          status: body.status ?? "open",
          priority: body.priority ?? "medium",
          due_at: parseOptionalDate(body.due_at),
          sort_order: body.sort_order ?? 0,
        },
      });

      reply.code(201);
      return created;
    }
  );

  fastify.patch(
    "/projects/:id/items/:itemId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
        itemId: z.string().uuid(),
      });
      const bodySchema = z.object({
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        status: taskStatusSchema.optional(),
        priority: prioritySchema.optional(),
        stage_id: z.string().uuid().optional(),
        due_at: z.string().nullable().optional(),
        sort_order: z.number().int().optional(),
      });

      const { id, itemId } = paramsSchema.parse(request.params);
      const body = bodySchema.parse(request.body);
      const userId = request.user!.id;

      if (Object.keys(body).length === 0) {
        reply.code(400);
        return { error: "Nada para atualizar" };
      }

      const item = await fastify.prisma.jarvisProjectItem.findFirst({
        where: { id: itemId, project_id: id },
        select: { tenant_id: true },
      });

      if (!item) {
        reply.code(404);
        return { error: "Subtarefa não encontrada" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, item.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      let nextStageId: string | undefined;
      if (body.stage_id !== undefined) {
        const stage = await fastify.prisma.jarvisProjectStage.findFirst({
          where: { id: body.stage_id, project_id: id },
          select: { tenant_id: true },
        });

        if (!stage) {
          reply.code(404);
          return { error: "Etapa não encontrada" };
        }

        if (stage.tenant_id !== item.tenant_id) {
          reply.code(403);
          return { error: "Sem permissão" };
        }

        nextStageId = body.stage_id;
      }

      const updated = await fastify.prisma.jarvisProjectItem.update({
        where: { id: itemId },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.priority !== undefined ? { priority: body.priority } : {}),
          ...(nextStageId !== undefined ? { stage_id: nextStageId } : {}),
          ...(body.sort_order !== undefined ? { sort_order: body.sort_order } : {}),
          ...(body.due_at !== undefined ? { due_at: parseOptionalDate(body.due_at) } : {}),
        },
      });

      return updated;
    }
  );

  fastify.delete(
    "/projects/:id/items/:itemId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
        itemId: z.string().uuid(),
      });

      const { id, itemId } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const item = await fastify.prisma.jarvisProjectItem.findFirst({
        where: { id: itemId, project_id: id },
        select: { tenant_id: true },
      });

      if (!item) {
        reply.code(404);
        return { error: "Subtarefa não encontrada" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, item.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      await fastify.prisma.jarvisProjectItem.delete({ where: { id: itemId } });
      return { ok: true };
    }
  );

  fastify.post(
    "/projects/items/:itemId/checklist",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ itemId: z.string().uuid() });
      const bodySchema = z.object({
        title: z.string().min(1),
        sort_order: z.number().int().optional(),
      });

      const { itemId } = paramsSchema.parse(request.params);
      const body = bodySchema.parse(request.body);
      const userId = request.user!.id;

      const item = await fastify.prisma.jarvisProjectItem.findUnique({
        where: { id: itemId },
        select: { tenant_id: true },
      });

      if (!item) {
        reply.code(404);
        return { error: "Subtarefa não encontrada" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, item.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const created = await fastify.prisma.jarvisProjectChecklistItem.create({
        data: {
          tenant_id: item.tenant_id,
          project_item_id: itemId,
          title: body.title,
          sort_order: body.sort_order ?? 0,
          is_done: false,
        },
      });

      reply.code(201);
      return created;
    }
  );

  fastify.patch(
    "/projects/checklist/:checklistId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ checklistId: z.string().uuid() });
      const bodySchema = z.object({
        title: z.string().min(1).optional(),
        is_done: z.boolean().optional(),
        sort_order: z.number().int().optional(),
      });

      const { checklistId } = paramsSchema.parse(request.params);
      const body = bodySchema.parse(request.body);
      const userId = request.user!.id;

      if (Object.keys(body).length === 0) {
        reply.code(400);
        return { error: "Nada para atualizar" };
      }

      const checklist = await fastify.prisma.jarvisProjectChecklistItem.findUnique({
        where: { id: checklistId },
        select: { tenant_id: true },
      });

      if (!checklist) {
        reply.code(404);
        return { error: "Checklist não encontrado" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, checklist.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      const updated = await fastify.prisma.jarvisProjectChecklistItem.update({
        where: { id: checklistId },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.is_done !== undefined ? { is_done: body.is_done } : {}),
          ...(body.sort_order !== undefined ? { sort_order: body.sort_order } : {}),
        },
      });

      return updated;
    }
  );

  fastify.delete(
    "/projects/checklist/:checklistId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ checklistId: z.string().uuid() });
      const { checklistId } = paramsSchema.parse(request.params);
      const userId = request.user!.id;

      const checklist = await fastify.prisma.jarvisProjectChecklistItem.findUnique({
        where: { id: checklistId },
        select: { tenant_id: true },
      });

      if (!checklist) {
        reply.code(404);
        return { error: "Checklist não encontrado" };
      }

      const allowed = await ensureTenantAccess(fastify, userId, checklist.tenant_id);
      if (!allowed) {
        reply.code(403);
        return { error: "Sem permissão" };
      }

      await fastify.prisma.jarvisProjectChecklistItem.delete({ where: { id: checklistId } });
      return { ok: true };
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
        status: projectStatusSchema.optional(),
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

  fastify.post(
    "/projects/:id/tasks/cleanup",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const bodySchema = z
        .object({
          sources: z.array(z.string().min(1)).optional(),
        })
        .optional();

      const { id } = paramsSchema.parse(request.params);
      const body = bodySchema.parse(request.body ?? {});
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

      const sources =
        body?.sources && body.sources.length > 0 ? body.sources : DEFAULT_CHAT_TASK_SOURCES;

      const links = await fastify.prisma.jarvisProjectTask.findMany({
        where: {
          project_id: id,
          tenant_id: project.tenant_id,
          task: {
            tenant_id: project.tenant_id,
            created_by: userId,
            source: { in: sources },
          },
        },
        select: { task_id: true },
      });

      const taskIds = Array.from(new Set(links.map((link) => link.task_id)));

      if (taskIds.length === 0) {
        return { removed_links: 0, deleted_tasks: 0 };
      }

      const result = await fastify.prisma.$transaction(async (tx) => {
        await tx.jarvisProjectTask.deleteMany({
          where: {
            project_id: id,
            tenant_id: project.tenant_id,
            task_id: { in: taskIds },
          },
        });

        const remaining = await tx.jarvisProjectTask.findMany({
          where: {
            tenant_id: project.tenant_id,
            task_id: { in: taskIds },
          },
          select: { task_id: true },
        });

        const remainingIds = new Set(remaining.map((row) => row.task_id));
        const orphanTaskIds = taskIds.filter((taskId) => !remainingIds.has(taskId));

        let deletedTasks = 0;
        if (orphanTaskIds.length > 0) {
          const deleted = await tx.jarvisTask.deleteMany({
            where: {
              id: { in: orphanTaskIds },
              tenant_id: project.tenant_id,
              created_by: userId,
              source: { in: sources },
            },
          });
          deletedTasks = deleted.count;
        }

        return { removed_links: taskIds.length, deleted_tasks: deletedTasks };
      });

      return result;
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
