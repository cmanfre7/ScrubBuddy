'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { FileText, Lightbulb, BookOpen, FolderOpen, Calendar, Mic, MicOff, X, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface QuickAction {
  label: string
  href?: string
  icon: React.ReactNode
  bgColor: string
  onClick?: () => void
}

export function QuickActionsWidget() {
  const queryClient = useQueryClient()
  const [showPearlModal, setShowPearlModal] = useState(false)
  const [pearlContent, setPearlContent] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Check for speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      setIsSupported(!!SpeechRecognition)
    }
  }, [])

  // Setup speech recognition
  const startListening = () => {
    if (!isSupported) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setPearlContent(transcript)
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Save pearl mutation
  const savePearlMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch('/api/clinical-pearls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to save pearl')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pearls'] })
      setPearlContent('')
      setShowPearlModal(false)
    },
  })

  const handleSavePearl = () => {
    if (!pearlContent.trim()) return
    savePearlMutation.mutate(pearlContent.trim())
  }

  const actions: QuickAction[] = [
    {
      label: 'Log Patient',
      href: '/dashboard/patients',
      icon: <FileText size={18} />,
      bgColor: 'bg-blue-900/30',
    },
    {
      label: 'Quick Pearl',
      icon: <Lightbulb size={18} />,
      bgColor: 'bg-purple-900/30',
      onClick: () => setShowPearlModal(true),
    },
    {
      label: 'Log UWorld',
      href: '/dashboard/uworld',
      icon: <BookOpen size={18} />,
      bgColor: 'bg-green-900/30',
    },
    {
      label: 'Resources',
      href: '/dashboard/resources',
      icon: <FolderOpen size={18} />,
      bgColor: 'bg-amber-900/30',
    },
    {
      label: 'Calendar',
      href: '/dashboard/calendar',
      icon: <Calendar size={18} />,
      bgColor: 'bg-red-900/30',
    },
    {
      label: 'Voice Pearl',
      icon: <Mic size={18} />,
      bgColor: 'bg-cyan-900/30',
      onClick: () => {
        setShowPearlModal(true)
        // Auto-start listening after modal opens
        setTimeout(() => {
          if (isSupported) startListening()
        }, 300)
      },
    },
  ]

  return (
    <>
      <div
        className="backdrop-blur-sm rounded-xl p-6 transition-all"
        style={{
          backgroundColor: '#111827',
          border: '1px solid #1e293b'
        }}
      >
        <div className="mb-5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Quick Actions</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {actions.map((action, index) => {
            if (action.onClick) {
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-blue-900/10 transition-all"
                  style={{
                    backgroundColor: '#1a2332',
                    border: '1px solid #1e293b'
                  }}
                >
                  <div className={`w-10 h-10 rounded-lg ${action.bgColor} flex items-center justify-center text-slate-300`}>
                    {action.icon}
                  </div>
                  <span className="text-xs text-slate-400">{action.label}</span>
                </button>
              )
            }
            return (
              <Link
                key={index}
                href={action.href!}
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-blue-900/10 transition-all"
                style={{
                  backgroundColor: '#1a2332',
                  border: '1px solid #1e293b'
                }}
              >
                <div className={`w-10 h-10 rounded-lg ${action.bgColor} flex items-center justify-center text-slate-300`}>
                  {action.icon}
                </div>
                <span className="text-xs text-slate-400">{action.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Quick Pearl Modal */}
      {showPearlModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-lg rounded-xl p-6"
            style={{
              backgroundColor: '#111827',
              border: '1px solid #1e293b'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Lightbulb className="text-purple-400" size={20} />
                Quick Clinical Pearl
              </h3>
              <button
                onClick={() => {
                  setShowPearlModal(false)
                  stopListening()
                  setPearlContent('')
                }}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-400">
                    {isListening ? 'Listening... speak your pearl' : 'Type or dictate your clinical pearl'}
                  </label>
                  {isSupported && (
                    <button
                      onClick={toggleListening}
                      className={`p-2 rounded-lg transition-all ${
                        isListening
                          ? 'bg-red-500/20 text-red-400 animate-pulse'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                      title={isListening ? 'Stop dictation' : 'Start voice dictation'}
                    >
                      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                  )}
                </div>
                <Textarea
                  value={pearlContent}
                  onChange={(e) => setPearlContent(e.target.value)}
                  placeholder="e.g., In DKA, always check for precipitating infection even if WBC is elevated from stress response..."
                  rows={5}
                  className="w-full"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowPearlModal(false)
                    stopListening()
                    setPearlContent('')
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePearl}
                  disabled={!pearlContent.trim() || savePearlMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {savePearlMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Save Pearl
                </Button>
              </div>

              {!isSupported && (
                <p className="text-xs text-slate-500 text-center">
                  Voice dictation not supported in this browser. Try Chrome or Edge.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
