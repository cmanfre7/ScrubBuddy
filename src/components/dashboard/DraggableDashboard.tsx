'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
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
import { GripVertical, Check, X, RotateCcw, Maximize2, Columns2, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

export type WidgetSize = 'full' | 'half' | 'quarter' | 'third'

export interface WidgetConfig {
  id: string
  size: WidgetSize
  visible: boolean
}

const SIZE_OPTIONS: { value: WidgetSize; label: string; icon: typeof Maximize2 }[] = [
  { value: 'full', label: 'Full Width', icon: Maximize2 },
  { value: 'half', label: 'Half Width', icon: Columns2 },
  { value: 'third', label: 'Third Width', icon: LayoutGrid },
]

interface DraggableWidgetProps {
  id: string
  children: ReactNode
  size: WidgetSize
  isEditMode: boolean
  isVisible: boolean
  onToggleVisibility: (id: string) => void
  onChangeSize: (id: string, size: WidgetSize) => void
}

function DraggableWidget({
  id,
  children,
  size,
  isEditMode,
  isVisible,
  onToggleVisibility,
  onChangeSize,
}: DraggableWidgetProps) {
  const [showSizeMenu, setShowSizeMenu] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    transition: {
      duration: 350,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 350ms cubic-bezier(0.25, 1, 0.5, 1)',
  }

  const sizeClasses: Record<WidgetSize, string> = {
    full: 'col-span-full',
    half: 'col-span-full lg:col-span-1',
    third: 'col-span-full lg:col-span-1',
    quarter: 'col-span-1',
  }

  if (!isVisible && !isEditMode) return null

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      layoutId={id}
      transition={{
        layout: { duration: 0.4, ease: [0.25, 1, 0.5, 1] },
      }}
      className={cn(
        sizeClasses[size],
        'transition-all duration-350 ease-out',
        isDragging && 'z-50 opacity-60 scale-[1.02]',
        isEditMode && !isVisible && 'opacity-40'
      )}
    >
      <motion.div
        className="relative h-full"
        animate={isEditMode ? {
          rotate: [0, -0.3, 0.3, 0],
        } : { rotate: 0 }}
        transition={isEditMode ? {
          repeat: Infinity,
          duration: 2.5,
          ease: 'easeInOut',
        } : { duration: 0.3 }}
      >
        {/* Edit mode overlay */}
        <AnimatePresence>
          {isEditMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Drag handle */}
              <div
                {...attributes}
                {...listeners}
                className="absolute -top-2 -left-2 z-10 p-1.5 bg-blue-600 rounded-lg cursor-grab active:cursor-grabbing shadow-lg hover:bg-blue-500 transition-colors"
              >
                <GripVertical size={14} className="text-white" />
              </div>

              {/* Size selector */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
                <button
                  onClick={() => setShowSizeMenu(!showSizeMenu)}
                  className="px-2 py-1 bg-purple-600 hover:bg-purple-500 rounded-lg shadow-lg transition-colors flex items-center gap-1"
                >
                  {SIZE_OPTIONS.find(s => s.value === size)?.icon && (
                    (() => {
                      const Icon = SIZE_OPTIONS.find(s => s.value === size)!.icon
                      return <Icon size={12} className="text-white" />
                    })()
                  )}
                  <span className="text-xs text-white font-medium">
                    {size === 'full' ? 'Full' : size === 'half' ? 'Half' : 'Third'}
                  </span>
                </button>

                <AnimatePresence>
                  {showSizeMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden"
                    >
                      {SIZE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            onChangeSize(id, option.value)
                            setShowSizeMenu(false)
                          }}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 w-full text-left text-sm transition-colors whitespace-nowrap',
                            size === option.value
                              ? 'bg-purple-600 text-white'
                              : 'text-slate-300 hover:bg-slate-700'
                          )}
                        >
                          <option.icon size={14} />
                          {option.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Visibility toggle */}
              <button
                onClick={() => onToggleVisibility(id)}
                className={cn(
                  'absolute -top-2 -right-2 z-10 p-1.5 rounded-full shadow-lg transition-all duration-200',
                  isVisible
                    ? 'bg-green-600 hover:bg-green-500'
                    : 'bg-red-600 hover:bg-red-500'
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
            </motion.div>
          )}
        </AnimatePresence>

        {children}
      </motion.div>
    </motion.div>
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
  const hasLoadedRef = useRef(false)
  const defaultConfigRef = useRef(defaultConfig)
  const widgetIdsRef = useRef(widgetIds)

  // Load saved config from localStorage - ONLY ONCE on mount
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsedConfig = JSON.parse(saved) as WidgetConfig[]
        // Start with the saved config ORDER (this is the key - preserve user's arrangement)
        const savedOrder = parsedConfig.map(w => w.id)

        // Find any new widgets that aren't in saved config
        const newWidgets = widgetIdsRef.current.filter(id => !savedOrder.includes(id))

        // Build final config: saved widgets first (in their saved order), then any new widgets
        const mergedConfig = [
          ...savedOrder.map(id => {
            const savedWidget = parsedConfig.find(w => w.id === id)
            // Only include if it still exists in current widget list
            if (!widgetIdsRef.current.includes(id)) return null
            return savedWidget || { id, size: 'half' as WidgetSize, visible: true }
          }).filter(Boolean) as WidgetConfig[],
          ...newWidgets.map(id => {
            const defaultWidget = defaultConfigRef.current.find(w => w.id === id)
            return defaultWidget || { id, size: 'half' as WidgetSize, visible: true }
          })
        ]
        setConfig(mergedConfig)
      } catch {
        setConfig(defaultConfigRef.current)
      }
    }
    setIsLoaded(true)
  }, [storageKey])

  // Save config to localStorage whenever it changes (after initial load)
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
        const newItems = arrayMove(items, oldIndex, newIndex)

        // Auto-resize logic: intelligently resize based on position context
        const draggedWidget = newItems[newIndex]

        // Calculate which "row" each widget occupies in the 2-column grid
        // full = 2 columns, half/third = 1 column
        const getWidgetCols = (size: WidgetSize) => size === 'full' ? 2 : 1

        // Find the row boundaries and which widgets share rows
        let currentCol = 0
        const rowInfo: { startIndex: number; widgetIndices: number[]; totalCols: number }[] = []

        for (let i = 0; i < newItems.length; i++) {
          if (!newItems[i].visible) continue
          const cols = getWidgetCols(newItems[i].size)

          if (currentCol + cols > 2) {
            // Start a new row
            if (rowInfo.length === 0 || rowInfo[rowInfo.length - 1].widgetIndices.length > 0) {
              rowInfo.push({ startIndex: i, widgetIndices: [i], totalCols: cols })
            }
            currentCol = cols
          } else {
            // Add to current row
            if (rowInfo.length === 0) {
              rowInfo.push({ startIndex: i, widgetIndices: [i], totalCols: cols })
            } else {
              rowInfo[rowInfo.length - 1].widgetIndices.push(i)
              rowInfo[rowInfo.length - 1].totalCols += cols
            }
            currentCol += cols
            if (currentCol >= 2) {
              currentCol = 0
            }
          }
        }

        // Find the row containing the dropped widget
        const droppedRow = rowInfo.find(row => row.widgetIndices.includes(newIndex))

        if (droppedRow) {
          // If dropped widget is full-width but other widgets in same position want to share
          // Check neighbor widgets at drop position
          const targetWidget = items.find(item => item.id === over.id)

          if (draggedWidget.size === 'full' && targetWidget && targetWidget.size !== 'full') {
            // Resize to half to fit alongside the target
            newItems[newIndex] = { ...draggedWidget, size: 'half' }
          } else if (draggedWidget.size === 'full') {
            // Check if the widget before or after at the drop position is half-width
            const prevIdx = newIndex > 0 ? newIndex - 1 : null
            const nextIdx = newIndex < newItems.length - 1 ? newIndex + 1 : null

            const prevWidget = prevIdx !== null ? newItems[prevIdx] : null
            const nextWidget = nextIdx !== null ? newItems[nextIdx] : null

            // If adjacent visible widget is half-width, resize to half to share the row
            if ((prevWidget?.visible && prevWidget.size !== 'full') ||
                (nextWidget?.visible && nextWidget.size !== 'full')) {
              newItems[newIndex] = { ...draggedWidget, size: 'half' }
            }
          }
        }

        return newItems
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

  const changeSize = (id: string, newSize: WidgetSize) => {
    setConfig((items) =>
      items.map((item) =>
        item.id === id ? { ...item, size: newSize } : item
      )
    )
  }

  const resetToDefault = () => {
    setConfig(defaultConfigRef.current)
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
                onChangeSize={changeSize}
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
              <span className="text-blue-400 font-medium">Drag</span> to reorder
              {' '}&bull;{' '}
              <span className="text-purple-400 font-medium">Click size</span> to resize
              {' '}&bull;{' '}
              <span className="text-green-400 font-medium">Checkmarks</span> show/hide
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
