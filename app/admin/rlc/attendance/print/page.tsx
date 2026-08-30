'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  loadRlcAttendanceAction,
  loadRlcCustomServicesAction,
  loadRlcMembersAction,
  loadRlcVisitorsAction,
} from '@/lib/actions/rlc'
import { RLC_NAME } from '@/lib/constants/rlc'
import {
  buildAttendanceRoster,
  splitAttendanceRoster,
  type RlcAttendanceRosterRow,
} from '@/lib/rlc/attendance-roster'
import {
  parseRlcServiceSelection,
  rlcServiceSelectionLabel,
  type RlcServiceSelection,
} from '@/lib/rlc/service-selection'
import type { Attendance, Member, RlcCustomService, Visitor } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading'
import { Printer } from 'lucide-react'

function PrintContent() {
  const searchParams = useSearchParams()
  const serviceDate = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const serviceParam = searchParams.get('service')
  const customParam = searchParams.get('custom')

  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [customServices, setCustomServices] = useState<RlcCustomService[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      loadRlcAttendanceAction({ serviceDate }),
      loadRlcMembersAction(),
      loadRlcVisitorsAction(),
      loadRlcCustomServicesAction(),
    ]).then(([a, m, v, custom]) => {
      setAttendance(a.data ?? [])
      setMembers(m.data ?? [])
      setVisitors(v.data ?? [])
      setCustomServices(custom.data ?? [])
      setLoading(false)
    })
  }, [serviceDate])

  const serviceSelection: RlcServiceSelection = useMemo(
    () => parseRlcServiceSelection(serviceParam, customParam, customServices),
    [serviceParam, customParam, customServices]
  )

  const serviceLabel = useMemo(
    () => rlcServiceSelectionLabel(serviceSelection),
    [serviceSelection]
  )

  const roster = useMemo(
    () => buildAttendanceRoster(attendance, members, visitors, serviceSelection),
    [attendance, members, visitors, serviceSelection]
  )

  const { present, absentNoted } = useMemo(() => splitAttendanceRoster(roster), [roster])

  useEffect(() => {
    if (!loading && roster.length >= 0) {
      const timer = setTimeout(() => window.print(), 400)
      return () => clearTimeout(timer)
    }
  }, [loading, roster.length])

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
          @page { size: A4; margin: 12mm; }
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <div className="no-print mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
        <Button variant="outline" asChild>
          <Link href={`/admin/rlc/attendance`}>Back to attendance</Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print again
        </Button>
      </div>

      <div className="mx-auto max-w-3xl bg-white px-6 py-8 text-slate-900">
        <header className="border-b border-slate-300 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">{RLC_NAME}</p>
          <h1 className="mt-1 text-2xl font-semibold">Service attendance record</h1>
          <p className="mt-2 text-sm text-slate-600">
            {serviceLabel} · {serviceDate} · {present.length} present
            {absentNoted.length > 0 ? ` · ${absentNoted.length} absent (noted)` : ''}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Printed {new Date().toLocaleString()} · Official check-in evidence
          </p>
        </header>

        {roster.length === 0 ? (
          <p className="mt-8 text-sm text-slate-600">No attendance records for this service.</p>
        ) : (
          <>
            {present.length > 0 ? (
              <>
                <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-emerald-800">
                  Present ({present.length})
                </h2>
                <table className="mt-3 w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-2">#</th>
                      <th className="py-2 pr-2">Name</th>
                      <th className="py-2 pr-2">Type</th>
                      <th className="py-2 pr-2">Phone / code</th>
                      <th className="py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {present.map((row: RlcAttendanceRosterRow, index) => (
                      <tr key={row.attendance.id} className="border-b border-slate-100">
                        <td className="py-2 pr-2 tabular-nums text-slate-500">{index + 1}</td>
                        <td className="py-2 pr-2 font-medium">{row.name}</td>
                        <td className="py-2 pr-2 capitalize">{row.kind}</td>
                        <td className="py-2 pr-2 text-slate-600">
                          {[row.phone, row.code, row.membershipId].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="py-2 tabular-nums text-slate-600">
                          {row.attendance.check_in_time
                            ? new Date(row.attendance.check_in_time).toLocaleTimeString()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}

            {absentNoted.length > 0 ? (
              <>
                <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-amber-800">
                  Absent with note ({absentNoted.length})
                </h2>
                <table className="mt-3 w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-2">#</th>
                      <th className="py-2 pr-2">Name</th>
                      <th className="py-2 pr-2">Type</th>
                      <th className="py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absentNoted.map((row: RlcAttendanceRosterRow, index) => (
                      <tr key={row.attendance.id} className="border-b border-slate-100">
                        <td className="py-2 pr-2 tabular-nums text-slate-500">{index + 1}</td>
                        <td className="py-2 pr-2 font-medium">{row.name}</td>
                        <td className="py-2 pr-2 capitalize">{row.kind}</td>
                        <td className="py-2 text-slate-600">{row.attendance.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}
          </>
        )}

        <footer className="mt-10 grid gap-6 border-t border-slate-300 pt-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Verified by</p>
            <div className="mt-8 border-b border-slate-400" />
            <p className="mt-1 text-xs text-slate-500">Name / signature</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Date</p>
            <div className="mt-8 border-b border-slate-400" />
            <p className="mt-1 text-xs text-slate-500">Day / month / year</p>
          </div>
        </footer>
      </div>
    </>
  )
}

export default function RlcAttendancePrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <PrintContent />
    </Suspense>
  )
}
