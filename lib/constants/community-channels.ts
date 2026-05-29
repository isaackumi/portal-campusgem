/** Official community invite links shown after public form submission. */
export const CAMPUS_GEM_WHATSAPP_INVITE_URL =
  'https://chat.whatsapp.com/GxCT3JwzESnH3VjZvUNDK3'

export const CAMPUS_GEM_TELEGRAM_URL = 'https://t.me/campusgem'

export const CAMPUS_GEM_COMMUNITY = {
  whatsapp: {
    name: "Eagles' Camp · Campus Gem",
    href: CAMPUS_GEM_WHATSAPP_INVITE_URL,
    description: 'Join our WhatsApp community for updates, fellowship, and camp news.',
  },
  telegram: {
    name: 'Campus Gem Ministries',
    href: CAMPUS_GEM_TELEGRAM_URL,
    description: 'Prayer & Bible study on Telegram — tap to join the channel.',
    schedules: [
      { label: 'Daily prayer', time: '9:00 PM – 9:30 PM & 4:00 AM – 5:00 AM' },
      { label: 'Sunday Bible study', time: '7:00 PM' },
    ],
  },
} as const
