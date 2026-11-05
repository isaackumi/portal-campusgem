/**
 * Guided-tour anchors. Elements carry `data-tour="<id>"`; tour steps name the id
 * (lib/tour/tours.ts). Sidebar ids are derived so a renamed link keeps its anchor.
 */

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** `nav-section-main`, `nav-section-camp-meeting`, … */
export function navSectionTourId(title: string): string {
  return `nav-section-${slug(title)}`
}

/** `nav-members`, `nav-admin-camp-meeting-calls`, `nav-admin-forms-module-rlc`, … */
export function navItemTourId(href: string): string {
  return `nav-${slug(href) || 'home'}`
}

/** CSS selector for a tour anchor id. */
export function tourSelector(id: string): string {
  return `[data-tour="${id.replace(/["\\]/g, '\\$&')}"]`
}
