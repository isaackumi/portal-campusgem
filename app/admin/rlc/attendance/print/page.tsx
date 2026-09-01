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
  summarizeAttendancePresent,
  type AttendanceSummaryStats,
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

function formatPrintDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return isoDate
  return parsed.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'rose' | 'sky' | 'emerald' | 'amber' | 'slate'
}) {
  const accentClass =
    accent === 'rose'
      ? 'text-rose-800'
      : accent === 'sky'
        ? 'text-sky-800'
        : accent === 'emerald'
          ? 'text-emerald-800'
          : accent === 'amber'
            ? 'text-amber-800'
            : 'text-slate-800'

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-center print:bg-white">
      <p className={`text-2xl font-bold tabular-nums ${accentClass}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  )
}

function AttendanceSummaryGrid({ summary }: { summary: AttendanceSummaryStats }) {
  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 print:break-inside-avoid">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attendance summary</h2>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-3">
        <StatCell label="Total present" value={summary.present} accent="rose" />
        <StatCell label="Members" value={summary.members} accent="emerald" />
        <StatCell label="Visitors" value={summary.visitors} accent="sky" />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCell label="Male" value={summary.male} />
        <StatCell label="Female" value={summary.female} />
        <StatCell label="Children (0–12)" value={summary.children} accent="amber" />
        <StatCell label="Teens (13–17)" value={summary.teens} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCell label="Young adults (18–35)" value={summary.youngAdults} />
        <StatCell label="Adults (36–59)" value={summary.adults} />
        <StatCell label="Seniors (60+)" value={summary.seniors} />
      </div>
      {(summary.genderUnspecified > 0 ||
        summary.ageUnspecified > 0 ||
        summary.otherGender > 0) && (
        <p className="mt-3 text-xs text-slate-500">
          {summary.genderUnspecified > 0 ? `${summary.genderUnspecified} gender not specified` : null}
          {summary.genderUnspecified > 0 && summary.ageUnspecified > 0 ? ' · ' : null}
          {summary.ageUnspecified > 0 ? `${summary.ageUnspecified} age not specified` : null}
          {(summary.genderUnspecified > 0 || summary.ageUnspecified > 0) && summary.otherGender > 0
            ? ' · '
            : null}
          {summary.otherGender > 0 ? `${summary.otherGender} other gender` : null}
        </p>
      )}
    </section>
  )
}

function PresentTable({
  title,
  titleClass,
  rows,
}: {
  title: string
  titleClass: string
  rows: RlcAttendanceRosterRow[]
}) {
  if (rows.length === 0) return null

  return (
    <>
      <h2 className={`mt-8 text-sm font-semibold uppercase tracking-wide ${titleClass}`}>{title}</h2>
      <table className="mt-3 w-full border-collapse text-sm print:break-inside-auto">
        <thead>
          <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="w-10 py-2 pr-2">#</th>
            <th className="py-2 pr-2">Name</th>
            <th className="w-24 py-2 pr-2">Type</th>
            <th className="py-2">Phone</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.attendance.id} className="border-b border-slate-100">
              <td className="py-2 pr-2 tabular-nums text-slate-500">{index + 1}</td>
              <td className="py-2 pr-2 font-medium">{row.name}</td>
              <td className="py-2 pr-2 font-semibold">
                {row.kind === 'visitor' ? (
                  <span className="text-sky-800">Visitor</span>
                ) : row.kind === 'member' ? (
                  <span className="text-emerald-800">Member</span>
                ) : (
                  <span className="capitalize text-slate-700">{row.kind}</span>
                )}
              </td>
              <td className="py-2 text-slate-600">{row.phone || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

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
      loadRlcVisitorsAction({ include_inactive: true }),
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
  const summary = useMemo(() => summarizeAttendancePresent(present), [present])
  const presentVisitors = useMemo(() => present.filter((row) => row.kind === 'visitor'), [present])
  const presentMembers = useMemo(() => present.filter((row) => row.kind !== 'visitor'), [present])

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
        <header className="border-b border-slate-300 pb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">{RLC_NAME}</p>
          <h1 className="mt-1 text-2xl font-semibold">Service attendance record</h1>
          <p className="mt-3 text-xl font-semibold text-slate-900">{serviceLabel}</p>
          <p className="mt-1 text-sm text-slate-600">{formatPrintDate(serviceDate)}</p>
          <p className="mt-3 text-sm font-medium text-slate-700">
            {present.length} present
            {absentNoted.length > 0 ? ` · ${absentNoted.length} absent with note` : ''}
          </p>
        </header>

        {present.length > 0 ? <AttendanceSummaryGrid summary={summary} /> : null}

        {roster.length === 0 ? (
          <p className="mt-8 text-sm text-slate-600">No attendance records for this service.</p>
        ) : (
          <>
            <PresentTable
              title={`Present visitors (${presentVisitors.length})`}
              titleClass="text-sky-800"
              rows={presentVisitors}
            />
            <PresentTable
              title={`Present members (${presentMembers.length})`}
              titleClass="text-emerald-800"
              rows={presentMembers}
            />

            {absentNoted.length > 0 ? (
              <>
                <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-amber-800">
                  Absent with note ({absentNoted.length})
                </h2>
                <table className="mt-3 w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="w-10 py-2 pr-2">#</th>
                      <th className="py-2 pr-2">Name</th>
                      <th className="w-24 py-2 pr-2">Type</th>
                      <th className="py-2">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absentNoted.map((row: RlcAttendanceRosterRow, index) => (
                      <tr key={row.attendance.id} className="border-b border-slate-100">
                        <td className="py-2 pr-2 tabular-nums text-slate-500">{index + 1}</td>
                        <td className="py-2 pr-2 font-medium">{row.name}</td>
                        <td className="py-2 pr-2 font-semibold">
                          {row.kind === 'visitor' ? (
                            <span className="text-sky-800">Visitor</span>
                          ) : row.kind === 'member' ? (
                            <span className="text-emerald-800">Member</span>
                          ) : (
                            <span className="capitalize text-slate-700">{row.kind}</span>
                          )}
                        </td>
                        <td className="py-2 text-slate-600">{row.attendance.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}
          </>
        )}

        <footer className="mt-10 grid gap-6 border-t border-slate-300 pt-6 text-sm sm:grid-cols-2 print:break-inside-avoid">
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
