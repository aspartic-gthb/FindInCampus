/** Compare MongoDB ObjectIds, populated docs, or string ids. */
export function sameId(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  const left =
    typeof a === 'object' && a !== null && ('_id' in (a as object) || 'id' in (a as object))
      ? (a as { _id?: unknown; id?: unknown })._id ?? (a as { id?: unknown }).id
      : a;
  const right =
    typeof b === 'object' && b !== null && ('_id' in (b as object) || 'id' in (b as object))
      ? (b as { _id?: unknown; id?: unknown })._id ?? (b as { id?: unknown }).id
      : b;
  return String(left) === String(right);
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
