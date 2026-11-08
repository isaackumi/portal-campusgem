/** T-shirt sizes asked for on confirmation calls; saved on the registration and the person's profile. */
export const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'] as const
export type TshirtSize = (typeof TSHIRT_SIZES)[number]

export function isTshirtSize(value: unknown): value is TshirtSize {
  return typeof value === 'string' && (TSHIRT_SIZES as readonly string[]).includes(value)
}
