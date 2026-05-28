'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, MapPin } from 'lucide-react'
import { reverseGeocodeLabel, type RespondentLocation } from '@/lib/actions/reverse-geocode'

type Props = {
  value: RespondentLocation | null
  onChange: (value: RespondentLocation | null) => void
}

export function PublicFormLocationCapture({ value, onChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function captureLocation() {
    if (!navigator.geolocation) {
      setError('Location is not supported on this device.')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        const accuracy = position.coords.accuracy

        const { label } = await reverseGeocodeLabel(latitude, longitude)
        onChange({
          latitude,
          longitude,
          accuracy,
          label: label ?? undefined,
        })
        setLoading(false)
      },
      (geoError) => {
        setLoading(false)
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError('Location permission denied. You can still submit without it.')
        } else {
          setError('Could not get your location. Try again or continue without it.')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  }

  return (
    <div className="space-y-2 border-b border-slate-100 px-6 py-5">
      <p className="text-sm font-medium text-slate-900">Your location (optional)</p>
      <p className="text-sm text-slate-500">
        Helps us plan outreach near you. Only shared if you tap the button below.
      </p>
      {value ? (
        <div className="flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p>{value.label ?? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`}</p>
            <button
              type="button"
              className="mt-1 text-xs text-slate-500 underline hover:text-slate-700"
              onClick={() => onChange(null)}
            >
              Clear location
            </button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => void captureLocation()} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Getting location…
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Use my location
            </>
          )}
        </Button>
      )}
      {error ? <p className="text-sm text-amber-800">{error}</p> : null}
    </div>
  )
}
