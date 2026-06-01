import { cn } from '@/lib/utils'
import { AlertTriangle, RefreshCw, AlertCircle, XCircle, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface ErrorDisplayProps {
  error: string
  onRetry?: () => void
  className?: string
  title?: string
  variant?: 'default' | 'card' | 'inline' | 'page'
  showRetry?: boolean
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  className, 
  title = 'Something went wrong',
  variant = 'default',
  showRetry = true
}: ErrorDisplayProps) {
  const isNetworkError = error.toLowerCase().includes('network') || error.toLowerCase().includes('fetch')
  const isAuthError = error.toLowerCase().includes('unauthorized') || error.toLowerCase().includes('permission')

  const getIcon = () => {
    if (isNetworkError) return <WifiOff className="h-5 w-5" />
    if (isAuthError) return <XCircle className="h-5 w-5" />
    return <AlertTriangle className="h-5 w-5" />
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'card':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'inline':
        return 'bg-red-50 border-red-200 text-red-800 text-sm'
      case 'page':
        return 'bg-red-50 border-red-200 text-red-800 max-w-md mx-auto'
      default:
        return 'bg-red-50 border-red-200 text-red-800'
    }
  }

  if (variant === 'page') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                {getIcon()}
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-600">{error}</p>
              </div>
              {showRetry && onRetry && (
                <Button onClick={onRetry} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn(
      'border rounded-lg p-4 flex items-start space-x-3',
      getVariantClasses(),
      className
    )}>
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium mb-1">{title}</h4>
        <p className="text-sm opacity-90">{error}</p>
        {showRetry && onRetry && (
          <Button
            onClick={onRetry}
            variant="ghost"
            size="sm"
            className="mt-2 h-auto p-0 text-current hover:text-current"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ 
  title, 
  description, 
  icon, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12', className)}>
      <div className="w-12 h-12 text-gray-400 mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-slate-900 mb-2">{title}</h3>
      {description && (
        <p className="text-slate-500 mb-4">{description}</p>
      )}
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  )
}

interface ConnectionStatusProps {
  isOnline: boolean
  className?: string
}

export function ConnectionStatus({ isOnline, className }: ConnectionStatusProps) {
  return (
    <div className={cn(
      'fixed top-4 right-4 z-50 px-3 py-2 rounded-full text-sm font-medium transition-all',
      isOnline 
        ? 'bg-green-100 text-green-800 border border-green-200' 
        : 'bg-red-100 text-red-800 border border-red-200'
    )}>
      <div className="flex items-center space-x-2">
        {isOnline ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <span>{isOnline ? 'Online' : 'Offline'}</span>
      </div>
    </div>
  )
}

interface ErrorBoundaryFallbackProps {
  error?: Error
  resetError?: () => void
  className?: string
}

export function ErrorBoundaryFallback({ 
  error, 
  resetError, 
  className 
}: ErrorBoundaryFallbackProps) {
  return (
    <div className={cn('min-h-screen bg-slate-50 flex items-center justify-center p-4', className)}>
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-slate-900 mb-2">
                Something went wrong
              </h3>
              <p className="text-slate-600 mb-4">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
              {error && process.env.NODE_ENV === 'development' && (
                <details className="text-left bg-gray-100 p-3 rounded text-sm mb-4">
                  <summary className="cursor-pointer font-medium">Error Details</summary>
                  <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
                </details>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {resetError && (
                <Button onClick={resetError}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/dashboard'}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ErrorDisplay
