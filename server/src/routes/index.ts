import type { FastifyInstance } from "fastify";
import { registerHealthRoutes } from "./health.js";
import { registerCategoryRoutes } from "./categories.js";
import { registerWalletRoutes } from "./wallets.js";
import { registerTransactionRoutes } from "./transactions.js";
import { registerTransferRoutes } from "./transfers.js";
import { registerBudgetRoutes } from "./budgets.js";
import { registerGoalRoutes } from "./goals.js";
import { registerTaskRoutes } from "./tasks.js";
import { registerEventRoutes } from "./events.js";
import { registerHabitRoutes } from "./habits.js";
import { registerReminderRoutes } from "./reminders.js";
import { registerMemoryRoutes } from "./memory.js";
import { registerProjectRoutes } from "./projects.js";

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
