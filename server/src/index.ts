import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { config } from "./config";
import { prismaPlugin } from "./plugins/prisma";
import { authPlugin } from "./plugins/auth";
import { registerRoutes } from "./routes";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(prismaPlugin);
await app.register(authPlugin);
await registerRoutes(app);

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof ZodError) {
    reply.code(400).send({
      error: "Validation error",
      issues: error.issues,
    });
    return;
  }

  const statusCode =
    typeof (error as { statusCode?: number }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : null;
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    reply.code(statusCode).send({ error: error.message || "Bad request" });
    return;
  }

  app.log.error(error);
  reply.code(500).send({ error: "Internal server error" });
});

app.listen({ port: config.port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
