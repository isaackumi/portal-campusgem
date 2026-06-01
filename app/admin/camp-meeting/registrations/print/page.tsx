'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { campService } from '@/lib/services/camp-service'
import { getActiveCampYear } from '@/lib/actions/camp'
import { CampRegistration, CampYear } from '@/lib/types'
import QRCode from 'react-qr-code'
import { LoadingSpinner } from '@/components/ui/loading'

function PrintQRCodesContent() {
    const searchParams = useSearchParams()
    const idsParam = searchParams.get('ids')
    const [registrations, setRegistrations] = useState<CampRegistration[]>([])
    const [campYear, setCampYear] = useState<CampYear | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const { data: year } = await getActiveCampYear()
                if (year) {
                    setCampYear(year)
                    const { data: allRegs } = await campService.getCampRegistrations(year.id)
                    if (allRegs && idsParam) {
                        const ids = idsParam.split(',')
                        const filtered = allRegs.filter(reg => ids.includes(reg.id))
                        setRegistrations(filtered)
                    } else if (allRegs) {
                        setRegistrations(allRegs)
                    }
                }
            } catch (error) {
                console.error('Error loading registrations:', error)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [idsParam])

    useEffect(() => {
        // Auto-print when page loads
        if (!loading && registrations.length > 0) {
            setTimeout(() => {
                window.print()
            }, 500)
        }
    }, [loading, registrations.length])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        )
    }

    return (
        <>
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 1cm;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .qr-card {
                        page-break-inside: avoid;
                    }
                }
            `}</style>
            <div className="min-h-screen bg-white p-8">
            
            {/* Header - Hidden when printing */}
            <div className="no-print text-center mb-8 pb-4 border-b">
                <h1 className="text-2xl font-bold">Camp Meeting QR Codes</h1>
                <p className="text-slate-600 mt-2">
                    {campYear?.year} • {campYear?.theme}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                    Total: {registrations.length} registration(s)
                </p>
                <button
                    onClick={() => window.print()}
                    className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
                >
                    Print QR Codes
                </button>
            </div>

            {/* Print Header */}
            <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
                <h1 className="text-2xl font-bold">Campus GEM Camp Meeting {campYear?.year || new Date().getFullYear()}</h1>
                <p className="text-lg text-slate-700 mt-1">{campYear?.theme || 'Camp Meeting'}</p>
                <p className="text-sm text-slate-600 mt-2">QR Codes for Check-in</p>
                <p className="text-xs text-slate-500 mt-1">Total: {registrations.length} registration(s)</p>
            </div>

            {/* QR Codes Grid */}
            <div className="grid grid-cols-3 gap-8">
                {registrations.map((reg) => {
                    const qrValue = reg.qr_code || ''
                    const fullName = reg.full_name || `${reg.first_name} ${reg.last_name}`
                    const role = reg.role || 'Participant'
                    const campCode = reg.check_in_code?.trim()
                    
                    return (
                        <div key={reg.id} className="qr-card border border-gray-300 p-4 text-center">
                            <div className="font-bold text-sm mb-2">{fullName}</div>
                            <div className="text-xs text-slate-600 mb-1">{role}</div>
                            {campCode ? (
                                <div className="font-mono text-sm font-bold tracking-wide text-slate-900 mb-2">
                                    {campCode}
                                </div>
                            ) : null}
                            <div className="flex justify-center mb-2">
                                <div className="bg-white p-2 border border-slate-200">
                                    <QRCode
                                        value={qrValue}
                                        size={150}
                                        level="H"
                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                    />
                                </div>
                            </div>
                            <div className="text-xs text-slate-500 mt-2">ID: {reg.id.slice(0, 8)}...</div>
                        </div>
                    )
                })}
            </div>
            </div>
        </>
    )
}

export default function PrintQRCodesPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center">
                    <LoadingSpinner />
                </div>
            }
        >
            <PrintQRCodesContent />
        </Suspense>
    )
}
