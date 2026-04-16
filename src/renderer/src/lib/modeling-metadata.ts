import type { Model } from "datacarta-spec/client";

/** One-line badge for models. */
export function formatModelingHeadline(model: Model): string | null {
  const parts: string[] = [];
  const intent = model.modelingIntent;
  if (intent?.starRole && intent.starRole !== "unknown") parts.push(intent.starRole);
  if (intent?.dataVaultRole && intent.dataVaultRole !== "none") parts.push(`dv:${intent.dataVaultRole}`);
  if (intent?.scdType !== undefined) parts.push(`SCD${intent.scdType}`);
  if (model.physical?.relation) parts.push(model.physical.relation);
  return parts.length ? parts.join(" · ") : null;
}
