'use client'

import { useState } from 'react'
import { Camera, CheckCircle, QrCode } from 'lucide-react'
import { CameraQrScanner } from '@/components/camera-qr-scanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanError?: (error: string) => void
  className?: string
}

/**
 * Card with a start button and the camera scanner. After a code is read the camera turns off
 * and the parent handles the result, as before.
 */
export function QRScanner({ onScanSuccess, onScanError, className }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [lastScanAt, setLastScanAt] = useState<number | null>(null)

  function handleScan(text: string) {
    setIsScanning(false)
    setLastScanAt(Date.now())
    window.setTimeout(() => setLastScanAt(null), 3000)
    try {
      onScanSuccess(text)
    } catch (error) {
      onScanError?.(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" aria-hidden />
          QR code scanner
        </CardTitle>
        <CardDescription>Scan a member&apos;s QR code to check them in for service.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isScanning ? (
          <>
            <CameraQrScanner onScan={handleScan} hint="Point the camera at the member’s QR code" />
            <div className="flex justify-center">
              <Button type="button" variant="ghost" onClick={() => setIsScanning(false)}>
                Close scanner
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            {lastScanAt ? (
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" aria-hidden />
                QR code scanned
              </p>
            ) : null}
            <Button type="button" className="h-11 gap-2" onClick={() => setIsScanning(true)}>
              <Camera className="h-4 w-4" aria-hidden />
              Start scanning
            </Button>
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
              The back camera opens. Hold the code inside the frame until it beeps or the result appears.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
