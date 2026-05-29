'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { usePublicFormTheme } from '@/components/forms/public-form-theme-context'
import { Loader2, MapPin } from 'lucide-react'
import { reverseGeocodeLabel, type RespondentLocation } from '@/lib/actions/reverse-geocode'
import { cn } from '@/lib/utils'

type Props = {
  value: RespondentLocation | null
  onChange: (value: RespondentLocation | null) => void
}

export function PublicFormLocationCapture({ value, onChange }: Props) {
  const theme = usePublicFormTheme()
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
    <div className="mx-4 mb-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div>
        <p className="text-base font-semibold text-slate-900">Your location (optional)</p>
        <p className="mt-1 text-sm text-slate-500">Helps us plan outreach near you. Only shared if you tap below.</p>
      </div>
      {value ? (
        <div className="flex items-start gap-2 rounded-xl bg-white px-3 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
          <MapPin className={cn('mt-0.5 h-4 w-4 shrink-0', theme.accentText)} />
          <div>
            <p className="text-base">{value.label ?? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`}</p>
            <button
              type="button"
              className="mt-1.5 text-sm font-medium text-slate-500 underline"
              onClick={() => onChange(null)}
            >
              Clear location
            </button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-xl border-slate-200 bg-white text-base"
          onClick={() => void captureLocation()}
          disabled={loading}
        >
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
