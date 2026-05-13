export function assertServerSecret(provided: string) {
  const expected = process.env.CAMP_CONVEX_SERVER_SECRET
  if (!expected || provided !== expected) {
    throw new Error('Unauthorized')
  }
}
