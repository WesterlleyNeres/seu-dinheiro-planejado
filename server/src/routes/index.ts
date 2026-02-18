import type { FastifyInstance } from "fastify";
import { registerHealthRoutes } from "./health";
import { registerCategoryRoutes } from "./categories";
import { registerWalletRoutes } from "./wallets";
import { registerTransactionRoutes } from "./transactions";
import { registerTransferRoutes } from "./transfers";
import { registerBudgetRoutes } from "./budgets";
import { registerGoalRoutes } from "./goals";
import { registerTaskRoutes } from "./tasks";
import { registerEventRoutes } from "./events";
import { registerHabitRoutes } from "./habits";
import { registerReminderRoutes } from "./reminders";
import { registerMemoryRoutes } from "./memory";
import { registerProjectRoutes } from "./projects";

export async function registerRoutes(fastify: FastifyInstance) {
  await registerHealthRoutes(fastify);
  await registerCategoryRoutes(fastify);
  await registerWalletRoutes(fastify);
  await registerTransactionRoutes(fastify);
  await registerTransferRoutes(fastify);
  await registerBudgetRoutes(fastify);
  await registerGoalRoutes(fastify);
  await registerTaskRoutes(fastify);
  await registerEventRoutes(fastify);
  await registerHabitRoutes(fastify);
  await registerReminderRoutes(fastify);
  await registerMemoryRoutes(fastify);
  await registerProjectRoutes(fastify);
}
