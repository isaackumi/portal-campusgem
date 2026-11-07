import type { Permission } from '@/lib/auth/roles'

/**
 * Guided tours: pure data, no React. The engine lives in components/tour/tour-provider.tsx.
 *
 * - `element` / `mobileElement` are `data-tour` ids (see lib/tour/anchors.ts), not selectors.
 * - A step whose element is missing or hidden (no permission, collapsed menu, empty list) is
 *   skipped, unless `fallback: 'center'`, which shows it as a centred card instead.
 * - A step with no element is always a centred card.
 * - "Mobile" means narrower than the `lg` breakpoint, where the sidebar becomes a menu.
 */

export type TourGroupId =
  | 'getting-started'
  | 'people'
  | 'attendance'
  | 'groups'
  | 'camp'
  | 'communication'
  | 'rlc'
  | 'pastoral'

export type TourStep = {
  element?: string
  /** Used instead of `element` on phones and tablets. */
  mobileElement?: string
  /** Show the step on one layout only. */
  only?: 'desktop' | 'mobile'
  title: string
  body: string
  /** Wording for phones, when the desktop text talks about the sidebar. */
  mobileBody?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** What to do when the element isn't on the page. Default: skip the step. */
  fallback?: 'skip' | 'center'
  /** Only for people with this permission (or any one of a list). */
  permission?: Permission | Permission[]
}

export type Tour = {
  id: string
  group: TourGroupId
  title: string
  description: string
  /** Who sees the tour (any one of a list). Omit for everyone. */
  permission?: Permission | Permission[]
  /** Page the tour belongs to. `[param]` segments match any value. */
  route: string
  /** Paths that look like `route` but aren't (e.g. `/members/add` for `/members/[id]`). */
  excludeRoutes?: string[]
  /** Runs on any app page without navigating (the shell tour). */
  anyPage?: boolean
  /** For tours on a `[param]` page: where Start takes you, with a hint to pick an item. */
  startRoute?: string
  startHint?: string
  steps: TourStep[]
}

export const TOUR_GROUPS: Array<{ id: TourGroupId; title: string; description: string }> = [
  { id: 'getting-started', title: 'Getting started', description: 'Find your way around and see your own page.' },
  { id: 'people', title: 'People', description: 'Members, visitors, and who can sign in.' },
  { id: 'attendance', title: 'Attendance', description: 'Record who came, from the desk or their own phone.' },
  { id: 'groups', title: 'Groups & campuses', description: 'Groups, ministries and campus fellowships.' },
  { id: 'camp', title: 'Camp meeting', description: 'Registrations, calls, check-in and reminders.' },
  { id: 'communication', title: 'Communication', description: 'Texts, replies and event invitations.' },
  { id: 'rlc', title: 'RLC', description: 'The mother church: visitors, members and follow-up.' },
  { id: 'pastoral', title: 'Pastoral care', description: 'Weekly leader summaries and missed-church alerts.' },
]

/** The tour offered automatically on first sign-in. */
export const FIRST_RUN_TOUR_ID = 'finding-your-way'

export const TOURS: Tour[] = [
  // ── Getting started ────────────────────────────────────────────────────────
  {
    id: FIRST_RUN_TOUR_ID,
    group: 'getting-started',
    title: 'Finding your way',
    description: 'The menu, search, light and dark mode, and installing the app.',
    route: '/dashboard',
    anyPage: true,
    steps: [
      {
        title: 'Welcome to Campus Gem',
        body: 'This short tour shows you where things are. Use the buttons or your arrow keys to move along, and press Esc to stop at any time.',
      },
      {
        element: 'sidebar',
        mobileElement: 'mobile-menu',
        side: 'right',
        title: 'Your menu',
        body: 'Every page you can open is listed here, grouped by area. Click a group name to open or close it. You only see the pages you have access to.',
        mobileBody: 'Tap Menu to see every page you can open, grouped by area. You only see the pages you have access to.',
      },
      {
        element: 'nav-me',
        only: 'desktop',
        side: 'right',
        title: 'My GEM',
        body: 'Your own page: your details, your attendance and events you are invited to.',
      },
      {
        element: 'mobile-tabs',
        only: 'mobile',
        side: 'top',
        title: 'Quick links',
        body: 'The pages you use most sit along the bottom, always one tap away.',
      },
      {
        element: 'search',
        side: 'bottom',
        title: 'Search',
        body: 'Find a person, a camper or a page by typing a few letters of their name. Shortcut: press Ctrl+K (⌘K on a Mac), or / when you are not typing in a box.',
      },
      {
        element: 'workspace-switcher',
        side: 'bottom',
        title: 'Switch area',
        body: 'Jump between the main church, RLC, camp meeting, Corporate GEM and each campus (UEW, UCC, UG…). The highlighted one is where you are now.',
        mobileBody: 'Tap here to jump between the main church, RLC, camp meeting and each campus.',
      },
      {
        element: 'theme',
        side: 'bottom',
        title: 'Light or dark',
        body: 'Choose light mode, dark mode, or let the app follow your device.',
      },
      {
        element: 'install-app',
        side: 'right',
        title: 'Install the app',
        body: 'Add Campus Gem to your home screen so it opens in one tap, like any other app. Nothing to download from a store.',
      },
      {
        element: 'help-menu',
        side: 'bottom',
        title: 'Help is always here',
        body: 'Click the question mark to take the tour for the page you are on, or to see every guided tour. You can replay any of them.',
      },
      {
        element: 'user-menu',
        side: 'bottom',
        title: 'Your account',
        body: 'See who you are signed in as, and sign out when you are done, especially on a shared computer.',
      },
    ],
  },
  {
    id: 'my-gem',
    group: 'getting-started',
    title: 'My GEM',
    description: 'Your details, check-in code, attendance streak and events.',
    route: '/me',
    steps: [
      {
        element: 'me-identity',
        side: 'bottom',
        title: 'This is you',
        body: 'Your name, role and membership ID. Click the ID to copy it. The phone number shown is the one you sign in with.',
      },
      {
        element: 'me-qr',
        side: 'left',
        title: 'Your check-in code',
        body: 'Show this QR code, or say the code under it, at the entrance to be checked in quickly.',
      },
      {
        element: 'me-stats',
        side: 'bottom',
        title: 'Your streak',
        body: 'Your streak counts the weeks in a row you came to church. Come this week to keep it going.',
      },
      {
        element: 'me-events',
        side: 'bottom',
        title: 'Events',
        body: 'Events you have been invited to. Tell the organisers if you are coming with one tap.',
      },
      {
        element: 'me-attendance',
        side: 'top',
        title: 'Last 12 weeks',
        body: 'One bar per week. The taller the bar, the more services you were checked in to that week.',
      },
      {
        element: 'me-details',
        side: 'top',
        title: 'Keep your details up to date',
        body: 'Click "Edit my details" to change your email, address, work or emergency contact. The church office sees the change straight away.',
      },
      {
        element: 'me-groups',
        side: 'left',
        title: 'Your groups and household',
        body: 'The groups you belong to and the people in your household.',
      },
    ],
  },

  // ── People ─────────────────────────────────────────────────────────────────
  {
    id: 'members',
    group: 'people',
    title: 'Members',
    description: 'Find people, filter the list and add someone new.',
    permission: 'members.view',
    route: '/members',
    steps: [
      {
        element: 'members-search',
        side: 'bottom',
        title: 'Find someone',
        body: 'Type a name or membership ID. The list updates as you type.',
      },
      {
        element: 'members-filters',
        side: 'bottom',
        title: 'Filters',
        body: 'Narrow the list by role, status or the year someone joined, and change the sort order. "Clear" puts everything back.',
      },
      {
        element: 'members-add',
        side: 'bottom',
        title: 'Add a member',
        body: 'Register someone new and give them a membership ID.',
        permission: 'members.manage',
      },
      {
        element: 'members-list',
        side: 'top',
        title: 'The member list',
        body: 'Click anyone to open their profile. The phone and WhatsApp buttons let you call or message them straight away.',
      },
      {
        title: 'Profiles and households',
        body: 'A profile has their contact details, groups, attendance history and household. Open any profile and choose "Take the tour for this page" from the help menu to see it.',
      },
    ],
  },
  {
    id: 'member-profile',
    group: 'people',
    title: 'A member’s profile',
    description: 'Contact details, attendance and linking a household.',
    permission: 'members.view',
    route: '/members/[id]',
    excludeRoutes: ['/members/add'],
    startRoute: '/members',
    startHint: 'Open anyone in the list, then click the question mark at the top and choose "Take the tour for this page".',
    steps: [
      {
        element: 'member-header',
        side: 'bottom',
        title: 'Who they are',
        body: 'Name, role, status and membership ID (click it to copy). Call or WhatsApp them with the buttons underneath.',
      },
      {
        element: 'member-edit',
        side: 'left',
        title: 'Edit the profile',
        body: 'Update their details. Remember to save when you are done.',
        permission: 'members.manage',
      },
      {
        element: 'member-attendance',
        side: 'right',
        title: 'Attendance at a glance',
        body: 'How many services they have attended, their weekly average and the last 30 days. The full list is further down the page.',
      },
      {
        element: 'member-household',
        side: 'right',
        title: 'Household',
        body: 'Link family members who live together. When you text "one per household", only the main contact receives it.',
      },
    ],
  },
  {
    id: 'visitors',
    group: 'people',
    title: 'Visitors & follow-up',
    description: 'Register guests and walk them from first visit to membership.',
    permission: 'rlc.view',
    route: '/admin/rlc/visitors',
    steps: [
      {
        element: 'page-actions',
        side: 'bottom',
        title: 'Register a visitor',
        body: 'Add a guest yourself, print welcome slips, or show the QR code so guests can register on their own phone.',
      },
      {
        element: 'visitors-share',
        side: 'bottom',
        title: 'Let guests sign themselves in',
        body: 'Share this link or QR code. Guests fill in their own details and appear in this list.',
      },
      {
        element: 'visitors-filters',
        side: 'bottom',
        title: 'Search and filter',
        body: 'Search by name, phone or check-in code, and filter by stage: first visit, follow-up, new member or full member.',
      },
      {
        element: 'visitors-list',
        side: 'top',
        title: 'Every visitor',
        body: 'Open a visitor to see their visits, notes and who is following up with them. When they are ready, import them as members.',
      },
      {
        element: 'nav-admin-rlc-follow-up',
        side: 'right',
        fallback: 'center',
        title: 'Follow-up',
        body: 'The follow-up page lists visitors waiting for a call or visit. Assign them to someone and record how it went, so nobody falls through the cracks.',
      },
    ],
  },
  {
    id: 'access',
    group: 'people',
    title: 'Access & roles',
    description: 'Give someone a role, extra permissions, and their sign-in text.',
    permission: 'admins.manage',
    route: '/admin/admins',
    steps: [
      {
        element: 'admins-grant',
        side: 'bottom',
        title: 'Give someone access',
        body: 'Pick an existing person and choose their role. Use "New person" if they are not in the system yet.',
      },
      {
        element: 'admins-roles',
        side: 'bottom',
        title: 'Roles',
        body: 'A role is a ready-made set of permissions: Administrator, Pastor, Elder, Finance Officer, Campus leader or Member. Click a role to see who has it.',
      },
      {
        element: 'admins-list',
        side: 'top',
        title: 'Everyone with access',
        body: 'Search by name, phone or membership ID. Changes apply on the person’s next page load, so they never need to sign out.',
      },
      {
        element: 'admins-edit',
        side: 'left',
        title: 'Extra permissions and sign-in text',
        body: 'Edit access to change someone’s role or tick extra permissions when they need a little more than their role gives. Leave "Text them" ticked and they get the app link and how to sign in.',
      },
      {
        element: 'admins-history',
        side: 'top',
        title: 'History',
        body: 'Every change is recorded here: who changed what, and when.',
      },
    ],
  },

  // ── Attendance ─────────────────────────────────────────────────────────────
  {
    id: 'attendance',
    group: 'attendance',
    title: 'Recording attendance',
    description: 'Check people in and look back at past services.',
    permission: 'attendance.view',
    route: '/attendance',
    steps: [
      {
        element: 'attendance-check-in',
        side: 'bottom',
        title: 'Check someone in',
        body: 'Opens manual check-in: find people by name, ID or phone and tick them off for today’s service.',
      },
      {
        element: 'attendance-stats',
        side: 'bottom',
        title: 'The numbers',
        body: 'How many people were checked in today, this week, this month and in total.',
      },
      {
        element: 'attendance-tabs',
        side: 'bottom',
        title: 'Records, tools and analytics',
        body: '"Check-in tools" has the QR scanner, kiosk, bulk entry and self check-in. "Analytics" shows trends over time.',
      },
      {
        element: 'attendance-filters',
        side: 'bottom',
        title: 'Find a record',
        body: 'Search for a person, and choose the service and date range you want to see.',
      },
      {
        element: 'attendance-list',
        side: 'top',
        title: 'Who came',
        body: 'Everyone checked in for the service and dates you picked. Use Export at the top to download the list.',
      },
    ],
  },
  {
    id: 'kiosk',
    group: 'attendance',
    title: 'The kiosk',
    description: 'A self-service check-in screen for the church entrance.',
    permission: 'attendance.view',
    route: '/attendance/kiosk',
    steps: [
      {
        title: 'Kiosk mode',
        body: 'Set up a tablet or laptop at the entrance and leave this page open. Members check themselves in; nobody needs to sign in for each person.',
      },
      {
        element: 'kiosk-service',
        side: 'bottom',
        title: 'Pick the service first',
        body: 'Choose which service people are checking in to before the doors open.',
      },
      {
        element: 'kiosk-form',
        side: 'right',
        title: 'Find yourself',
        body: 'Members type their membership ID, phone number or name, add any family with them, and tap check in.',
      },
      {
        element: 'kiosk-result',
        side: 'left',
        title: 'Confirmation',
        body: 'The member sees their name and a green confirmation. Tap "Check in another member" for the next person.',
      },
    ],
  },
  {
    id: 'self-check-in',
    group: 'attendance',
    title: 'QR self check-in',
    description: 'Members scan a code with their own phone and tap “I’m here”.',
    permission: 'attendance.manage',
    route: '/attendance/self-check-in',
    steps: [
      {
        element: 'sci-start',
        side: 'bottom',
        title: 'Start a session',
        body: 'Choose the service, date and congregation, and how long it should stay open. Then click "Start self check-in".',
      },
      {
        element: 'sci-open',
        side: 'left',
        title: 'Open sessions',
        body: 'Sessions that are still open. Click one to show its QR code again.',
      },
      {
        title: 'Show the QR code',
        body: 'Present the code on a screen, print it as a poster, or copy the link into a group chat. Members scan it, sign in if needed, and tap "I’m here". Close the session when the service ends.',
      },
    ],
  },

  // ── Groups & campuses ──────────────────────────────────────────────────────
  {
    id: 'groups',
    group: 'groups',
    title: 'Groups',
    description: 'Browse ministries and fellowships, export them, or create one.',
    permission: 'groups.view',
    route: '/groups',
    steps: [
      {
        element: 'groups-filters',
        side: 'bottom',
        title: 'Find a group',
        body: 'Search by name or pick a type: ministry, fellowship, age group and more.',
      },
      {
        element: 'groups-list',
        side: 'top',
        title: 'All groups',
        body: 'Each card shows the leader and how many members. Click a card to open the group.',
      },
      {
        element: 'groups-export',
        side: 'bottom',
        title: 'Export',
        body: 'Download these groups as a spreadsheet file.',
      },
      {
        element: 'groups-add',
        side: 'bottom',
        title: 'Create a group',
        body: 'Start a new ministry or fellowship and choose its leaders.',
        permission: 'groups.manage',
      },
    ],
  },
  {
    id: 'group-page',
    group: 'groups',
    title: 'A group’s page: members, SMS and export',
    description: 'Add members, text the whole group, and export the list.',
    permission: 'groups.view',
    route: '/groups/[id]',
    excludeRoutes: ['/groups/add'],
    startRoute: '/groups',
    startHint: 'Open any group, then click the question mark at the top and choose "Take the tour for this page".',
    steps: [
      {
        element: 'group-tabs',
        side: 'bottom',
        title: 'Members, message, settings',
        body: 'Switch between the member list, texting the group, and the group’s settings.',
      },
      {
        element: 'group-message-tab',
        side: 'bottom',
        title: 'Text the whole group',
        body: 'Write one message and send it to every member with a phone number. You see a preview and confirm before anything is sent.',
        permission: 'sms.send',
      },
      {
        element: 'group-add-member',
        side: 'bottom',
        title: 'Add members',
        body: 'Search for people and add them to this group.',
        permission: 'groups.manage',
      },
      {
        element: 'group-export',
        side: 'bottom',
        title: 'Export the members',
        body: 'Download the member list with phone numbers as a spreadsheet file.',
      },
    ],
  },
  {
    id: 'campuses',
    group: 'groups',
    title: 'Campuses',
    description: 'Campus fellowships, their onboarding, and the join link.',
    permission: ['groups.manage', 'campus.lead'],
    route: '/campuses',
    steps: [
      {
        element: 'campus-list',
        fallback: 'center',
        side: 'top',
        title: 'Your campuses',
        body: 'Every campus fellowship you lead or manage (UEW, UCC, UG…), with its members, leaders and executives. Campus members still appear in the main members list too, with a campus badge.',
      },
      {
        title: 'A campus page',
        body: 'Open a campus to see its members, leaders and executives, its forms and their responses, and to text the whole campus.',
      },
      {
        title: 'Onboarding',
        body: 'The Onboarding tab finds people already in the app who probably belong here (for example their school says “Winneba”), so you can add them in one go. You can also paste a list of phone numbers and check the preview before adding.',
      },
      {
        title: 'The join link',
        body: 'Each campus has its own join link and QR code. Share it at fresher events or in group chats; people who sign up land straight in that campus.',
      },
    ],
  },

  {
    id: 'campus-outreach',
    group: 'groups',
    title: 'Campus outreach',
    description: 'Record the students you meet on Sunday, then follow them up.',
    route: '/outreach',
    steps: [
      {
        title: 'Sunday outreach',
        body: 'Everyone on a campus records the students they meet here, and follows up the ones given to them.',
      },
      {
        element: 'outreach-qr',
        side: 'bottom',
        title: 'Show your QR code',
        body: 'Hold your phone out: the student scans it and fills in their own details. They are recorded as met by you.',
      },
      {
        element: 'outreach-add',
        side: 'bottom',
        title: 'Or fill it in yourself',
        body: 'No data on their phone? Type their details on yours. “Save and add another” keeps the form open for the next person.',
      },
      {
        element: 'outreach-list',
        side: 'top',
        fallback: 'center',
        title: 'Follow up',
        body: 'My follow-ups are the people given to you, oldest first. Tap a name to call or WhatsApp them, then tap how it went. Campus leaders also see everyone and can assign or share people out evenly.',
      },
    ],
  },

  // ── Camp meeting ───────────────────────────────────────────────────────────
  {
    id: 'camp-overview',
    group: 'camp',
    title: 'Camp overview & reminders',
    description: 'The camp dashboard, registration link and automatic reminders.',
    permission: 'camp.manage',
    route: '/admin/camp-meeting',
    steps: [
      {
        element: 'camp-totals',
        side: 'bottom',
        title: 'Camp at a glance',
        body: 'How many have registered, confirmed they are coming, checked in, and have a bed. Click a number to see the people behind it.',
      },
      {
        element: 'camp-link',
        side: 'left',
        title: 'Registration link',
        body: 'Copy this link and share it anywhere people can sign up for camp.',
      },
      {
        element: 'camp-reminders',
        side: 'left',
        title: 'Automatic reminders',
        body: 'When this is on, every registrant gets a reminder text 7 days and 1 day before camp. Nobody gets the same reminder twice.',
      },
      {
        element: 'camp-tools',
        side: 'top',
        title: 'Camp tools',
        body: 'Shortcuts to rooms, payments, follow-up, analytics and the rest of the camp pages.',
      },
      {
        element: 'camp-checkin',
        side: 'bottom',
        title: 'Check-in',
        body: 'Opens the check-in hub for the camp days.',
      },
    ],
  },
  {
    id: 'camp-registrations',
    group: 'camp',
    title: 'Camp registrations',
    description: 'Search, filter, export and print registrants.',
    permission: 'camp.manage',
    route: '/admin/camp-meeting/registrations',
    steps: [
      {
        element: 'camp-reg-stats',
        side: 'bottom',
        title: 'The numbers',
        body: 'Registrations, check-ins and payments for the active camp year.',
      },
      {
        element: 'camp-reg-filters',
        side: 'bottom',
        title: 'Search and filter',
        body: 'Search by name, phone or QR code, and filter by role, status or payment.',
      },
      {
        element: 'camp-reg-table',
        mobileElement: 'camp-reg-list',
        side: 'top',
        title: 'Registrants',
        body: 'Tick people to text or update them together, or click a name to see and edit their registration.',
      },
      {
        element: 'camp-reg-export',
        side: 'bottom',
        title: 'Export and print',
        body: 'Download the list as a spreadsheet, or print QR slips for check-in.',
      },
    ],
  },
  {
    id: 'camp-calls',
    group: 'camp',
    title: 'Confirmation calls',
    description: 'Call registrants and record whether they are coming.',
    permission: 'camp.calls',
    route: '/admin/camp-meeting/calls',
    steps: [
      {
        element: 'calls-progress',
        side: 'bottom',
        fallback: 'center',
        title: 'Progress',
        body: 'How many registrants have been reached, and what they said.',
      },
      {
        element: 'calls-views',
        side: 'bottom',
        title: 'Your list',
        body: 'The people assigned to you to call. Camp managers can switch between everyone and their own calls.',
      },
      {
        element: 'calls-filters',
        side: 'bottom',
        title: 'Search and filter',
        body: 'Find someone by name, phone or where they live, or show only one outcome.',
      },
      {
        element: 'calls-list',
        side: 'top',
        title: 'Call and record',
        body: 'Tap the phone button to call. Then tap what they said: coming, not sure, not coming or no answer. The camp team sees it straight away.',
      },
      {
        title: 'Sharing out the calls',
        body: 'Tick registrants in the "Everyone" view and choose "Assign caller". "Text call lists" sends each caller their list by SMS.',
        permission: 'camp.manage',
      },
    ],
  },
  {
    id: 'camp-scan',
    group: 'camp',
    title: 'Camp check-in (works offline)',
    description: 'Check people in by name, code or QR, even without signal.',
    permission: 'camp.manage',
    route: '/admin/camp-meeting/scan',
    steps: [
      {
        element: 'scan-session',
        side: 'bottom',
        title: 'Pick the day and session',
        body: 'Choose the camp day and the session (morning, afternoon or evening) you are checking people in to.',
      },
      {
        element: 'scan-stats',
        side: 'bottom',
        title: 'Who is here',
        body: 'How many are at camp, how many are present for this session, and how many are still missing.',
      },
      {
        element: 'scan-manual',
        side: 'top',
        title: 'Check in by name',
        body: 'Search for someone and tap to mark them present.',
      },
      {
        element: 'scan-more',
        side: 'top',
        title: 'More tools',
        body: 'Check in by camp code, scan a QR code with the camera, or record arrivals.',
      },
      {
        title: 'No signal? Keep going',
        body: 'If the internet drops, keep checking people in. Each one is saved on this phone and sent automatically when you are back online. A "to sync" badge shows how many are waiting.',
      },
    ],
  },

  // ── Communication ──────────────────────────────────────────────────────────
  {
    id: 'comms',
    group: 'communication',
    title: 'Sending SMS',
    description: 'Write one message and send it to the people you choose.',
    permission: 'sms.send',
    route: '/admin/communications',
    steps: [
      {
        element: 'comms-stats',
        side: 'bottom',
        title: 'Messages so far',
        body: 'How many messages were sent, delivered or failed.',
      },
      {
        element: 'comms-audience',
        side: 'bottom',
        title: 'Who gets it',
        body: 'Choose the area (Campus Gem, RLC or Camp), SMS or email, and the audience: one person, a group, or everyone matching a filter.',
      },
      {
        element: 'comms-message',
        side: 'top',
        title: 'Write the message',
        body: 'Type {{name}} and each person sees their own first name.',
      },
      {
        element: 'comms-send',
        side: 'top',
        title: 'Review, then send',
        body: 'You get to review who it will reach before anything goes out. Nothing is sent until you confirm.',
      },
      {
        element: 'comms-tabs',
        side: 'bottom',
        title: 'History',
        body: 'Every message sent from here, with its delivery status. Failed ones can be resent.',
      },
    ],
  },
  {
    id: 'inbox',
    group: 'communication',
    title: 'Inbox',
    description: 'Read and answer the texts people send back.',
    permission: 'sms.send',
    route: '/admin/inbox',
    steps: [
      {
        element: 'inbox-threads',
        side: 'right',
        title: 'Replies',
        body: 'When someone texts back, their conversation appears here. Bold means unread.',
      },
      {
        element: 'inbox-views',
        side: 'bottom',
        title: 'Inbox and archived',
        body: 'Archive a conversation once it is dealt with. It comes back if they text again.',
      },
      {
        element: 'inbox-conversation',
        side: 'left',
        title: 'Answer them',
        body: 'Open a conversation to read it and type a reply. Camp registrants who answer YES or NO are tagged so you can update their registration.',
      },
      {
        title: 'Opting out',
        body: 'If someone texts STOP, they are taken off bulk texts automatically.',
      },
    ],
  },
  {
    id: 'events',
    group: 'communication',
    title: 'Events & RSVP',
    description: 'Invite people by SMS and see who is coming.',
    permission: 'groups.manage',
    route: '/admin/events',
    steps: [
      {
        element: 'page-actions',
        side: 'bottom',
        title: 'Create an event',
        body: 'Give it a name, date, place and, if you like, a limit on places.',
      },
      {
        element: 'events-list',
        side: 'top',
        fallback: 'center',
        title: 'Your events',
        body: 'Each event shows how many are coming, maybe, and have not replied yet. Click one to send invitations.',
      },
      {
        title: 'Tap to RSVP',
        body: 'Each person gets a text with their own link. They tap Yes, Maybe or No; no sign-in needed. Their answers appear here, and on their My GEM page.',
      },
    ],
  },

  // ── RLC ────────────────────────────────────────────────────────────────────
  {
    id: 'rlc',
    group: 'rlc',
    title: 'The RLC area',
    description: 'The mother church hub: visitors, follow-up, members and attendance.',
    permission: 'rlc.view',
    route: '/admin/rlc',
    steps: [
      {
        element: 'page-actions',
        side: 'bottom',
        title: 'Most-used actions',
        body: 'Register a visitor or open attendance for the mother church.',
      },
      {
        element: 'rlc-stats',
        side: 'bottom',
        title: 'At a glance',
        body: 'Active visitors, follow-ups waiting, members, and how many visitors became members. Click a number to open the list.',
      },
      {
        element: 'rlc-queues',
        side: 'bottom',
        title: 'What needs doing',
        body: 'Follow-ups that are overdue or due soon, the ones assigned to you, and visitors ready to become members.',
      },
      {
        element: 'rlc-pipeline',
        side: 'top',
        title: 'From first visit to membership',
        body: 'How many people are at each stage of the visitor journey.',
      },
      {
        element: 'rlc-shortcuts',
        side: 'top',
        title: 'Everything else',
        body: 'Visitors, follow-up, members, ministry roster, attendance, birthdays, welcome slips, analytics and import.',
      },
    ],
  },

  // ── Pastoral care ──────────────────────────────────────────────────────────
  {
    id: 'pastoral-care',
    group: 'pastoral',
    title: 'Pastoral care',
    description: 'Weekly texts to group leaders, and people who have stopped coming.',
    permission: 'members.manage',
    route: '/admin/pastoral-care',
    steps: [
      {
        title: 'Caring for the flock',
        body: 'Every Monday morning each group leader gets one text: how their group did on Sunday, birthdays this week, and anyone who has stopped coming.',
      },
      {
        element: 'pastoral-stats',
        side: 'bottom',
        title: 'This week',
        body: 'How many people have stopped coming, and how many texts would go out.',
      },
      {
        element: 'pastoral-settings',
        side: 'right',
        title: 'Settings',
        body: 'Turn the alerts and weekly summary on or off, choose after how many missed Sundays someone counts as missing, and pick who hears about people in no group.',
      },
      {
        element: 'pastoral-preview',
        side: 'left',
        title: 'Preview',
        body: 'Exactly what each leader would receive right now. Nothing is sent from here.',
      },
      {
        element: 'pastoral-lapsed',
        side: 'top',
        title: 'Stopped coming',
        body: 'Regulars who have missed several Sundays in a row. A call or visit goes a long way.',
      },
    ],
  },
]

export function getTour(id: string): Tour | undefined {
  return TOURS.find((tour) => tour.id === id)
}
