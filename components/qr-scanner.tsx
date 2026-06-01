'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QrCode, Camera, CameraOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanError?: (error: string) => void
  className?: string
}

export function QRScanner({ onScanSuccess, onScanError, className }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean
    message: string
    timestamp: number
  } | null>(null)
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Check camera permissions
    checkCameraPermissions()
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear()
      }
    }
  }, [])

  const checkCameraPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      setHasPermission(true)
      stream.getTracks().forEach(track => track.stop())
    } catch (error) {
      console.error('Camera permission denied:', error)
      setHasPermission(false)
    }
  }

  const startScanning = () => {
    if (!hasPermission) {
      toast({
        title: "Camera Permission Required",
        description: "Please allow camera access to scan QR codes.",
        variant: "destructive"
      })
      return
    }

    setIsScanning(true)
    
    try {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        },
        false
      )

      scannerRef.current.render(
        (decodedText, decodedResult) => {
          handleScanSuccess(decodedText)
        },
        (errorMessage) => {
          // Only show error if it's not a "No QR code found" message
          if (!errorMessage.includes("No QR code found")) {
            console.log('QR Code parse error:', errorMessage)
          }
        }
      )
    } catch (error) {
      console.error('Error starting scanner:', error)
      toast({
        title: "Scanner Error",
        description: "Failed to start QR scanner. Please try again.",
        variant: "destructive"
      })
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear()
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  const handleScanSuccess = (decodedText: string) => {
    try {
      // Show success feedback
      setLastScanResult({
        success: true,
        message: 'QR Code scanned successfully',
        timestamp: Date.now()
      })

      // Stop scanning
      stopScanning()

      // Call success callback
      onScanSuccess(decodedText)

      // Clear result after 3 seconds
      setTimeout(() => {
        setLastScanResult(null)
      }, 3000)

    } catch (error) {
      console.error('Error processing scan result:', error)
      setLastScanResult({
        success: false,
        message: 'Error processing QR code',
        timestamp: Date.now()
      })
      
      onScanError?.(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const handleScanError = (error: string) => {
    console.error('Scan error:', error)
    onScanError?.(error)
  }

  if (hasPermission === false) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span>Camera Access Denied</span>
          </CardTitle>
          <CardDescription>
            Camera permission is required to scan QR codes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="text-slate-600">
              Please enable camera access in your browser settings and refresh the page.
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <QrCode className="h-5 w-5" />
          <span>QR Code Scanner</span>
        </CardTitle>
        <CardDescription>
          Scan a member's QR code to check them in for service.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Scanner Controls */}
          <div className="flex justify-center space-x-4">
            {!isScanning ? (
              <Button onClick={startScanning} className="flex items-center space-x-2">
                <Camera className="h-4 w-4" />
                <span>Start Scanning</span>
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="destructive" className="flex items-center space-x-2">
                <CameraOff className="h-4 w-4" />
                <span>Stop Scanning</span>
              </Button>
            )}
          </div>

          {/* Scanner Display */}
          {isScanning && (
            <div className="relative">
              <div id="qr-reader" className="w-full"></div>
              <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                Point camera at QR code
              </div>
            </div>
          )}

          {/* Scan Result Feedback */}
          {lastScanResult && (
            <div className={`flex items-center space-x-2 p-3 rounded-lg ${
              lastScanResult.success 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {lastScanResult.success ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">{lastScanResult.message}</span>
            </div>
          )}

          {/* Instructions */}
          {!isScanning && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 mb-2">How to use:</h4>
              <ul className="text-sm text-slate-700 space-y-1">
                <li>• Click "Start Scanning" to begin</li>
                <li>• Point your camera at the member's QR code</li>
                <li>• Hold steady until the code is recognized</li>
                <li>• The member will be automatically checked in</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
