'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Aperture, Camera, CameraOff, Check, ChevronDown, Flashlight, FlashlightOff, RefreshCw, Sun, SwitchCamera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { backCameras, lensName, preferredBackCamera, type CameraInfo } from '@/lib/camera/lenses'
import { cn } from '@/lib/utils'

type Facing = 'environment' | 'user'
type Status = 'starting' | 'scanning' | 'stopped' | 'error'

/**
 * Camera QR scanner with our own controls: opens the BACK camera by default, one button to
 * flip between back and front, a torch toggle where the phone supports it (handy for evening
 * sessions), and stop/start. Replaces html5-qrcode's built-in UI, whose camera picker lists
 * every lens by its raw name and is hard to use on phones.
 */
export function CameraQrScanner({
  onScan,
  paused = false,
  hint = 'Point the camera at the QR code',
  className,
}: {
  onScan: (text: string) => void
  /** Stop reading codes (e.g. while a result is shown) without turning the camera off. */
  paused?: boolean
  hint?: string
  className?: string
}) {
  const elementId = `qr-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const scannerRef = useRef<Html5Qrcode | null>(null)
  // Camera start/stop calls must never overlap, so they run one after another.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve())
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const [facing, setFacing] = useState<Facing>('environment')
  const [status, setStatus] = useState<Status>('starting')
  const [wanted, setWanted] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [canFlip, setCanFlip] = useState(true)
  const [retry, setRetry] = useState(0)
  /** Back lens asked for (by us or the user). Null = let the browser choose. */
  const [lensId, setLensId] = useState<string | null>(null)
  /** Lens actually running, for the menu. */
  const [activeLensId, setActiveLensId] = useState<string | null>(null)
  const [lenses, setLenses] = useState<CameraInfo[]>([])
  const autoPickedRef = useRef(false)
  const [bright, setBright] = useState(false)

  const enqueue = useCallback((task: () => Promise<void>) => {
    queueRef.current = queueRef.current.then(task, task).catch(() => undefined)
    return queueRef.current
  }, [])

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      const state = scanner.getState()
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        await scanner.stop()
      }
    } catch {
      // already stopped
    }
  }, [])

  // Start (or restart) the camera whenever the facing side or on/off choice changes.
  useEffect(() => {
    let cancelled = false
    void enqueue(async () => {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(elementId, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        })
      }
      await stopCamera()
      setTorchOn(false)
      setTorchSupported(false)
      setBright(false)
      if (cancelled || !wanted) {
        setStatus('stopped')
        return
      }
      setStatus('starting')
      setError(null)
      try {
        const useLens = facing === 'environment' && lensId
        const which: MediaTrackConstraints = useLens ? { deviceId: { exact: lensId } } : { facingMode: facing }
        await scannerRef.current.start(
          which,
          {
            fps: 10,
            // No scan box: read codes anywhere in the frame. A sharper stream than the
            // default helps in dim rooms; continuous focus where the phone supports it.
            videoConstraints: {
              ...which,
              width: { ideal: 1280 },
              height: { ideal: 720 },
              advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
            },
          },
          (text) => onScanRef.current(text),
          () => undefined
        )
        if (cancelled) {
          await stopCamera()
          return
        }
        setStatus('scanning')
        try {
          const caps = scannerRef.current.getRunningTrackCapabilities() as MediaTrackCapabilities & { torch?: boolean }
          setTorchSupported(Boolean(caps.torch))
        } catch {
          setTorchSupported(false)
        }
        let running: string | null = null
        try {
          running = scannerRef.current.getRunningTrackSettings().deviceId ?? null
        } catch {
          running = null
        }
        setActiveLensId(running)
        // Labels are only readable once the camera is allowed, so look now.
        try {
          const cams = await Html5Qrcode.getCameras()
          if (cancelled) return
          setCanFlip(cams.length > 1)
          const backs = backCameras(cams)
          setLenses(backs)
          // First start: if the browser picked a dark lens (ultra wide / zoom), switch once
          // to the main back camera.
          if (facing === 'environment' && !lensId && !autoPickedRef.current) {
            autoPickedRef.current = true
            const best = preferredBackCamera(cams)
            if (best && running && best.id !== running) setLensId(best.id)
          }
        } catch {
          // keep defaults
        }
      } catch (err) {
        if (cancelled) return
        if (facing === 'environment' && lensId) {
          // That lens wouldn't open: go back to the browser's own back-camera choice.
          setLensId(null)
          return
        }
        const name = err instanceof Error ? err.name : String(err)
        const text = err instanceof Error ? err.message : String(err)
        setStatus('error')
        setError(
          /NotAllowed|Permission/i.test(name + text)
            ? 'Camera access is blocked. Allow the camera for this site in your browser settings, then tap Try again.'
            : /NotFound|Overconstrained|no camera/i.test(name + text)
              ? 'No camera was found on this device.'
              : 'The camera could not start. Close other apps using it, then tap Try again.'
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [elementId, facing, lensId, wanted, retry, enqueue, stopCamera])

  // Turn the camera off when the scanner leaves the page.
  useEffect(() => {
    return () => {
      void enqueue(async () => {
        await stopCamera()
        try {
          scannerRef.current?.clear()
        } catch {
          // ignore
        }
        scannerRef.current = null
      })
    }
  }, [enqueue, stopCamera])

  // Pause / resume reading without turning the camera off.
  useEffect(() => {
    const scanner = scannerRef.current
    if (!scanner || status !== 'scanning') return
    try {
      const state = scanner.getState()
      if (paused && state === Html5QrcodeScannerState.SCANNING) scanner.pause(true)
      if (!paused && state === Html5QrcodeScannerState.PAUSED) scanner.resume()
    } catch {
      // ignore
    }
  }, [paused, status])

  async function toggleTorch() {
    const scanner = scannerRef.current
    if (!scanner) return
    const next = !torchOn
    try {
      await scanner.applyVideoConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setTorchOn(next)
    } catch {
      setTorchSupported(false)
    }
  }

  async function toggleBright() {
    const next = !bright
    setBright(next)
    // Where the phone allows it, raise the camera's own exposure too (helps decoding, not
    // just the preview). Otherwise only the preview is brightened.
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      const caps = scanner.getRunningTrackCapabilities() as MediaTrackCapabilities & {
        exposureCompensation?: { min: number; max: number }
      }
      const range = caps.exposureCompensation
      if (range && range.max > 0) {
        await scanner.applyVideoConstraints({
          advanced: [{ exposureCompensation: next ? range.max * 0.6 : 0 } as MediaTrackConstraintSet],
        })
      }
    } catch {
      // preview-only brightening
    }
  }

  const live = status === 'scanning'
  const showLensMenu = facing === 'environment' && lenses.length > 1
  const currentLens = lenses.find((l) => l.id === activeLensId)

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-neutral-950 ring-1 ring-neutral-900/10 dark:ring-white/10">
        <div
          id={elementId}
          className={cn(
            'h-full w-full [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover',
            facing === 'user' && '[&_video]:-scale-x-100',
            bright && '[&_video]:brightness-[1.7] [&_video]:contrast-125'
          )}
        />

        {/* Aiming frame */}
        {live && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            <div className="relative h-3/5 w-3/5">
              <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-white/90" />
              <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-white/90" />
              <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-white/90" />
              <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-white/90" />
            </div>
          </div>
        )}

        {live && (
          <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-center text-sm font-medium text-white">
            {paused ? 'Checking…' : hint}
          </p>
        )}

        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white/80">
            <Camera className="h-8 w-8 animate-pulse" aria-hidden />
            Starting camera…
          </div>
        )}

        {status === 'stopped' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-white/80">
            <CameraOff className="h-8 w-8" aria-hidden />
            Camera is off
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white/90">
            <CameraOff className="h-8 w-8 text-red-300" aria-hidden />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Controls: big, well-spaced touch targets, two per row */}
      {status === 'error' ? (
        <div className="mx-auto w-full max-w-sm">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-2"
            onClick={() => {
              setWanted(true)
              setRetry((n) => n + 1)
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </Button>
        </div>
      ) : (
        <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-2">
          {canFlip && (
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2"
              disabled={!wanted || status === 'starting'}
              onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            >
              <SwitchCamera className="h-4 w-4" aria-hidden />
              {facing === 'environment' ? 'Front camera' : 'Back camera'}
            </Button>
          )}
          {showLensMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="h-11 gap-2" disabled={!live}>
                  <Aperture className="h-4 w-4" aria-hidden />
                  <span className="truncate">Lens: {currentLens ? lensName(currentLens) : 'Auto'}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {lenses.map((lens, i) => (
                  <DropdownMenuItem
                    key={lens.id}
                    className="min-h-11 cursor-pointer justify-between"
                    onSelect={() => setLensId(lens.id)}
                  >
                    {lensName(lens, i)}
                    {lens.id === activeLensId && <Check className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {live && (
            <Button
              type="button"
              variant={bright ? 'default' : 'outline'}
              className="h-11 gap-2"
              aria-pressed={bright}
              onClick={() => void toggleBright()}
            >
              <Sun className="h-4 w-4" aria-hidden />
              Brighter
            </Button>
          )}
          {torchSupported && live && (
            <Button
              type="button"
              variant={torchOn ? 'default' : 'outline'}
              className="h-11 gap-2"
              aria-pressed={torchOn}
              onClick={() => void toggleTorch()}
            >
              {torchOn ? <FlashlightOff className="h-4 w-4" aria-hidden /> : <Flashlight className="h-4 w-4" aria-hidden />}
              {torchOn ? 'Light off' : 'Light on'}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className={cn(
              'h-11 gap-2',
              // Full width when it would otherwise sit alone in half a row.
              ([canFlip, showLensMenu, live, torchSupported && live].filter(Boolean).length % 2 === 0) && 'col-span-2'
            )}
            disabled={status === 'starting'}
            onClick={() => setWanted((w) => !w)}
          >
            {wanted ? <CameraOff className="h-4 w-4" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
            {wanted ? 'Stop camera' : 'Start camera'}
          </Button>
        </div>
      )}
    </div>
  )
}
