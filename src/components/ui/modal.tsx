'use client'

import { ReactNode, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  className?: string
}

export function Modal({ isOpen, onClose, children, title, className }: ModalProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed z-50 overflow-hidden',
              'bg-slate-800 border border-slate-700 shadow-2xl',
              // Mobile: full screen with safe areas
              isMobile
                ? 'inset-0 rounded-none'
                : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] rounded-xl',
              className
            )}
          >
            {/* Header - always show on mobile, optional on desktop */}
            {(title || isMobile) && (
              <div className={cn(
                'flex items-center justify-between border-b border-slate-700 sticky top-0 bg-slate-800 z-10',
                isMobile ? 'px-4 py-3 min-h-[56px]' : 'px-6 py-4'
              )}>
                <h2 className={cn(
                  'font-semibold text-slate-100',
                  isMobile ? 'text-lg' : 'text-lg'
                )}>
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className={cn(
                    'rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors',
                    isMobile ? 'p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center' : 'p-1'
                  )}
                >
                  <X size={isMobile ? 24 : 20} />
                </button>
              </div>
            )}
            <div className={cn(
              'overflow-y-auto',
              isMobile ? 'p-4 pb-safe' : 'p-6',
              // On mobile, calculate max height to account for header
              isMobile ? 'max-h-[calc(100vh-56px)]' : 'max-h-[calc(90vh-64px)]'
            )}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
