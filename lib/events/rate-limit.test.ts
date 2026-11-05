import { expect, test } from 'bun:test'
import { createRateLimiter } from './rate-limit'

test('fixed window per key', () => {
  const rl = createRateLimiter({ limit: 2, windowMs: 1000 })
  expect(rl.allow('a', 0)).toBe(true)
  expect(rl.allow('a', 10)).toBe(true)
  expect(rl.allow('a', 20)).toBe(false)
  expect(rl.allow('b', 20)).toBe(true)
  expect(rl.allow('a', 1000)).toBe(true)
})

test('bounded memory', () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 3 })
  for (const k of ['a', 'b', 'c', 'd']) expect(rl.allow(k, 0)).toBe(true)
})
