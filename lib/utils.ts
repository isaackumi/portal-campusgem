import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS'
  }).format(amount)
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '')
  
  // Format Ghana phone numbers
  if (cleaned.startsWith('233')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`
  } else if (cleaned.startsWith('0')) {
    return `+233 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
  }
  
  return phone
}

export function generateUUID(): string {
  return crypto.randomUUID()
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export { isValidPhone } from '@/lib/phone'

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function calculateAge(birthDate: string | Date): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

export function getRelativeTime(date: string | Date): string {
  const now = new Date()
  const targetDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000)
    return `${months} month${months > 1 ? 's' : ''} ago`
  } else {
    const years = Math.floor(diffInSeconds / 31536000)
    return `${years} year${years > 1 ? 's' : ''} ago`
  }
}

export function downloadFile(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    return Promise.resolve()
  }
}

export function isOnline(): boolean {
  return navigator.onLine
}

export function addEventListener(type: 'online' | 'offline', callback: () => void): () => void {
  window.addEventListener(type, callback)
  return () => window.removeEventListener(type, callback)
}

export function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n')
  const result: string[][] = []
  
  for (const line of lines) {
    if (line.trim()) {
      const values = line.split(',').map(value => value.trim().replace(/^"|"$/g, ''))
      result.push(values)
    }
  }
  
  return result
}

export function arrayToCSV(data: any[][]): string {
  return data.map(row => 
    row.map(cell => 
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(',')
  ).join('\n')
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const group = String(item[key])
    groups[group] = groups[group] || []
    groups[group].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

export function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

export function paginate<T>(array: T[], page: number, pageSize: number): {
  data: T[]
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
} {
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const totalPages = Math.ceil(array.length / pageSize)
  
  return {
    data: array.slice(startIndex, endIndex),
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  }
}

export function normalizeMembershipId(id: string): string {
  if (!id) return ''
  
  // Remove all non-alphanumeric characters except hyphens
  const cleaned = id.replace(/[^A-Za-z0-9-]/g, '')
  
  // Convert to uppercase
  const upper = cleaned.toUpperCase()
  
  // If it already has the correct format (EA-XXXX-YYYY), return as is
  if (/^EA-\d{4}-\d{4}$/.test(upper)) {
    return upper
  }
  
  // If it's just numbers, add EA prefix
  if (/^\d{8}$/.test(upper)) {
    return `EA-${upper.slice(0, 4)}-${upper.slice(4)}`
  }
  
  // If it has EA prefix but wrong format, try to fix
  if (upper.startsWith('EA')) {
    const numbers = upper.replace(/[^0-9]/g, '')
    if (numbers.length === 8) {
      return `EA-${numbers.slice(0, 4)}-${numbers.slice(4)}`
    }
  }
  
  return upper
}

export function formatMembershipIdForDisplay(id: string): string {
  if (!id) return ''
  
  const normalized = normalizeMembershipId(id)
  
  // Ensure it's in the correct format for display
  if (/^EA-\d{4}-\d{4}$/.test(normalized)) {
    return normalized
  }
  
  return id
}
