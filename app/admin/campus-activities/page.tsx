import { redirect } from 'next/navigation'

/** The old campus & activities board. Campuses now have their own pages. */
export default function CampusActivitiesPage() {
  redirect('/campuses')
}
