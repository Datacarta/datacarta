import type { SourceOrigin } from "datacarta-spec/client";

/**
 * Visual treatment for source-type origin. These show up on source/raw
 * model cards so you can tell at a glance whether a table came from a
 * frontend event stream, a backend database, or a third-party SaaS.
 */
export const SOURCE_ORIGIN_META: Record<
  SourceOrigin,
  { label: string; short: string; color: string; description: string }
> = {
  frontend: {
    label: "Frontend",
    short: "FE",
    color: "#BF5AF2",
    description: "Client-side event stream (web/app telemetry)",
  },
  backend: {
    label: "Backend",
    short: "BE",
    color: "#30D158",
    description: "Server-side application database or service",
  },
  third_party: {
    label: "Third-party",
    short: "3P",
    color: "#FF9F0A",
    description: "External SaaS / API (Stripe, Segment, HubSpot, etc.)",
  },
};

export function originColor(origin: SourceOrigin | undefined): string {
  if (!origin) return "var(--text-quaternary)";
  return SOURCE_ORIGIN_META[origin].color;
}

export function originLabel(origin: SourceOrigin | undefined): string {
  if (!origin) return "";
  return SOURCE_ORIGIN_META[origin].label;
}

export function originShort(origin: SourceOrigin | undefined): string {
  if (!origin) return "";
  return SOURCE_ORIGIN_META[origin].short;
}
