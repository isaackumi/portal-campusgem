'use client'

import type { ReactNode } from 'react'
import { CAMPUS_GEM_COMMUNITY } from '@/lib/constants/community-channels'
import { WhatsappLogo } from '@/components/icons/whatsapp-logo'
import { TelegramLogo } from '@/components/icons/telegram-logo'
import { Clock, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

function ChannelCard({
  href,
  name,
  description,
  icon,
  iconClassName,
  cardClassName,
  children,
}: {
  href: string
  name: string
  description: string
  icon: ReactNode
  iconClassName: string
  cardClassName: string
  children?: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group flex gap-4 rounded-xl border p-4 text-left transition-all',
        'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        cardClassName
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm',
          iconClassName
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-slate-900 group-hover:text-slate-950">{name}</p>
          <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
        {children}
        <p className="mt-3 text-xs font-medium text-slate-500 group-hover:text-primary">Tap to join →</p>
      </div>
    </a>
  )
}

export function PublicFormCommunityJoin() {
  const { whatsapp, telegram } = CAMPUS_GEM_COMMUNITY

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/60 px-4 py-4">
        <h2 className="text-base font-bold text-slate-900">Stay connected with Campus Gem</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Join our community channels for prayer, Bible study, and updates.
        </p>
      </div>
      <div className="space-y-3 p-3">
        <ChannelCard
          href={whatsapp.href}
          name={whatsapp.name}
          description={whatsapp.description}
          icon={<WhatsappLogo className="h-7 w-7" />}
          iconClassName="bg-[#25D366]"
          cardClassName="border-emerald-100 bg-emerald-50/40 hover:border-emerald-200 hover:bg-emerald-50/80"
        />
        <ChannelCard
          href={telegram.href}
          name={telegram.name}
          description={telegram.description}
          icon={<TelegramLogo className="h-7 w-7" />}
          iconClassName="bg-[#229ED9]"
          cardClassName="border-sky-100 bg-sky-50/40 hover:border-sky-200 hover:bg-sky-50/80"
        >
          <ul className="mt-3 space-y-2">
            {telegram.schedules.map((item) => (
              <li key={item.label} className="flex gap-2 text-sm text-slate-700">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
                <span>
                  <span className="font-medium">{item.label}:</span> {item.time}
                </span>
              </li>
            ))}
          </ul>
        </ChannelCard>
      </div>
    </section>
  )
}
