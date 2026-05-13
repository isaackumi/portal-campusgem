'use client'

import { useEffect, useState, type ComponentType } from 'react'

type DevtoolsProps = {
  initialIsOpen?: boolean
  buttonPosition?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
}

export function ReactQueryDevtoolsLoader() {
  const [Devtools, setDevtools] = useState<ComponentType<DevtoolsProps> | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    void import('@tanstack/react-query-devtools').then((mod) => {
      setDevtools(() => mod.ReactQueryDevtools)
    })
  }, [])

  if (!Devtools) return null

  return <Devtools initialIsOpen={false} buttonPosition="bottom-left" />
}
