/** Human-friendly absolute + relative timestamps for admin lists. */
export function formatRelativeWhen(iso: string | undefined | null): {
  absolute: string
  relative: string
  absoluteDate: string
  absoluteTime: string
} {
  if (!iso) {
    return { absolute: '—', relative: '', absoluteDate: '—', absoluteTime: '' }
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return { absolute: iso, relative: '', absoluteDate: iso, absoluteTime: '' }
  }

  const absoluteDate = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const absoluteTime = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const absolute = `${absoluteDate}, ${absoluteTime}`

  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  let relative = 'just now'
  if (mins < 0) relative = absoluteDate
  else if (mins >= 1 && mins < 60) relative = `${mins}m ago`
  else if (mins >= 60 && mins < 1440) relative = `${Math.floor(mins / 60)}h ago`
  else if (mins >= 1440 && mins < 10080) {
    const days = Math.floor(mins / 1440)
    relative = days === 1 ? '1 day ago' : `${days} days ago`
  } else if (mins >= 10080) relative = absoluteDate

  return { absolute, relative, absoluteDate, absoluteTime }
}
