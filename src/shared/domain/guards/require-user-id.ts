/**
 * Every profile entity that links to an auth user (customer, consultant,
 * stock keeper, mechanic) rejects creation without one the same way, so the
 * check lives here instead of being duplicated per module. Each caller
 * supplies its own domain error via `onMissing`, mirroring `Cpf.create`.
 */
export function requireUserId(
  userId: string | undefined | null,
  onMissing: () => Error,
): string {
  if (!userId?.trim()) {
    throw onMissing();
  }

  return userId;
}
