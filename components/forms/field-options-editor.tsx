'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ChurchFormFieldType } from '@/lib/types'
import { Plus, Trash2 } from 'lucide-react'

export function parseFieldOptionsText(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function serializeFieldOptions(options: string[]): string {
  return options.join('\n')
}

const OPTION_FIELD_TYPES = new Set<ChurchFormFieldType>(['dropdown', 'checkbox', 'radio'])

export function fieldTypeUsesOptions(fieldType: ChurchFormFieldType): boolean {
  return OPTION_FIELD_TYPES.has(fieldType)
}

function helperCopy(fieldType: ChurchFormFieldType): { title: string; description: string } {
  switch (fieldType) {
    case 'radio':
      return {
        title: 'Answer choices',
        description: 'Add each option. Respondents can pick only one (shown as radio buttons).',
      }
    case 'dropdown':
      return {
        title: 'Answer choices',
        description: 'Add each option. Respondents pick one from a dropdown list.',
      }
    case 'checkbox':
      return {
        title: 'Answer choices',
        description:
          'Add two or more options for pick-many checkboxes. Leave empty for a single yes/no agreement box.',
      }
    default:
      return { title: 'Options', description: '' }
  }
}

export function FieldOptionsEditor({
  fieldType,
  value,
  onChange,
}: {
  fieldType: ChurchFormFieldType
  value: string
  onChange: (value: string) => void
}) {
  const options = parseFieldOptionsText(value)
  const { title, description } = helperCopy(fieldType)

  function updateOption(index: number, next: string) {
    const copy = [...options]
    copy[index] = next
    onChange(serializeFieldOptions(copy))
  }

  function removeOption(index: number) {
    onChange(serializeFieldOptions(options.filter((_, i) => i !== index)))
  }

  function addOption() {
    onChange(serializeFieldOptions([...options, `Option ${options.length + 1}`]))
  }

  return (
    <div className="space-y-3 md:col-span-2">
      <div>
        <Label>{title}</Label>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-2">
        {options.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-muted-foreground">
            No choices yet — add at least one option below.
          </p>
        ) : (
          options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={option}
                onChange={(event) => updateOption(index, event.target.value)}
                placeholder={`Choice ${index + 1}`}
                aria-label={`Choice ${index + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeOption(index)}
                aria-label={`Remove choice ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addOption}>
        <Plus className="mr-2 h-4 w-4" />
        Add choice
      </Button>
    </div>
  )
}
