/**
 * SMS Service for Church Management System
 * Uses dummy data for development/testing
 */

export interface SMSMessage {
  id: string
  recipient: {
    name: string
    phone: string
    membership_id?: string
  }
  message: string
  type: 'birthday' | 'anniversary' | 'group' | 'event' | 'custom'
  status: 'pending' | 'sent' | 'failed' | 'delivered'
  scheduled_at?: string
  sent_at?: string
  created_at: string
  created_by: string
}

export interface SMSTemplate {
  id: string
  name: string
  type: 'birthday' | 'anniversary' | 'group' | 'event' | 'custom'
  template: string
  variables: string[]
  is_active: boolean
  created_at: string
}

export interface SMSStats {
  total_sent: number
  pending: number
  delivered: number
  failed: number
  this_month: number
  last_month: number
}

class SMSService {
  private messages: SMSMessage[] = []
  private templates: SMSTemplate[] = []
  private stats: SMSStats = {
    total_sent: 0,
    pending: 0,
    delivered: 0,
    failed: 0,
    this_month: 0,
    last_month: 0
  }

  constructor() {
    this.initializeTemplates()
    this.loadMockData()
  }

  private initializeTemplates() {
    this.templates = [
      {
        id: 'birthday-template',
        name: 'Birthday Greeting',
        type: 'birthday',
        template: 'Happy Birthday {{name}}! 🎉 May God bless you with another year of joy, health, and prosperity. Campus Gem Ministries wishes you a wonderful day!',
        variables: ['name'],
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'anniversary-template',
        name: 'Anniversary Wishes',
        type: 'anniversary',
        template: 'Happy Anniversary {{name}} and {{spouse_name}}! 💕 May God continue to bless your union with love, joy, and many more years together. Congratulations from Campus Gem Ministries!',
        variables: ['name', 'spouse_name'],
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'group-meeting-template',
        name: 'Group Meeting Reminder',
        type: 'group',
        template: 'Reminder: {{group_name}} meeting is scheduled for {{date}} at {{time}} in {{location}}. See you there! - Campus Gem Ministries',
        variables: ['group_name', 'date', 'time', 'location'],
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'event-invitation-template',
        name: 'Event Invitation',
        type: 'event',
        template: 'You\'re invited to {{event_name}} on {{date}} at {{time}}. {{description}} We hope to see you there! - Campus Gem Ministries',
        variables: ['event_name', 'date', 'time', 'description'],
        is_active: true,
        created_at: new Date().toISOString()
      }
    ]
  }

  private loadMockData() {
    // Load some mock SMS messages
    const mockMessages: SMSMessage[] = [
      {
        id: 'msg-1',
        recipient: {
          name: 'John Doe',
          phone: '+233241234567',
          membership_id: 'EA-2024-001'
        },
        message: 'Happy Birthday John! 🎉 May God bless you with another year of joy, health, and prosperity. Campus Gem Ministries wishes you a wonderful day!',
        type: 'birthday',
        status: 'delivered',
        sent_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'admin'
      },
      {
        id: 'msg-2',
        recipient: {
          name: 'Mary Smith',
          phone: '+233241234568',
          membership_id: 'EA-2024-002'
        },
        message: 'Happy Anniversary Mary and James! 💕 May God continue to bless your union with love, joy, and many more years together.',
        type: 'anniversary',
        status: 'sent',
        sent_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'admin'
      },
      {
        id: 'msg-3',
        recipient: {
          name: 'David Johnson',
          phone: '+233241234569',
          membership_id: 'EA-2024-003'
        },
        message: 'Reminder: Youth Fellowship meeting is scheduled for tomorrow at 6:00 PM in the main hall. See you there!',
        type: 'group',
        status: 'pending',
        scheduled_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        created_by: 'admin'
      }
    ]

    this.messages = mockMessages
    this.updateStats()
  }

  private updateStats() {
    const now = new Date()
    const thisMonth = now.getMonth()
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1

    this.stats = {
      total_sent: this.messages.filter(m => m.status === 'sent' || m.status === 'delivered').length,
      pending: this.messages.filter(m => m.status === 'pending').length,
      delivered: this.messages.filter(m => m.status === 'delivered').length,
      failed: this.messages.filter(m => m.status === 'failed').length,
      this_month: this.messages.filter(m => {
        if (!m.sent_at) return false
        const sentDate = new Date(m.sent_at)
        return sentDate.getMonth() === thisMonth
      }).length,
      last_month: this.messages.filter(m => {
        if (!m.sent_at) return false
        const sentDate = new Date(m.sent_at)
        return sentDate.getMonth() === lastMonth
      }).length
    }
  }

  // Template methods
  async getTemplates(): Promise<SMSTemplate[]> {
    return this.templates.filter(t => t.is_active)
  }

  async createTemplate(template: Omit<SMSTemplate, 'id' | 'created_at'>): Promise<SMSTemplate> {
    const newTemplate: SMSTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      created_at: new Date().toISOString()
    }
    this.templates.push(newTemplate)
    return newTemplate
  }

  async updateTemplate(id: string, updates: Partial<SMSTemplate>): Promise<SMSTemplate | null> {
    const index = this.templates.findIndex(t => t.id === id)
    if (index === -1) return null

    this.templates[index] = { ...this.templates[index], ...updates }
    return this.templates[index]
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const index = this.templates.findIndex(t => t.id === id)
    if (index === -1) return false

    this.templates.splice(index, 1)
    return true
  }

  // Message methods
  async getMessages(filters?: {
    type?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<{ messages: SMSMessage[], total: number }> {
    let filteredMessages = [...this.messages]

    if (filters?.type) {
      filteredMessages = filteredMessages.filter(m => m.type === filters.type)
    }

    if (filters?.status) {
      filteredMessages = filteredMessages.filter(m => m.status === filters.status)
    }

    const total = filteredMessages.length
    const offset = filters?.offset || 0
    const limit = filters?.limit || 50

    const messages = filteredMessages
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit)

    return { messages, total }
  }

  async sendMessage(message: Omit<SMSMessage, 'id' | 'created_at' | 'status'>): Promise<SMSMessage> {
    const newMessage: SMSMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      created_at: new Date().toISOString(),
      status: 'pending'
    }

    this.messages.push(newMessage)
    this.updateStats()

    // Simulate sending SMS (dummy implementation)
    setTimeout(() => {
      const index = this.messages.findIndex(m => m.id === newMessage.id)
      if (index !== -1) {
        // Simulate 90% success rate
        const success = Math.random() > 0.1
        this.messages[index].status = success ? 'sent' : 'failed'
        this.messages[index].sent_at = new Date().toISOString()
        this.updateStats()
      }
    }, 1000)

    return newMessage
  }

  async sendBulkMessages(messages: Omit<SMSMessage, 'id' | 'created_at' | 'status'>[]): Promise<SMSMessage[]> {
    const newMessages: SMSMessage[] = []
    
    for (const message of messages) {
      const newMessage = await this.sendMessage(message)
      newMessages.push(newMessage)
    }

    return newMessages
  }

  async sendBirthdayMessages(members: Array<{ name: string; phone: string; membership_id?: string }>): Promise<SMSMessage[]> {
    const template = this.templates.find(t => t.type === 'birthday')
    if (!template) throw new Error('Birthday template not found')

    const messages = members.map(member => ({
      recipient: {
        name: member.name,
        phone: member.phone,
        membership_id: member.membership_id
      },
      message: template.template.replace('{{name}}', member.name),
      type: 'birthday' as const,
      created_by: 'system'
    }))

    return this.sendBulkMessages(messages)
  }

  async sendAnniversaryMessages(members: Array<{ 
    name: string; 
    spouse_name: string; 
    phone: string; 
    membership_id?: string 
  }>): Promise<SMSMessage[]> {
    const template = this.templates.find(t => t.type === 'anniversary')
    if (!template) throw new Error('Anniversary template not found')

    const messages = members.map(member => ({
      recipient: {
        name: member.name,
        phone: member.phone,
        membership_id: member.membership_id
      },
      message: template.template
        .replace('{{name}}', member.name)
        .replace('{{spouse_name}}', member.spouse_name),
      type: 'anniversary' as const,
      created_by: 'system'
    }))

    return this.sendBulkMessages(messages)
  }

  async sendGroupMessage(groupId: string, message: string, createdBy: string): Promise<SMSMessage[]> {
    // This would fetch group members in a real implementation
    // For now, return empty array
    return []
  }

  async getStats(): Promise<SMSStats> {
    return this.stats
  }

  async deleteMessage(id: string): Promise<boolean> {
    const index = this.messages.findIndex(m => m.id === id)
    if (index === -1) return false

    this.messages.splice(index, 1)
    this.updateStats()
    return true
  }

  // Utility methods
  async validatePhoneNumber(phone: string): Promise<boolean> {
    // Simple validation for Ghana phone numbers
    const ghanaPhoneRegex = /^(\+233|0)[2-9][0-9]{8}$/
    return ghanaPhoneRegex.test(phone)
  }

  async getMessageHistory(phone: string, limit: number = 10): Promise<SMSMessage[]> {
    return this.messages
      .filter(m => m.recipient.phone === phone)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  }
}

// Export singleton instance
export const smsService = new SMSService()
export default smsService

