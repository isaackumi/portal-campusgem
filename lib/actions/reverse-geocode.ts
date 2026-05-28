'use server'

export async function reverseGeocodeLabel(
  latitude: number,
  longitude: number
): Promise<{ label: string | null; error: string | null }> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { label: null, error: 'Invalid coordinates' }
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { label: null, error: 'Coordinates out of range' }
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'json')
    url.searchParams.set('lat', String(latitude))
    url.searchParams.set('lon', String(longitude))
    url.searchParams.set('zoom', '16')

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CampusGemChMS/1.0 (forms location)',
      },
      next: { revalidate: 86400 },
    })

    if (!response.ok) {
      return { label: null, error: 'Could not resolve location name' }
    }

    const data = (await response.json()) as {
      display_name?: string
      address?: {
        suburb?: string
        city?: string
        town?: string
        village?: string
        state?: string
        country?: string
      }
    }

    const parts = [
      data.address?.suburb,
      data.address?.city ?? data.address?.town ?? data.address?.village,
      data.address?.state,
      data.address?.country,
    ].filter(Boolean)

    const label = parts.length > 0 ? parts.join(', ') : data.display_name?.trim()
    return { label: label || null, error: null }
  } catch {
    return { label: null, error: 'Location lookup failed' }
  }
}

export type RespondentLocation = {
  latitude: number
  longitude: number
  accuracy?: number
  label?: string
}
