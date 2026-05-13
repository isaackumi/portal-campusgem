import { ConvexHttpClient } from 'convex/browser'

let sharedClient: ConvexHttpClient | null = null
let sharedClientUrl: string | null = null

function requireConvexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not set')
  }
  return url
}

export function getConvexHttpClient(): ConvexHttpClient {
  const url = requireConvexUrl()
  if (!sharedClient || sharedClientUrl !== url) {
    sharedClient = new ConvexHttpClient(url)
    sharedClientUrl = url
  }
  return sharedClient
}

function isRetryableConvexError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  if (error.message.includes('fetch failed')) return true
  const cause = (error as Error & { cause?: { code?: string } }).cause
  return cause?.code === 'ETIMEDOUT' || cause?.code === 'ECONNRESET' || cause?.code === 'ENOTFOUND'
}

export async function runConvexQueryWithRetry<T>(
  run: (client: ConvexHttpClient) => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await run(getConvexHttpClient())
    } catch (error) {
      lastError = error
      if (!isRetryableConvexError(error) || attempt === attempts) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
    }
  }

  throw lastError
}
