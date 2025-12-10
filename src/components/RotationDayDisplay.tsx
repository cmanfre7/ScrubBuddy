'use client'

import { useMemo } from 'react'

interface RotationDayDisplayProps {
  startDateISO: string
  totalDays: number
  rotationName: string
}

// Calculate current day of rotation using LOCAL timezone
function calculateCurrentDay(startDateISO: string): number {
  const now = new Date()
  const start = new Date(startDateISO)

  // Get today's date at midnight LOCAL time
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Get start date at midnight LOCAL time (using UTC components from stored date)
  const startMidnight = new Date(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  )

  // Calculate days since start (add 1 because day 1 is the start date)
  const diffTime = todayMidnight.getTime() - startMidnight.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1
}

export function RotationDayDisplay({ startDateISO, totalDays, rotationName }: RotationDayDisplayProps) {
  const currentDay = useMemo(() => {
    return calculateCurrentDay(startDateISO)
  }, [startDateISO])

  return (
    <>
      Currently on <span className="text-blue-400 font-semibold">{rotationName}</span> ·
      Day {currentDay} of {totalDays}
    </>
  )
}
