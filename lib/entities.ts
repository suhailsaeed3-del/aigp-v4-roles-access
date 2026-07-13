// ============================================================================
// Real federal entities dataset (34 entities) — wired from the existing
// workplan portal source (federalServices / federalSubServices / servicePackages).
// Exposed as a registry + lookup helpers for the services stream and the
// entity filters (ai / path cross-entity views). The design prototype's own
// forms are unchanged; this only makes the real data available to them.
// ============================================================================
import federalServices from './data/federalServices.json';
import federalSubServices from './data/federalSubServices.json';
import servicePackages from './data/servicePackages.json';

// entity -> [services]
export const FEDERAL_SERVICES = federalServices as Record<string, string[]>;
// entity -> department (main service group) -> [services]
export const FEDERAL_SUB_SERVICES = federalSubServices as Record<
  string,
  Record<string, string[]>
>;
// entity -> package -> [services]
export const SERVICE_PACKAGES = servicePackages as Record<string, Record<string, string[]>>;

/** All participating federal entities (Arabic names). */
export const FEDERAL_ENTITIES: string[] = Object.keys(FEDERAL_SUB_SERVICES);

/** Departments (main service groups) for an entity. */
export function departmentsOf(entity: string): string[] {
  const data = resolveEntity(entity, FEDERAL_SUB_SERVICES);
  return data ? Object.keys(data) : [];
}

/** Sub-services under a given entity + department. */
export function servicesOf(entity: string, department: string): string[] {
  const data = resolveEntity(entity, FEDERAL_SUB_SERVICES);
  return data?.[department] || [];
}

/** Flat service list for an entity. */
export function entityServices(entity: string): string[] {
  return resolveEntity(entity, FEDERAL_SERVICES) || [];
}

// Tolerant lookup (handles slight name variations between datasets).
function resolveEntity<T>(entity: string, source: Record<string, T>): T | undefined {
  if (!entity) return undefined;
  if (source[entity]) return source[entity];
  const match = Object.keys(source).find(
    (k) => k.includes(entity) || entity.includes(k)
  );
  return match ? source[match] : undefined;
}
