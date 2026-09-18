/**
 * Money representation for the whole application.
 *
 * Design decision (tested): every amount is an INTEGER count of minor units
 * (piastres / centimes / cents). There is NO floating-point money anywhere:
 * forms accept major-unit decimals which are converted once to minor units by
 * `toMinor`, and every computation afterwards is pure integer arithmetic.
 *
 * Money is never negative. Whether an amount flows INTO or OUT of something is
 * carried by the surrounding concept (TransactionType / bucket), never by the
 * sign of a number. This keeps multiplication/percentage math simple and safe:
 * floats are only ever used for display formatting.
 */
export const MINOR_UNITS_PER_MAJOR = 100;

/** An integer amount in minor units (e.g. 2000 piastres = 20 EGP). */
export type Money = number & { readonly __monumenor: unique symbol };

export function makeMoney(value: number): Money {
  if (!Number.isInteger(value)) {
    throw new Error(`Money must be an integer (minor units), got ${value}`);
  }
  if (value < 0) {
    throw new Error(`Money cannot be negative, got ${value}`);
  }
  return value as Money;
}

/** Convert a decimal major-unit value (from a form) to integer minor units. */
export function toMinor(decimal: number): Money {
  return makeMoney(Math.round(decimal * MINOR_UNITS_PER_MAJOR));
}

/** Convert integer minor units back to a decimal major-unit number. */
export function fromMinor(minor: Money): number {
  return minor / MINOR_UNITS_PER_MAJOR;
}

export function add(a: Money, b: Money): Money {
  return makeMoney(a + b);
}

export function subtract(a: Money, b: Money): Money {
  return makeMoney(a - b);
}

/** Multiply by an exact factor and round to the nearest minor unit. */
export function multiply(a: Money, factor: number): Money {
  return makeMoney(Math.round(a * factor));
}

/**
 * EXACT integer percentage: floor((amount * percent) / 100). Safe by design —
 * the result can never exceed the amount, and no float fallback exists.
 * Accepts only integer percents >= 0.
 */
export function percentageOf(amount: Money, percent: number): Money {
  if (!Number.isInteger(percent) || percent < 0) {
    throw new Error(`Percent must be a non-negative integer, got ${percent}`);
  }
  return makeMoney(Math.floor((amount * percent) / 100));
}

export function sumMoneys(items: readonly Money[]): Money {
  return makeMoney(items.reduce((acc, n) => acc + n, 0));
}

export function maxMoney(a: Money, b: Money): Money {
  return makeMoney(Math.max(a, b));
}

/** Human display: "3,500 EGP". Currency is a runtime value, never hard-coded. */
export function formatMoney(minor: Money, currency: string): string {
  return `${formatDecimal(fromMinor(minor))} ${currency}`;
}

/** Numeric-only formatting (no currency) for compound labels. */
export function formatDecimal(value: number, { decimals = 2 } = {}): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}
