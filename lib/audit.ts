import { prisma } from "@/lib/db";

/**
 * Audit logging utilities.
 *
 * Purpose:
 * - Centralize how audit logs are written (action/entity/metadata) so pages and route handlers can reuse it.
 *
 * Flow:
 * - A write path (Server Action or Route Handler) performs a DB mutation.
 * - The same request then records an audit row describing what happened (CREATE/UPDATE/DELETE).
 *
 * Notes:
 * - `metadata` is intentionally `unknown` so callers can attach lightweight context (e.g., title/email),
 *   without coupling to a rigid schema.
 * - `actorUserId` is optional; demo auth stores it in a cookie (`tp_actorUserId`) when available.
 */
export type AuditAction = "CREATE" | "UPDATE" | "DELETE";
export type AuditEntityType = "USER" | "POST" | "CATEGORY";

/**
 * Creates one audit log record.
 * - This function does not return the created row because callers typically don't need it for UI routing.
 */
export async function createAuditLog(input: {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: number;
  actorUserId?: number | null;
  metadata?: unknown;
}) {
  const { action, entityType, entityId, actorUserId, metadata } = input;
  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      actorUserId: actorUserId ?? null,
      metadata: metadata ?? undefined,
    },
  });
}
