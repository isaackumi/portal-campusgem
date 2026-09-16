import type { Metadata } from 'next'
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jet',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Form | Campus Gem Ministries',
  description: 'Complete a Campus Gem Ministries form',
}

/** Avoid stale vendor-chunk static path generation for dynamic public forms */
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default function PublicFormLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${bricolage.variable} ${inter.variable} ${jetbrains.variable} editorial-story min-h-[100dvh] antialiased`}
    >
      {children}
    </div>
  )
}
