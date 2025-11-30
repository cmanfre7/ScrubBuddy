'use client'

import { useState, useEffect, ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import { GripVertical, Check, X, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

export type WidgetSize = 'full' | 'half' | 'quarter' | 'third'

export interface WidgetConfig {
  id: string
  size: WidgetSize
  visible: boolean
}

interface DraggableWidgetProps {
  id: string
  children: ReactNode
  size: WidgetSize
  isEditMode: boolean
  isVisible: boolean
  onToggleVisibility: (id: string) => void
}

function DraggableWidget({
  id,
  children,
  size,
  isEditMode,
  isVisible,
  onToggleVisibility,
}: DraggableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const sizeClasses: Record<WidgetSize, string> = {
    full: 'col-span-full',
    half: 'col-span-full lg:col-span-1',
    third: 'col-span-full lg:col-span-1',
    quarter: 'col-span-1',
  }

  if (!isVisible && !isEditMode) return null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        sizeClasses[size],
        isDragging && 'z-50 opacity-50',
        isEditMode && !isVisible && 'opacity-40'
      )}
    >
      <motion.div
        className="relative h-full"
        animate={isEditMode ? {
          rotate: [0, -0.5, 0.5, -0.5, 0.5, 0],
        } : { rotate: 0 }}
        transition={isEditMode ? {
          repeat: Infinity,
          duration: 0.5,
          ease: 'linear',
        } : {}}
      >
        {/* Edit mode overlay */}
        {isEditMode && (
          <>
            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="absolute -top-2 -left-2 z-10 p-1.5 bg-blue-600 rounded-lg cursor-grab active:cursor-grabbing shadow-lg"
            >
              <GripVertical size={14} className="text-white" />
            </div>

            {/* Visibility toggle */}
            <button
              onClick={() => onToggleVisibility(id)}
              className={cn(
                'absolute -top-2 -right-2 z-10 p-1.5 rounded-full shadow-lg transition-colors',
                isVisible
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              )}
            >
              {isVisible ? (
                <Check size={12} className="text-white" />
              ) : (
                <X size={12} className="text-white" />
              )}
            </button>

            {/* Edit mode border */}
            <div className="absolute inset-0 border-2 border-dashed border-blue-500/50 rounded-xl pointer-events-none" />
          </>
        )}

        {children}
      </motion.div>
    </div>
  )
}

interface DraggableDashboardProps {
  children: ReactNode[]
  widgetIds: string[]
  defaultConfig: WidgetConfig[]
  storageKey?: string
}

const DEFAULT_STORAGE_KEY = 'scrubbuddy-dashboard-layout'

export function DraggableDashboard({
  children,
  widgetIds,
  defaultConfig,
  storageKey = DEFAULT_STORAGE_KEY,
}: DraggableDashboardProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [config, setConfig] = useState<WidgetConfig[]>(defaultConfig)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load saved config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsedConfig = JSON.parse(saved) as WidgetConfig[]
        // Merge with defaults to ensure all widgets are present
        const mergedConfig = widgetIds.map((id) => {
          const savedWidget = parsedConfig.find((w) => w.id === id)
          const defaultWidget = defaultConfig.find((w) => w.id === id)
          return savedWidget || defaultWidget || { id, size: 'half' as WidgetSize, visible: true }
        })
        setConfig(mergedConfig)
      } catch {
        setConfig(defaultConfig)
      }
    }
    setIsLoaded(true)
  }, [defaultConfig, storageKey, widgetIds])

  // Save config to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(storageKey, JSON.stringify(config))
    }
  }, [config, isLoaded, storageKey])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setConfig((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }

    setActiveId(null)
  }

  const toggleVisibility = (id: string) => {
    setConfig((items) =>
      items.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item
      )
    )
  }

  const resetToDefault = () => {
    setConfig(defaultConfig)
    localStorage.removeItem(storageKey)
  }

  // Create a map from widgetId to child component
  const childrenMap = new Map<string, ReactNode>()
  widgetIds.forEach((id, index) => {
    childrenMap.set(id, children[index])
  })

  // Get ordered widgets based on config
  const orderedWidgets = config.map((widgetConfig) => ({
    ...widgetConfig,
    component: childrenMap.get(widgetConfig.id),
  }))

  const activeWidget = orderedWidgets.find((w) => w.id === activeId)

  if (!isLoaded) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {children}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Edit Mode Toggle */}
      <div className="flex justify-end gap-2">
        {isEditMode && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={resetToDefault}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RotateCcw size={14} />
            Reset
          </motion.button>
        )}
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={cn(
            'flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-all',
            isEditMode
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          )}
        >
          {isEditMode ? (
            <>
              <Check size={14} />
              Done
            </>
          ) : (
            <>
              <GripVertical size={14} />
              Customize
            </>
          )}
        </button>
      </div>

      {/* Widgets Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={config.map((c) => c.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-4">
            {orderedWidgets.map((widget) => (
              <DraggableWidget
                key={widget.id}
                id={widget.id}
                size={widget.size}
                isEditMode={isEditMode}
                isVisible={widget.visible}
                onToggleVisibility={toggleVisibility}
              >
                {widget.component}
              </DraggableWidget>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId && activeWidget ? (
            <div className="opacity-80 transform scale-105">
              {activeWidget.component}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Edit Mode Instructions */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-lg border border-slate-700/50 px-6 py-3 rounded-xl shadow-xl"
          >
            <p className="text-sm text-slate-300">
              <span className="text-blue-400 font-medium">Drag</span> widgets to reorder
              {' '}&bull;{' '}
              <span className="text-green-400 font-medium">Click checkmarks</span> to show/hide
              {' '}&bull;{' '}
              <span className="text-slate-400">Click Done when finished</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
