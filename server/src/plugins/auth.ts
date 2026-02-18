import fp from "fastify-plugin";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config";

export const authPlugin = fp(async (fastify) => {
  const issuer = config.supabaseIssuer || `${config.supabaseUrl}/auth/v1`;
  const jwksUrl = new URL(`${config.supabaseUrl}/auth/v1/.well-known/jwks.json`);
  const jwks = createRemoteJWKSet(jwksUrl);
  const secret = config.supabaseJwtSecret;
  const verifyOptions: Parameters<typeof jwtVerify>[2] = {
    issuer,
    ...(config.supabaseAudience ? { audience: config.supabaseAudience } : {}),
  };
  const secretKey = secret ? new TextEncoder().encode(secret) : null;

  fastify.decorate("authenticate", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }

    const token = authHeader.slice("Bearer ".length).trim();
    try {
      let payload;
      try {
        payload = (
          await jwtVerify(token, secretKey ?? jwks, verifyOptions)
        ).payload;
      } catch (error) {
        if (secretKey) {
          payload = (await jwtVerify(token, jwks, verifyOptions)).payload;
        } else {
          throw error;
        }
      }

      request.user = {
        id: payload.sub as string,
        role: payload.role as string | undefined,
        email: payload.email as string | undefined,
      };
    } catch (error) {
      fastify.log.error({ err: error }, "JWT verify failed");
      reply.code(401).send({ error: "Invalid token" });
    }
  });
});
