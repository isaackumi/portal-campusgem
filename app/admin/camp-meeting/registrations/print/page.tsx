'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { campService } from '@/lib/services/camp-service'
import { getActiveCampYear } from '@/lib/actions/camp'
import { CampRegistration, CampYear } from '@/lib/types'
import QRCode from 'react-qr-code'
import { LoadingSpinner } from '@/components/ui/loading'
import { cn } from '@/lib/utils'

function PrintQRCodesContent() {
  const searchParams = useSearchParams()
  const idsParam = searchParams.get('ids')
  const layout = searchParams.get('layout') === 'slips' ? 'slips' : 'sheet'
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
            const filtered = allRegs.filter((reg) => ids.includes(reg.id))
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
    void load()
  }, [idsParam])

  useEffect(() => {
    if (!loading && registrations.length > 0) {
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, registrations.length])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const isSlips = layout === 'slips'

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: ${isSlips ? '62mm 100mm' : 'A4'};
            margin: ${isSlips ? '3mm' : '1cm'};
          }
          .no-print {
            display: none !important;
          }
          .qr-card {
            page-break-inside: avoid;
          }
          .slip-card {
            page-break-after: always;
            break-after: page;
          }
          .slip-card:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
      <div className={cn('min-h-screen bg-white', isSlips ? 'p-4' : 'p-8')}>
        <div className="no-print mb-8 border-b pb-4 text-center">
          <h1 className="text-2xl font-bold">
            {isSlips ? 'Camp QR slips' : 'Camp meeting QR codes'}
          </h1>
          <p className="mt-2 text-slate-600">
            {campYear?.year} · {campYear?.theme}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {registrations.length} registration(s) · {isSlips ? 'one slip per page' : '3 per row on A4'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded bg-primary px-4 py-2 text-white hover:bg-primary/90"
            >
              Print
            </button>
          </div>
        </div>

        {!isSlips ? (
          <div className="mb-8 border-b-2 border-gray-800 pb-4 text-center">
            <h1 className="text-2xl font-bold">
              Campus GEM Camp Meeting {campYear?.year || new Date().getFullYear()}
            </h1>
            <p className="mt-1 text-lg text-slate-700">{campYear?.theme || 'Camp meeting'}</p>
            <p className="mt-2 text-sm text-slate-600">QR codes for check-in</p>
          </div>
        ) : null}

        <div
          className={cn(
            isSlips
              ? 'mx-auto flex max-w-[62mm] flex-col gap-4'
              : 'grid grid-cols-3 gap-8'
          )}
        >
          {registrations.map((reg) => {
            const qrValue = reg.qr_code || ''
            const fullName = reg.full_name || `${reg.first_name} ${reg.last_name}`
            const role = reg.role || 'Participant'
            const campCode = reg.check_in_code?.trim()

            if (isSlips) {
              return (
                <div
                  key={reg.id}
                  className="slip-card qr-card mx-auto flex w-[56mm] flex-col items-center border border-gray-300 px-2 py-3 text-center"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Campus GEM {campYear?.year}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold leading-tight text-slate-900">
                    {fullName}
                  </p>
                  <p className="text-[10px] text-slate-600">{role}</p>
                  {campCode ? (
                    <p className="mt-1 font-mono text-sm font-bold tracking-wide text-slate-900">
                      {campCode}
                    </p>
                  ) : null}
                  <div className="mt-2 rounded border border-slate-200 bg-white p-1">
                    <QRCode value={qrValue} size={96} level="H" />
                  </div>
                  <p className="mt-2 text-[9px] text-slate-500">Show at every session</p>
                </div>
              )
            }

            return (
              <div key={reg.id} className="qr-card border border-gray-300 p-4 text-center">
                <div className="mb-2 text-sm font-bold">{fullName}</div>
                <div className="mb-1 text-xs text-slate-600">{role}</div>
                {campCode ? (
                  <div className="mb-2 font-mono text-sm font-bold tracking-wide text-slate-900">
                    {campCode}
                  </div>
                ) : null}
                <div className="mb-2 flex justify-center">
                  <div className="border border-slate-200 bg-white p-2">
                    <QRCode
                      value={qrValue}
                      size={150}
                      level="H"
                      style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                    />
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-500">ID: {reg.id.slice(0, 8)}…</div>
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
