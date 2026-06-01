import { AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function ImportContactWarningsBadge({
  warnings,
  className,
}: {
  warnings?: string[]
  className?: string
}) {
  if (!warnings?.length) return null

  return (
    <Badge
      variant="outline"
      className={`text-xs border-amber-300 bg-amber-50 text-amber-900 ${className ?? ''}`}
      title={warnings.join('; ')}
    >
      <AlertCircle className="h-3 w-3 mr-1" />
      Invalid contact
    </Badge>
  )
}

export function ImportContactWarningsList({ warnings }: { warnings?: string[] }) {
  if (!warnings?.length) return null

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="font-medium mb-1">Import contact warnings</p>
      <ul className="list-disc pl-5 space-y-0.5">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  )
}
