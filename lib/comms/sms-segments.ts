/**
 * How many SMS parts a message will be billed as.
 *
 * Plain GSM-7 text fits 160 characters in one SMS (153 per part when split).
 * Any character outside GSM-7 (most emoji, curly quotes, many accents) switches the whole
 * message to UCS-2: 70 characters in one SMS, 67 per part.
 */

const GSM7_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
/** Extension characters cost two septets each. */
const GSM7_EXTENDED = '^{}\\[~]|€\f'

const BASIC = new Set(Array.from(GSM7_BASIC))
const EXTENDED = new Set(Array.from(GSM7_EXTENDED))

export type SmsSegmentInfo = {
  encoding: 'GSM-7' | 'UCS-2'
  /** Characters as the network counts them (extended GSM chars count twice). */
  length: number
  segments: number
  /** Characters left before the next part starts. */
  remaining: number
}

export function smsSegmentInfo(text: string): SmsSegmentInfo {
  const chars = Array.from(text)
  const isGsm = chars.every((c) => BASIC.has(c) || EXTENDED.has(c))

  if (isGsm) {
    const length = chars.reduce((n, c) => n + (EXTENDED.has(c) ? 2 : 1), 0)
    const segments = length === 0 ? 0 : length <= 160 ? 1 : Math.ceil(length / 153)
    const capacity = segments <= 1 ? 160 : segments * 153
    return { encoding: 'GSM-7', length, segments, remaining: capacity - length }
  }

  // UCS-2 counts UTF-16 code units, so an emoji outside the BMP uses two.
  const length = text.length
  const segments = length <= 70 ? 1 : Math.ceil(length / 67)
  const capacity = segments <= 1 ? 70 : segments * 67
  return { encoding: 'UCS-2', length, segments, remaining: capacity - length }
}
