'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import QRCode from 'react-qr-code'
import { loadRlcVisitorsAction } from '@/lib/actions/rlc'
import { RLC_NAME } from '@/lib/constants/rlc'
import type { Visitor } from '@/lib/types'
import { LoadingSpinner } from '@/components/ui/loading'

function PrintSlipsContent() {
  const searchParams = useSearchParams()
  const idsParam = searchParams.get('ids')
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRlcVisitorsAction().then(({ data }) => {
      const all = (data ?? []).filter((row) => row.is_active !== false && !row.converted_to_member)
      if (idsParam) {
        const ids = idsParam.split(',')
        setVisitors(all.filter((row) => ids.includes(row.id)))
      } else {
        setVisitors(all)
      }
      setLoading(false)
    })
  }, [idsParam])

  useEffect(() => {
    if (!loading && visitors.length > 0) {
      const timer = setTimeout(() => window.print(), 400)
      return () => clearTimeout(timer)
    }
  }, [loading, visitors.length])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: 62mm 100mm; margin: 3mm; }
          .no-print { display: none !important; }
          .slip { page-break-after: always; }
          .slip:last-child { page-break-after: auto; }
        }
      `}</style>
      <div className="min-h-screen bg-white p-4">
        <div className="no-print mb-6 text-center">
          <h1 className="text-xl font-bold">RLC visitor welcome slips</h1>
          <p className="text-sm text-slate-600">{visitors.length} slip(s)</p>
          <button
            type="button"
            className="mt-3 rounded bg-rose-700 px-4 py-2 text-white"
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>
        <div className="mx-auto flex max-w-[62mm] flex-col gap-4">
          {visitors.map((visitor) => {
            const name = `${visitor.first_name} ${visitor.last_name ?? ''}`.trim()
            const qrValue = visitor.qr_code || visitor.check_in_code || visitor.id
            return (
              <div key={visitor.id} className="slip mx-auto w-[56mm] border px-2 py-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{RLC_NAME}</p>
                <p className="mt-1 text-sm font-bold leading-tight">{name}</p>
                {visitor.check_in_code ? (
                  <p className="mt-1 font-mono text-sm font-bold">{visitor.check_in_code}</p>
                ) : null}
                <div className="mt-2 flex justify-center">
                  <QRCode value={qrValue} size={96} level="H" />
                </div>
                <p className="mt-2 text-[9px] text-slate-500">Show at every service</p>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default function RlcVisitorPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <PrintSlipsContent />
    </Suspense>
  )
}
