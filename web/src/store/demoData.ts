/**
 * Embedded demo data for all 33 Adama City departments.
 * Powers the dashboard without needing the backend API.
 */

// ============================================================
// DEPARTMENTS
// ============================================================
export interface DemoDepartment {
  id: number
  name: string
  nameEn: string
  icon: string
  color: string
}

export const DEPARTMENTS: DemoDepartment[] = [
  { id: 1,  name: 'Galmeessa Siivilii',                        nameEn: 'Civil Registration',               icon: '📋', color: '#3B82F6' },
  { id: 2,  name: 'Waajjira Invastimantii',                    nameEn: 'Investment Office',                 icon: '💰', color: '#10B981' },
  { id: 3,  name: 'Bulchiinsaa fi Nageenya',                   nameEn: 'Administration & Security',         icon: '🛡️', color: '#6366F1' },
  { id: 4,  name: 'Waajjira Hojjataa fi Hawaasummaa',          nameEn: 'Labor & Social Affairs',            icon: '🤝', color: '#F59E0B' },
  { id: 5,  name: 'Waajjira Aadaa fi Turiizimii',              nameEn: 'Culture & Tourism',                 icon: '🎭', color: '#EC4899' },
  { id: 6,  name: 'Waajjira Milishaa',                         nameEn: 'Militia Office',                    icon: '⚔️', color: '#EF4444' },
  { id: 7,  name: 'Waajjira Dargaggoo fi Ispoortii',           nameEn: 'Youth & Sports',                   icon: '⚽', color: '#14B8A6' },
  { id: 8,  name: 'Waajjira Karoora/Pilaanii fi Misoomaa',     nameEn: 'Planning & Development',            icon: '📐', color: '#8B5CF6' },
  { id: 9,  name: 'Qajeelcha Poolisii',                        nameEn: 'Police Commission',                 icon: '🚔', color: '#1D4ED8' },
  { id: 10, name: 'Buusaa Gonofaa',                            nameEn: 'Buusaa Gonofaa (Social Fund)',      icon: '🏦', color: '#059669' },
  { id: 11, name: 'Abbaa Taayitaa Eegumsa Naannoo',            nameEn: 'Environmental Protection',          icon: '🌿', color: '#16A34A' },
  { id: 12, name: 'Abbaa Taayitaa Konistiraakshinii',           nameEn: 'Construction Authority',            icon: '🏗️', color: '#D97706' },
  { id: 13, name: 'Koomishinii Turizimii',                     nameEn: 'Tourism Commission',                icon: '✈️', color: '#0EA5E9' },
  { id: 14, name: 'Waajjira Lafaa',                            nameEn: 'Land Administration',               icon: '🗺️', color: '#854D0E' },
  { id: 15, name: 'Waajjira Fayyaa',                           nameEn: 'Health Office',                     icon: '🏥', color: '#DC2626' },
  { id: 16, name: 'Waajjira Abbaa Alangaa',                    nameEn: 'Attorney General',                  icon: '⚖️', color: '#7C3AED' },
  { id: 17, name: 'Waajjira Saayinsii fi Teeknoloojii',        nameEn: 'Science & Technology',              icon: '🔬', color: '#2563EB' },
  { id: 18, name: "Waajjira Bishaan Dhugaatii fi Dhangala'aa", nameEn: 'Water & Sewerage',                  icon: '💧', color: '#0284C7' },
  { id: 19, name: 'Giddu-gala Tajaajilaa',                     nameEn: 'Service Center',                    icon: '🏛️', color: '#4F46E5' },
  { id: 20, name: 'Waldaa Hojii Gamtaa',                       nameEn: 'Cooperative Office',                icon: '🤲', color: '#0D9488' },
  { id: 21, name: 'Waajjira Albuuda',                          nameEn: 'Minerals Office',                   icon: '⛏️', color: '#92400E' },
  { id: 22, name: "Waajjira Dhimma Dubartootaa fi Daa'immanii",nameEn: "Women & Children's Affairs",        icon: '👩‍👧', color: '#DB2777' },
  { id: 23, name: 'Mana Qopheessaa',                           nameEn: 'Procurement Office',                icon: '📦', color: '#7C3AED' },
  { id: 24, name: 'Waajjira Galii',                            nameEn: 'Revenue Office',                    icon: '💵', color: '#047857' },
  { id: 25, name: 'Ejansii Geejjibaa',                         nameEn: 'Transport Agency',                  icon: '🚌', color: '#EA580C' },
  { id: 26, name: 'Waajjira Kantiibaa',                        nameEn: "Mayor's Office",                    icon: '🏛️', color: '#1E40AF' },
  { id: 27, name: 'Waajjira PSMQN',                            nameEn: 'PSMQN Office',                      icon: '📊', color: '#6D28D9' },
  { id: 28, name: 'Waajjira Kominikeeshinii',                  nameEn: 'Communication Office',              icon: '📡', color: '#0891B2' },
  { id: 29, name: 'Waajjira Daldala',                          nameEn: 'Trade Office',                      icon: '🛒', color: '#B45309' },
  { id: 30, name: 'Waajjira Qonnaa',                           nameEn: 'Agriculture Office',                icon: '🌾', color: '#65A30D' },
  { id: 31, name: 'Waajjira Maallaqaa',                        nameEn: 'Finance Office',                    icon: '🏧', color: '#0F766E' },
  { id: 32, name: 'Waajjira Carraa Hojii Uumuu fi Ogummaa',    nameEn: 'Job Creation & Skills',             icon: '💼', color: '#7E22CE' },
  { id: 33, name: 'Waajjira Barnoota',                         nameEn: 'Education Office',                  icon: '🎓', color: '#2563EB' },
]

// ============================================================
// REPORT CATEGORIES
// ============================================================
export interface DemoCategory {
  id: number
  nameOm: string
  nameAm: string
  nameEn: string
}

export const CATEGORIES: DemoCategory[] = [
  { id: 1, nameOm: "Rakkoo Bu'uuraa",              nameAm: 'የመሠረት ልማት ችግር', nameEn: 'Infrastructure Issue' },
  { id: 2, nameOm: "Bishaan fi Dhangala'aa",        nameAm: 'ውሃ እና ፍሳሽ',       nameEn: 'Water & Sanitation' },
  { id: 3, nameOm: 'Nageenya Hawaasaa',             nameAm: 'የሕዝብ ደህንነት',     nameEn: 'Public Safety' },
  { id: 4, nameOm: 'Naannoo fi Qulqullinaa',        nameAm: 'አካባቢ እና ንጽህና',   nameEn: 'Environment & Cleanliness' },
  { id: 5, nameOm: 'Geejjibaa fi Tiraafikaa',       nameAm: 'ትራንስፖርት እና ትራፊክ', nameEn: 'Transport & Traffic' },
  { id: 6, nameOm: 'Tajaajila Hawaasummaa',         nameAm: 'ማህበራዊ አገልግሎት',   nameEn: 'Social Services' },
]

// ============================================================
// DEMO REPORTS
// ============================================================
export type ReportStatus =
  | 'SUBMITTED' | 'RECEIVED' | 'ASSIGNED' | 'UNDER_INVESTIGATION'
  | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED' | 'REJECTED'

export type ReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface DemoReport {
  id: number
  caseNumber: string
  description: string
  status: ReportStatus
  priority: ReportPriority
  departmentId: number
  categoryId: number
  latitude: number
  longitude: number
  createdAt: string
  citizenName: string
  isAnonymous: boolean
}

// Seeded random number generator for consistent demo data
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

const rand = seededRandom(42)

const DESCRIPTIONS = [
  'Broken water pipe flooding the street near the main market area.',
  'Large pothole on the road causing traffic accidents. Multiple vehicles damaged.',
  'Illegal waste dumping behind residential buildings. Health hazard.',
  'Street light not working for over a week. Area is very dark and unsafe.',
  'Sewage overflow near the school. Children at risk of waterborne diseases.',
  'Damaged road sign at the intersection. Causing confusion for drivers.',
  'Noise pollution from construction site during late hours.',
  'Stray animals blocking the main road. Traffic disruption daily.',
  'Broken sidewalk tiles creating tripping hazard for pedestrians.',
  'Water supply cut off for three days in our neighborhood.',
  'Traffic signal malfunction at the busy junction.',
  'Garbage not collected for two weeks. Overflowing bins attracting pests.',
  'Building under construction without proper safety barriers.',
  'Flooding on main road after rain. No drainage system working.',
  'Public toilet facility in very poor condition. Needs maintenance.',
  'Tree branches falling on power lines. Risk of electrical fire.',
  'Unauthorized parking blocking emergency vehicle access.',
  'Road marking faded and invisible. Accidents increasing.',
  'Public park benches vandalized. Community space unusable.',
  'Bus stop shelter damaged by storm. Passengers exposed to weather.',
  'Open manhole cover on pedestrian walkway. Very dangerous.',
  'Cracked wall on government building. Structural safety concern.',
  'Dusty unpaved road causing respiratory issues for residents.',
  'Broken playground equipment in children\'s park. Safety hazard.',
  'Market area fire hydrant not functioning. Major safety risk.',
  'Overloaded electric transformer sparking. Fire risk for entire block.',
  'Blocked drainage channel causing water logging in residential area.',
  'Abandoned vehicle left on main road for months. Blocking traffic flow.',
  'Public water fountain not working. Community members have no clean water access.',
  'Illegal construction encroaching on public sidewalk.',
]

const CITIZEN_NAMES = [
  'Abebe Kebede', 'Fatima Ahmed', 'Chaltu Gudeta', 'Mohammed Hassan',
  'Tigist Alemu', 'Dawit Tesfaye', 'Hawa Abdulahi', 'Gemechu Bekele',
  'Almaz Tadesse', 'Yohannes Girma', 'Rahel Worku', 'Ibrahim Suleiman',
  'Desta Mulugeta', 'Aisha Mohammed', 'Biruk Haile', 'Anonymous Citizen',
]

const STATUSES: ReportStatus[] = [
  'SUBMITTED', 'RECEIVED', 'ASSIGNED', 'UNDER_INVESTIGATION',
  'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'REJECTED',
]

const PRIORITIES: ReportPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

// Generate 150 demo reports distributed across all 33 departments
function generateDemoReports(): DemoReport[] {
  const reports: DemoReport[] = []
  const ADAMA_LAT = 8.54
  const ADAMA_LNG = 39.27

  for (let i = 0; i < 150; i++) {
    const deptId = (i % 33) + 1  // distribute evenly, then extras
    const catId = Math.floor(rand() * 6) + 1
    const statusIdx = Math.floor(rand() * 9)
    const priorityIdx = rand() < 0.1 ? 3 : rand() < 0.35 ? 2 : rand() < 0.8 ? 1 : 0

    const daysAgo = Math.floor(rand() * 60)
    const hoursAgo = Math.floor(rand() * 24)
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    date.setHours(date.getHours() - hoursAgo)

    const isAnon = rand() < 0.15
    const citizen = isAnon
      ? 'Anonymous Citizen'
      : CITIZEN_NAMES[Math.floor(rand() * (CITIZEN_NAMES.length - 1))]

    reports.push({
      id: i + 1,
      caseNumber: `AD-${String(100000 + i).slice(1)}`,
      description: DESCRIPTIONS[Math.floor(rand() * DESCRIPTIONS.length)],
      status: STATUSES[statusIdx],
      priority: PRIORITIES[priorityIdx],
      departmentId: deptId,
      categoryId: catId,
      latitude: ADAMA_LAT + (rand() - 0.5) * 0.05,
      longitude: ADAMA_LNG + (rand() - 0.5) * 0.05,
      createdAt: date.toISOString(),
      citizenName: citizen,
      isAnonymous: isAnon,
    })
  }

  return reports
}

export const DEMO_REPORTS: DemoReport[] = generateDemoReports()

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/** Get reports for a specific department */
export function getReportsForDepartment(departmentId: number): DemoReport[] {
  return DEMO_REPORTS.filter(r => r.departmentId === departmentId)
}

/** Get stats summary for a department */
export function getDepartmentStats(departmentId: number) {
  const reports = getReportsForDepartment(departmentId)
  const total = reports.length
  const submitted = reports.filter(r => r.status === 'SUBMITTED').length
  const received = reports.filter(r => r.status === 'RECEIVED').length
  const assigned = reports.filter(r => r.status === 'ASSIGNED').length
  const underInvestigation = reports.filter(r => r.status === 'UNDER_INVESTIGATION').length
  const inProgress = reports.filter(r => r.status === 'IN_PROGRESS').length
  const resolved = reports.filter(r => r.status === 'RESOLVED').length
  const closed = reports.filter(r => r.status === 'CLOSED').length
  const reopened = reports.filter(r => r.status === 'REOPENED').length
  const rejected = reports.filter(r => r.status === 'REJECTED').length
  const critical = reports.filter(r => r.priority === 'CRITICAL').length
  const high = reports.filter(r => r.priority === 'HIGH').length
  const pending = submitted + received + assigned + underInvestigation + inProgress + reopened
  const resolutionRate = total > 0 ? Math.round(((resolved + closed) / total) * 100) : 0

  return {
    total,
    submitted,
    received,
    assigned,
    underInvestigation,
    inProgress,
    resolved,
    closed,
    reopened,
    rejected,
    critical,
    high,
    pending,
    resolutionRate,
  }
}

/** Get all-departments overview stats (city admin view) */
export function getCityWideStats() {
  const total = DEMO_REPORTS.length
  const resolved = DEMO_REPORTS.filter(r => r.status === 'RESOLVED').length
  const closed = DEMO_REPORTS.filter(r => r.status === 'CLOSED').length
  const critical = DEMO_REPORTS.filter(r => r.priority === 'CRITICAL').length
  const pending = DEMO_REPORTS.filter(r =>
    !['RESOLVED', 'CLOSED', 'REJECTED'].includes(r.status)
  ).length

  return { total, resolved, closed, critical, pending }
}

/** Get status distribution for chart */
export function getStatusDistribution(departmentId?: number) {
  const reports = departmentId
    ? getReportsForDepartment(departmentId)
    : DEMO_REPORTS

  const statusCounts: Record<string, number> = {}
  for (const s of STATUSES) {
    statusCounts[s] = reports.filter(r => r.status === s).length
  }
  return statusCounts
}

/** Get priority distribution for chart */
export function getPriorityDistribution(departmentId?: number) {
  const reports = departmentId
    ? getReportsForDepartment(departmentId)
    : DEMO_REPORTS

  return {
    LOW: reports.filter(r => r.priority === 'LOW').length,
    MEDIUM: reports.filter(r => r.priority === 'MEDIUM').length,
    HIGH: reports.filter(r => r.priority === 'HIGH').length,
    CRITICAL: reports.filter(r => r.priority === 'CRITICAL').length,
  }
}

/** Get reports created per week (last 8 weeks) for trend chart */
export function getWeeklyTrend(departmentId?: number) {
  const reports = departmentId
    ? getReportsForDepartment(departmentId)
    : DEMO_REPORTS

  const now = new Date()
  const weeks: { label: string; count: number }[] = []

  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - (w + 1) * 7)
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() - w * 7)

    const count = reports.filter(r => {
      const d = new Date(r.createdAt)
      return d >= weekStart && d < weekEnd
    }).length

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const label = `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}`
    weeks.push({ label, count })
  }

  return weeks
}

/** Get category distribution */
export function getCategoryDistribution(departmentId?: number) {
  const reports = departmentId
    ? getReportsForDepartment(departmentId)
    : DEMO_REPORTS

  return CATEGORIES.map(cat => ({
    name: cat.nameEn,
    count: reports.filter(r => r.categoryId === cat.id).length,
  }))
}

/** Status display helpers */
export const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#6366F1',
  RECEIVED: '#8B5CF6',
  ASSIGNED: '#3B82F6',
  UNDER_INVESTIGATION: '#F59E0B',
  IN_PROGRESS: '#F97316',
  RESOLVED: '#10B981',
  CLOSED: '#6B7280',
  REOPENED: '#EF4444',
  REJECTED: '#DC2626',
}

export const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  RECEIVED: 'Received',
  ASSIGNED: 'Assigned',
  UNDER_INVESTIGATION: 'Under Investigation',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  REJECTED: 'Rejected',
}

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#6B7280',
  MEDIUM: '#3B82F6',
  HIGH: '#F59E0B',
  CRITICAL: '#EF4444',
}
