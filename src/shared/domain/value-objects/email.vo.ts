// Each domain label excludes `.`, so a label and its separator never compete
// for the same character. The ambiguous form (`[^\s@]+\.[^\s@]+`) made a
// failing input backtrack quadratically.
const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/**
 * Email normalization and format validation are generic, not module-specific
 * business logic, so they live here instead of being duplicated per module.
 * Each caller supplies its own domain error via `onInvalid` so validation
 * failures still surface as that module's error type.
 */
export class EmailValueObject {
  private readonly value: string;

  constructor(raw: string, onInvalid: (raw: string) => Error) {
    const normalized = raw.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalized)) {
      throw onInvalid(raw);
    }

    this.value = normalized;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: EmailValueObject): boolean {
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }
}
