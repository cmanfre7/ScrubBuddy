'use client'

import { useState } from 'react'
import { Calendar, Plus } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useRouter } from 'next/navigation'

interface Rotation {
  id: string
  name: string
  shelfDate: string | null
}

interface ExamDateButtonsProps {
  step2Date?: string | null
  comlexDate?: string | null
  rotations: Rotation[]
}

export function ExamDateButtons({ step2Date, comlexDate, rotations }: ExamDateButtonsProps) {
  const [showBoardExamModal, setShowBoardExamModal] = useState(false)
  const [showShelfModal, setShowShelfModal] = useState(false)
  const router = useRouter()

  const [boardFormData, setBoardFormData] = useState({
    step2Date: step2Date ? new Date(step2Date).toISOString().split('T')[0] : '',
    comlexDate: comlexDate ? new Date(comlexDate).toISOString().split('T')[0] : '',
  })

  const [shelfFormData, setShelfFormData] = useState({
    rotationId: '',
    shelfDate: '',
  })

  const handleSaveBoardDates = async () => {
    try {
      const res = await fetch('/api/user/exam-dates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step2Date: boardFormData.step2Date || null,
          comlexDate: boardFormData.comlexDate || null,
        }),
      })

      if (res.ok) {
        setShowBoardExamModal(false)
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to save board exam dates:', error)
    }
  }

  const handleSaveShelfDate = async () => {
    if (!shelfFormData.rotationId || !shelfFormData.shelfDate) return

    try {
      const res = await fetch(`/api/rotations/${shelfFormData.rotationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shelfDate: shelfFormData.shelfDate,
        }),
      })

      if (res.ok) {
        setShowShelfModal(false)
        setShelfFormData({ rotationId: '', shelfDate: '' })
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to save shelf date:', error)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowBoardExamModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium"
      >
        <Calendar size={16} />
        {step2Date || comlexDate ? 'Update' : 'Set'} Board Exam Dates
      </button>

      <button
        onClick={() => setShowShelfModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors text-sm font-medium"
      >
        <Plus size={16} />
        Set Shelf Exam Date
      </button>

      {/* Board Exam Dates Modal */}
      {showBoardExamModal && (
        <Modal isOpen={true} onClose={() => setShowBoardExamModal(false)} title="Set Board Exam Dates">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                USMLE Step 2 CK Date (optional)
              </label>
              <Input
                type="date"
                value={boardFormData.step2Date}
                onChange={(e) => setBoardFormData({ ...boardFormData, step2Date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                COMLEX Level 2-CE Date (optional)
              </label>
              <Input
                type="date"
                value={boardFormData.comlexDate}
                onChange={(e) => setBoardFormData({ ...boardFormData, comlexDate: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setShowBoardExamModal(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveBoardDates} className="flex-1">
                Save Dates
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Shelf Exam Date Modal */}
      {showShelfModal && (
        <Modal isOpen={true} onClose={() => setShowShelfModal(false)} title="Set Shelf Exam Date">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Rotation
              </label>
              <Select
                options={[
                  { value: '', label: 'Select rotation...' },
                  ...rotations.map(r => ({ value: r.id, label: r.name }))
                ]}
                value={shelfFormData.rotationId}
                onChange={(e) => setShelfFormData({ ...shelfFormData, rotationId: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Shelf Exam Date
              </label>
              <Input
                type="date"
                value={shelfFormData.shelfDate}
                onChange={(e) => setShelfFormData({ ...shelfFormData, shelfDate: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setShowShelfModal(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveShelfDate}
                className="flex-1"
                disabled={!shelfFormData.rotationId || !shelfFormData.shelfDate}
              >
                Save Date
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
