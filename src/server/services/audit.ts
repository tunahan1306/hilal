import "server-only";
import type { Admin } from "@/domain/types";
import { getRepository } from "../repositories";

export async function audit(
  actor: Pick<Admin, "id"> | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await getRepository().addAuditLog({ actorId: actor?.id ?? null, action, entityType, entityId, metadata });
}
