/**
 * Getting the team into a calling session: the link, and the text that carries it. One builder for
 * the preview and the sender, so what is checked is what goes out.
 */

export const SESSION_PATH = '/admin/camp-meeting/calls/session'

export function sessionLink(origin: string): string {
  return `${origin.replace(/\/+$/, '')}${SESSION_PATH}`
}

/**
 * "Hi Ama, the camp calls have started. Join on your phone (sign in first): <link> Kofi" — short
 * enough for one or two SMS parts with a typical link.
 */
export function buildSessionInviteSms(input: { name?: string | null; starter?: string | null; link: string }): string {
  const first = input.name?.trim().split(/\s+/)[0]
  const starter = input.starter?.trim().split(/\s+/)[0]
  const greeting = first ? `Hi ${first}, the` : 'The'
  return `${greeting} camp calls have started. Join on your phone (sign in first): ${input.link}${starter ? ` ${starter}` : ''}`
}
