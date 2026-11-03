import { create } from 'zustand'

export type Language = 'en' | 'om' | 'am'

export interface TranslationDictionary {
  [key: string]: {
    en: string
    om: string
    am: string
  }
}

export const translations: TranslationDictionary = {
  // Navigation & Common
  dashboard: { en: 'Dashboard', om: 'Daashboordii', am: 'ዳሽቦርድ' },
  reports: { en: 'Reports', om: 'Gabaasota', am: 'ሪፖርቶች' },
  official_reports: { en: 'Official Reports', om: 'Gabaasa Mootummaa', am: 'ይፋዊ ሪፖርቶች' },
  gis_map: { en: 'GIS Map', om: 'Kaartaa GIS', am: 'ጂአይኤስ ካርታ' },
  departments: { en: 'Departments', om: 'Waajjiraalee', am: 'ክፍሎች' },
  dept_chat: { en: 'Dept Chat', om: 'Haasawa Waajjiraa', am: 'የክፍል ውይይት' },
  user_management: { en: 'User Management', om: 'Bulchiinsa Fayyadamtootaa', am: 'የተጠቃሚ አስተዳደር' },
  settings: { en: 'Settings', om: 'Qindaa\'inoota', am: 'ቅንብሮች' },
  sign_out: { en: 'Sign Out', om: 'Ba\'i', am: 'ውጣ' },
  adama_smart: { en: 'Adama Smart', om: 'Adaamaa Ismaart', am: 'አዳማ ስማርት' },
  city_administration: { en: 'City Administration', om: 'Bulchiinsa Magaalaa', am: 'ከተማ አስተዳደር' },

  // Settings Page
  settings_title: { en: 'Settings', om: 'Qindaa\'inoota', am: 'ቅንብሮች' },
  settings_subtitle: {
    en: 'Manage your account and dashboard preferences',
    om: 'Herrega kee fi filannoowwan daashboordii to\'adhu',
    am: 'የመለያዎን እና የዳሽቦርድ ምርጫዎችን ያስተዳድሩ',
  },
  profile: { en: 'Profile', om: 'Profaayilii', am: 'መገለጫ' },
  edit_profile: { en: 'Edit Profile', om: 'Profaayilii Gulaali', am: 'መገለጫ አርትዕ' },
  full_name: { en: 'Full Name', om: 'Maqaa Guutuu', am: 'ሙሉ ስም' },
  phone_number: { en: 'Phone Number', om: 'Lakkoofsa Bilbilaa', am: 'ስልክ ቁጥር' },
  email: { en: 'Email', om: 'Imeelii', am: 'ኢሜይል' },
  department: { en: 'Department', om: 'Waajjira', am: 'ክፍል' },
  editable: { en: 'Editable', om: 'Gulaalamuu kan danda\'u', am: 'ሊስተካከል የሚችል' },
  locked_admin_only: { en: 'Locked (City Admin only)', om: 'Cufameera (Bulchiinsa qofa)', am: 'የተቆለፈ (ከተማ አስተዳደር ብቻ)' },
  cancel: { en: 'Cancel', om: 'Dhiisi', am: 'ሰርዝ' },
  save_changes: { en: 'Save Changes', om: 'Jijjiirama Olkaayi', am: 'ለውጦችን አስቀምጥ' },
  saving: { en: 'Saving...', om: 'Olkaayamaa jira...', am: 'በማስቀመጥ ላይ...' },
  not_provided: { en: 'Not provided', om: 'Hin kennamne', am: 'አልተሰጠም' },
  not_assigned: { en: 'Not assigned', om: 'Hin ramadamne', am: 'አልተመደበም' },

  // Notifications Section
  notifications: { en: 'Notifications', om: 'Beeksisa', am: 'ማሳወቂያዎች' },
  push_notifications: { en: 'Push Notifications', om: 'Beeksisa Battalaa', am: 'የግፊት ማሳወቂያዎች' },
  email_notifications: { en: 'Email Notifications', om: 'Beeksisa Imeelii', am: 'የኢሜይል ማሳወቂያዎች' },
  critical_alert_sound: { en: 'Critical Alert Sound', om: 'Sagalee Akeekkachiisaa', am: 'የአደጋ ማስጠንቀቂያ ድምጽ' },

  // Language Section
  language: { en: 'Language', om: 'Afaan', am: 'ቋንቋ' },
  select_language: { en: 'Select Language', om: 'Afaan Filadhu', am: 'ቋንቋ ይምረጡ' },
  language_active: { en: 'Active', om: 'Hojjechaa jira', am: 'ንቁ' },
  language_switched: {
    en: 'Language updated to English',
    om: 'Afaan gara Afaan Oromootti jijjiirameera',
    am: 'ቋንቋ ወደ አማርኛ ተቀይሯል',
  },

  // Security & System Info
  security: { en: 'Security', om: 'Nageenya', am: 'ደህንነት' },
  change_password: { en: 'Change Password', om: 'Jecha Iccitii Jijjiiri', am: 'የይለፍ ቃል ቀይር' },
  two_factor_auth: { en: 'Two-Factor Authentication', om: 'Mirkaneessa Sadarkaa Lammaffaa', am: 'ሁለት-ደረጃ ማረጋገጫ' },
  system_info: { en: 'System Info', om: 'Odeeffannoo Sirnaa', am: 'የስርዓት መረጃ' },
  version: { en: 'Version', om: 'Maxxansa', am: 'ስሪት' },

  // Report Statuses
  status_submitted: { en: 'Submitted', om: 'Ergameera', am: 'ገብቷል' },
  status_received: { en: 'Received', om: 'Qaqqabeera', am: 'ደርሷል' },
  status_assigned: { en: 'Assigned', om: 'Ramadameera', am: 'ተመድቧል' },
  status_under_investigation: { en: 'Under Investigation', om: 'Qorannoo Irra Jira', am: 'በምርመራ ላይ' },
  status_in_progress: { en: 'In Progress', om: 'Hojjetamaa Jira', am: 'በሂደት ላይ' },
  status_resolved: { en: 'Resolved', om: 'Furmaata Argateera', am: 'ተፈቷል' },
  status_closed: { en: 'Closed', om: 'Cufameera', am: 'ተዘግቷል' },
  status_reopened: { en: 'Reopened', om: 'Irra Deebiin Banameera', am: 'እንደገና ተከፍቷል' },
  status_rejected: { en: 'Rejected', om: 'Kufaa Ta\'eera', am: 'ውድቅ ተደርጓል' },

  // Actions
  search: { en: 'Search', om: 'Barbaadi', am: 'ፈልግ' },
  filter: { en: 'Filter', om: 'Filtarii', am: 'አጣራ' },
  view_details: { en: 'View Details', om: 'Bal\'inaan Ilaali', am: 'ዝርዝሩን ይመልከቱ' },
  share_report: { en: 'Share Report', om: 'Gabaasa Qoodi', am: 'ሪፖርት አጋራ' },
}

interface LanguageState {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: (localStorage.getItem('app_language') as Language) || 'en',
  setLanguage: (lang: Language) => {
    localStorage.setItem('app_language', lang)
    set({ language: lang })
    // Dispatch custom event so all listeners immediately update
    window.dispatchEvent(new Event('app_language_changed'))
  },
  t: (key: string) => {
    const currentLang = get().language || 'en'
    const entry = translations[key]
    if (!entry) return key
    return entry[currentLang] || entry['en'] || key
  },
}))
