'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Home } from 'lucide-react'
import { Suspense } from 'react'
import QRCode from 'react-qr-code'

function SuccessContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const name = searchParams.get('name')
    const registrationId = searchParams.get('id')
    const qrCode = searchParams.get('qr')

    if (!registrationId) {
        return (
            <div className="text-center">
                <h2 className="text-xl text-red-500">Invalid Registration Data</h2>
                <Button onClick={() => router.push('/camp-meeting/register')} className="mt-4">Back to Registration</Button>
            </div>
        )
    }

    return (
        <Card className="max-w-md w-full text-center">
            <CardHeader>
                <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-700">Registration Successful!</CardTitle>
                <CardDescription className="text-base">
                    Welcome, {name}! We are excited to have you at the camp meeting.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="text-center space-y-3">
                    <p className="text-base text-gray-700">
                        Your registration has been confirmed successfully.
                    </p>
                    {qrCode ? (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                Present this QR code at check-in.
                            </p>
                            <div className="mx-auto w-fit rounded-lg border bg-white p-4 shadow-sm">
                                <QRCode value={qrCode} size={192} />
                            </div>
                            <p className="text-xs text-gray-500 font-mono break-all">{qrCode}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-600">
                            You will receive your QR code and registration details upon arrival at the camp meeting.
                        </p>
                    )}
                </div>

                <div className="pt-4 border-t space-y-4">
                    <p className="text-sm text-gray-600">
                        Thank you for registering! We look forward to seeing you at the camp meeting.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Button 
                            variant="outline" 
                            onClick={() => router.push('/camp-meeting/register')}
                            className="flex-1"
                        >
                            Register Another Person
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => router.push('/')}
                            className="flex-1"
                        >
                            <Home className="mr-2 h-4 w-4" />
                            Home
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default function SuccessPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Suspense fallback={<div>Loading...</div>}>
                <SuccessContent />
            </Suspense>
        </div>
    )
}
