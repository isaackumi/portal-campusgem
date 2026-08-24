'use client'

import { useState } from 'react'
import { RLC_SERVICES } from '@/lib/constants/rlc'
import {
  RLC_CUSTOM_PLACEHOLDER,
  RLC_STANDARD_PLACEHOLDER,
  type RlcServiceSelection,
} from '@/lib/rlc/service-selection'
import type { RlcCustomService } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus } from 'lucide-react'

type RlcServiceSelectProps = {
  selection: RlcServiceSelection
  onChange: (selection: RlcServiceSelection) => void
  customServices: RlcCustomService[]
  onCreateCustom: (name: string) => Promise<RlcCustomService | null>
  creatingCustom?: boolean
}

export function RlcServiceSelect({
  selection,
  onChange,
  customServices,
  onCreateCustom,
  creatingCustom = false,
}: RlcServiceSelectProps) {
  const [newOtherName, setNewOtherName] = useState('')

  const standardValue =
    selection.kind === 'standard' ? selection.serviceType : RLC_STANDARD_PLACEHOLDER
  const customValue =
    selection.kind === 'custom' ? selection.customServiceId : RLC_CUSTOM_PLACEHOLDER

  async function handleSaveOther() {
    const name = newOtherName.trim()
    if (name.length < 2) return
    const created = await onCreateCustom(name)
    if (created) {
      onChange({ kind: 'custom', customServiceId: created.id, label: created.name })
      setNewOtherName('')
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Regular service</Label>
        <Select
          value={standardValue}
          onValueChange={(value) => {
            if (value === RLC_STANDARD_PLACEHOLDER) return
            onChange({ kind: 'standard', serviceType: value as (typeof RLC_SERVICES)[number]['value'] })
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a regular service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={RLC_STANDARD_PLACEHOLDER} disabled>
              {selection.kind === 'custom' ? 'Using other service below' : 'Choose regular service'}
            </SelectItem>
            {RLC_SERVICES.map((service) => (
              <SelectItem key={service.value} value={service.value}>
                {service.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 rounded-lg border border-dashed border-rose-200/90 bg-rose-50/50 p-3">
        <div>
          <Label>Other service</Label>
          <p className="text-xs text-muted-foreground">
            Saved separately so your regular list stays short. Name once, reuse anytime.
          </p>
        </div>

        <Select
          value={customValue}
          onValueChange={(value) => {
            if (value === RLC_CUSTOM_PLACEHOLDER) return
            const found = customServices.find((row) => row.id === value)
            if (found) {
              onChange({ kind: 'custom', customServiceId: found.id, label: found.name })
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a saved other service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={RLC_CUSTOM_PLACEHOLDER} disabled>
              {customServices.length === 0 ? 'No saved other services yet' : 'Choose saved other service'}
            </SelectItem>
            {customServices.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Name a new other service…"
            value={newOtherName}
            onChange={(e) => setNewOtherName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleSaveOther()
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0 border-rose-200"
            disabled={creatingCustom || newOtherName.trim().length < 2}
            onClick={() => void handleSaveOther()}
          >
            <Plus className="mr-2 h-4 w-4" />
            {creatingCustom ? 'Saving…' : 'Save & use'}
          </Button>
        </div>
      </div>
    </div>
  )
}
