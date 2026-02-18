import type { FastifyInstance } from "fastify";

export const ensureTenantAccess = async (
  fastify: FastifyInstance,
  userId: string,
  tenantId: string
) => {
  const membership = await fastify.prisma.tenantMember.findFirst({
    where: { tenant_id: tenantId, user_id: userId },
    select: { id: true },
  });

  return Boolean(membership);
};
