export type RotationName =
  | 'Psychiatry'
  | 'Pediatrics'
  | 'OB/GYN'
  | 'General Surgery'
  | 'Orthopedic Surgery'
  | 'Internal Medicine'
  | 'Heme/Oncology'
  | 'Family Medicine'

export type ShelfSubject =
  | 'Emergency Medicine'
  | 'Family Medicine'
  | 'Internal Medicine'
  | 'OBGYN'
  | 'Pediatrics'
  | 'Psychiatry'
  | 'Surgery'

export type UWorldSubject =
  | 'Anatomy'
  | 'Physiology'
  | 'Pathology'
  | 'Pharmacology'
  | 'Microbiology'
  | 'Biochemistry'

export type PatientSetting =
  | 'Inpatient'
  | 'Outpatient'
  | 'ED'
  | 'OR'
  | 'L&D'
  | 'Clinic'

export type AgeGroup = 'Neonate' | 'Pediatric' | 'Adult' | 'Geriatric'

export type ProcedureCategory = 'General' | 'Advanced' | 'Specialty' | 'Custom'

export type ProcedureSpecialty =
  | 'Surgery'
  | 'Medicine'
  | 'OB'
  | 'Peds'
  | 'Psych'
  | 'FM'
  | 'EM'
  | 'All'

export type WhyWrongOption =
  | 'Misread'
  | "Didn't Know"
  | 'Second-guessed'
  | 'Silly Mistake'

export type IncorrectStatus = 'needs_review' | 'reviewed' | 'mastered'

export type StudyBlockType = 'uworld' | 'anki' | 'review' | 'video' | 'reading'

export type TaskCategory = 'study' | 'clinical' | 'personal'

export type RecurringOption = 'daily' | 'weekdays' | 'weekly' | null

export interface ProcedureStep {
  number: number
  instruction: string
  tip?: string
  image_url?: string
  video_url?: string
}

export interface DashboardStats {
  uworldPercentage: number
  uworldTrend: 'up' | 'down' | 'stable'
  questionsToday: number
  dailyGoal: number
  questionsThisWeek: number
  daysUntilStep2: number | null
  daysUntilComlex: number | null
}

export const ROTATION_OPTIONS: RotationName[] = [
  'Psychiatry',
  'Pediatrics',
  'OB/GYN',
  'General Surgery',
  'Orthopedic Surgery',
  'Internal Medicine',
  'Heme/Oncology',
  'Family Medicine',
]

export const SHELF_SUBJECTS: ShelfSubject[] = [
  'Emergency Medicine',
  'Family Medicine',
  'Internal Medicine',
  'OBGYN',
  'Pediatrics',
  'Psychiatry',
  'Surgery',
]

export const UWORLD_SUBJECTS: UWorldSubject[] = [
  'Anatomy',
  'Physiology',
  'Pathology',
  'Pharmacology',
  'Microbiology',
  'Biochemistry',
]

export const PATIENT_SETTINGS: PatientSetting[] = [
  'Inpatient',
  'Outpatient',
  'ED',
  'OR',
  'L&D',
  'Clinic',
]

export const AGE_GROUPS: AgeGroup[] = [
  'Neonate',
  'Pediatric',
  'Adult',
  'Geriatric',
]

export const WHY_WRONG_OPTIONS: WhyWrongOption[] = [
  'Misread',
  "Didn't Know",
  'Second-guessed',
  'Silly Mistake',
]
