'use client'

import { ReactNode } from 'react'
import { DraggableDashboard, WidgetConfig, WidgetSize } from './DraggableDashboard'

// Widget IDs - must match the order of children passed to this component
export const WIDGET_IDS = [
  'countdowns',
  'uworld-progress',
  'goals',
  'today-schedule',
  'week-calendar',
  'quick-actions',
  'weak-areas',
  'pearls',
  'streak',
] as const

export type WidgetId = typeof WIDGET_IDS[number]

// Default widget configuration
export const DEFAULT_WIDGET_CONFIG: WidgetConfig[] = [
  { id: 'countdowns', size: 'full', visible: true },
  { id: 'uworld-progress', size: 'half', visible: true },
  { id: 'goals', size: 'half', visible: true },
  { id: 'today-schedule', size: 'full', visible: true },
  { id: 'week-calendar', size: 'half', visible: true },
  { id: 'quick-actions', size: 'half', visible: true },
  { id: 'weak-areas', size: 'half', visible: true },
  { id: 'pearls', size: 'half', visible: true },
  { id: 'streak', size: 'third', visible: true },
]

interface DashboardClientProps {
  countdownsWidget: ReactNode
  uworldWidget: ReactNode
  goalsWidget: ReactNode
  todayScheduleWidget: ReactNode
  weekCalendarWidget: ReactNode
  quickActionsWidget: ReactNode
  weakAreasWidget: ReactNode
  pearlsWidget: ReactNode
  streakWidget: ReactNode
}

export function DashboardClient({
  countdownsWidget,
  uworldWidget,
  goalsWidget,
  todayScheduleWidget,
  weekCalendarWidget,
  quickActionsWidget,
  weakAreasWidget,
  pearlsWidget,
  streakWidget,
}: DashboardClientProps) {
  // Order must match WIDGET_IDS
  const widgets = [
    countdownsWidget,
    uworldWidget,
    goalsWidget,
    todayScheduleWidget,
    weekCalendarWidget,
    quickActionsWidget,
    weakAreasWidget,
    pearlsWidget,
    streakWidget,
  ]

  return (
    <DraggableDashboard
      widgetIds={[...WIDGET_IDS]}
      defaultConfig={DEFAULT_WIDGET_CONFIG}
    >
      {widgets}
    </DraggableDashboard>
  )
}
