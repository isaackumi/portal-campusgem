import { LoadingSpinner } from '@/components/ui/loading'

export default function AdminLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <LoadingSpinner />
    </div>
  )
}
