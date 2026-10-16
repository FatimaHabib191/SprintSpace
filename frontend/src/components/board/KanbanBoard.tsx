import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, GripVertical, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PriorityBadge } from '@/components/ui/misc'
import { useMoveTask } from '@/hooks/queries'
import { errorMessage } from '@/lib/api'
import { STATUSES, type Task, type TaskStatus } from '@/lib/types'
import { cn, formatDay, isOverdue } from '@/lib/utils'

type Columns = Record<TaskStatus, string[]>

const byPosition = (a: Task, b: Task) => a.position - b.position
const emptyColumns = (): Columns => ({ todo: [], in_progress: [], done: [] })

function buildColumns(tasks: Task[]): Columns {
  const cols = emptyColumns()
  for (const t of [...tasks].sort(byPosition)) cols[t.status].push(t.id)
  return cols
}

interface Props {
  projectId: string
  /** Every task in the project (unfiltered): needed so server indexes stay correct while filtering. */
  allTasks: Task[]
  /** Tasks currently visible after search / priority filters. */
  visibleTasks: Task[]
  filtersActive: boolean
  onOpenTask: (task: Task) => void
  onAddTask: (status: TaskStatus) => void
}

export function KanbanBoard({ projectId, allTasks, visibleTasks, filtersActive, onOpenTask, onAddTask }: Props) {
  const taskById = useMemo(() => new Map(allTasks.map((t) => [t.id, t])), [allTasks])
  const [columns, setColumns] = useState<Columns>(() => buildColumns(visibleTasks))
  const [activeId, setActiveId] = useState<string | null>(null)
  const dragging = useRef(false)
  // Which column the card started in; lets us detect "dropped back where it was".
  const origin = useRef<{ status: TaskStatus; index: number } | null>(null)

  const move = useMoveTask(projectId, (err, retry) => {
    toast.error(`Couldn't save that move: ${errorMessage(err)}. The board was restored.`, {
      action: { label: 'Retry', onClick: retry },
      duration: 8000,
    })
  })

  // Re-sync from server/cache data whenever we're not mid-drag.
  useEffect(() => {
    if (!dragging.current) setColumns(buildColumns(visibleTasks))
  }, [visibleTasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Press-and-hold on touch so vertical/horizontal scrolling still works.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Space picks up/drops; Enter is reserved for opening the task.
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  )

  const findColumn = (id: string): TaskStatus | null => {
    if ((STATUSES as { value: string }[]).some((s) => s.value === id)) return id as TaskStatus
    return (Object.keys(columns) as TaskStatus[]).find((s) => columns[s].includes(id)) ?? null
  }

  const title = (id: string | number) => taskById.get(String(id))?.title ?? 'task'
  const colName = (id: string | number) => {
    const col = findColumn(String(id))
    return STATUSES.find((s) => s.value === col)?.label ?? 'column'
  }
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${title(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${title(active.id)} is over ${colName(over.id)}.` : `${title(active.id)} is no longer over a column.`),
    onDragEnd: ({ active, over }) => (over ? `Dropped ${title(active.id)} in ${colName(over.id)}.` : `Dropped ${title(active.id)}.`),
    onDragCancel: ({ active }) => `Cancelled. ${title(active.id)} returned to its place.`,
  }

  const onDragStart = (e: DragStartEvent) => {
    dragging.current = true
    const id = String(e.active.id)
    setActiveId(id)
    const status = findColumn(id)
    origin.current = status ? { status, index: columns[status].indexOf(id) } : null
  }

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e
    if (!over) return
    const activeKey = String(active.id)
    const from = findColumn(activeKey)
    const to = findColumn(String(over.id))
    if (!from || !to || from === to) return

    setColumns((prev) => {
      const target = prev[to]
      const overIndex = target.indexOf(String(over.id))
      const isBelow = over.rect && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height / 2
      const insertAt = overIndex >= 0 ? overIndex + (isBelow ? 1 : 0) : target.length
      return {
        ...prev,
        [from]: prev[from].filter((id) => id !== activeKey),
        [to]: [...target.slice(0, insertAt), activeKey, ...target.slice(insertAt)],
      }
    })
  }

  const finish = () => {
    dragging.current = false
    setActiveId(null)
    origin.current = null
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    const id = String(active.id)
    const task = taskById.get(id)
    const start = origin.current
    if (!task || !over || !start) {
      setColumns(buildColumns(visibleTasks))
      return finish()
    }

    const to = findColumn(String(over.id))
    if (!to) {
      setColumns(buildColumns(visibleTasks))
      return finish()
    }

    // Final order within the destination column (reorder if dropped on a sibling in the same column).
    let finalIds = columns[to]
    const overKey = String(over.id)
    if (to === start.status && finalIds.includes(overKey) && overKey !== id) {
      const from = finalIds.indexOf(id)
      const target = finalIds.indexOf(overKey)
      if (from !== target) {
        const next = [...finalIds]
        next.splice(from, 1)
        next.splice(target, 0, id)
        finalIds = next
      }
    }
    setColumns((prev) => ({ ...prev, [to]: finalIds }))

    const visibleIndex = finalIds.indexOf(id)
    const unchanged = to === start.status && visibleIndex === start.index
    finish()
    if (unchanged) return

    // Translate the index within the (possibly filtered) visible column into an index within
    // the full column, so hidden tasks keep their relative order.
    const fullColumn = allTasks.filter((t) => t.status === to && t.id !== id).sort(byPosition)
    const prevVisibleId = finalIds[visibleIndex - 1]
    let index: number
    if (!filtersActive) index = visibleIndex
    else if (!prevVisibleId) index = 0
    else index = fullColumn.findIndex((t) => t.id === prevVisibleId) + 1

    move.mutate({ task, status: to, index })
  }

  const onDragCancel = () => {
    setColumns(buildColumns(visibleTasks))
    finish()
  }

  const activeTask = activeId ? taskById.get(activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'To pick up a task, press space. Use the arrow keys to move it between columns or up and down. Press space again to drop it, or escape to cancel. Press enter to open the task.',
        },
      }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible">
        {STATUSES.map((s) => (
          <Column
            key={s.value}
            status={s.value}
            label={s.label}
            ids={columns[s.value]}
            taskById={taskById}
            onOpenTask={onOpenTask}
            onAddTask={() => onAddTask(s.value)}
            totalInColumn={allTasks.filter((t) => t.status === s.value).length}
            filtersActive={filtersActive}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180 }}>
        {activeTask ? <TaskCard task={activeTask} overlay onOpen={() => undefined} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

const columnAccent: Record<TaskStatus, string> = {
  todo: 'bg-sage-400',
  in_progress: 'bg-terracotta-500',
  done: 'bg-forest-600',
}

function Column({ status, label, ids, taskById, onOpenTask, onAddTask, totalInColumn, filtersActive }: {
  status: TaskStatus
  label: string
  ids: string[]
  taskById: Map<string, Task>
  onOpenTask: (t: Task) => void
  onAddTask: () => void
  totalInColumn: number
  filtersActive: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <section
      aria-label={`${label} column`}
      className={cn(
        'flex min-h-72 w-[85vw] max-w-sm shrink-0 snap-center flex-col rounded-2xl border bg-sage-50/70 p-3 transition-colors sm:w-80 lg:w-auto lg:max-w-none',
        isOver ? 'border-forest-500 bg-forest-50 ring-2 ring-forest-500/25' : 'border-line',
      )}
    >
      <header className="mb-3 flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 font-sans text-sm font-semibold">
          <span className={cn('h-2.5 w-2.5 rounded-full', columnAccent[status])} aria-hidden />
          {label}
          <span className="rounded-full bg-paper px-2 py-0.5 text-xs font-medium text-ink-muted" aria-label={`${ids.length} tasks`}>
            {filtersActive ? `${ids.length}/${totalInColumn}` : ids.length}
          </span>
        </h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Add task to ${label}`} onClick={onAddTask}>
          <Plus className="h-4 w-4" />
        </Button>
      </header>

      <div ref={setNodeRef} className="flex flex-1 flex-col gap-2.5">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {ids.map((id) => {
            const task = taskById.get(id)
            return task ? <SortableTask key={id} task={task} onOpen={() => onOpenTask(task)} /> : null
          })}
        </SortableContext>
        {ids.length === 0 && (
          <div className={cn('flex flex-1 items-center justify-center rounded-xl border-2 border-dashed px-3 py-8 text-center text-xs', isOver ? 'border-forest-500 text-forest-700' : 'border-line-strong text-ink-muted')}>
            {filtersActive && totalInColumn > 0 ? 'No tasks match your filters' : isOver ? 'Drop here' : 'No tasks yet — drag one here or add a new one'}
          </div>
        )}
      </div>
    </section>
  )
}

function SortableTask({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('touch-manipulation', isDragging && 'opacity-40')}
    >
      <TaskCard task={task} onOpen={onOpen} dragProps={{ ...attributes, ...listeners }} />
    </div>
  )
}

function TaskCard({ task, onOpen, dragProps, overlay }: {
  task: Task
  onOpen: () => void
  dragProps?: Record<string, unknown>
  overlay?: boolean
}) {
  const overdue = isOverdue(task.dueDate, task.status)
  const { onKeyDown: dndKeyDown, ...restDrag } = (dragProps ?? {}) as { onKeyDown?: (e: React.KeyboardEvent) => void }
  return (
    <article
      {...restDrag}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onOpen()
          return
        }
        dndKeyDown?.(e)
      }}
      aria-label={`${task.title}. ${task.priority} priority${task.dueDate ? `, due ${formatDay(task.dueDate)}` : ''}${overdue ? ', overdue' : ''}`}
      className={cn(
        'group cursor-grab rounded-xl border border-line bg-paper p-3 shadow-soft transition-shadow hover:shadow-lift focus-visible:outline-2 active:cursor-grabbing',
        overlay && 'rotate-1 cursor-grabbing shadow-lift ring-2 ring-forest-500/40',
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-line-strong group-hover:text-ink-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-medium leading-snug">{task.title}</p>
          {task.description && <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{task.description}</p>}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <PriorityBadge priority={task.priority} />
            {task.dueDate && (
              <span className={cn('inline-flex items-center gap-1 text-xs', overdue ? 'font-semibold text-terracotta-600' : 'text-ink-muted')}>
                <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {formatDay(task.dueDate, 'MMM d')}
                {overdue && <span className="sr-only"> (overdue)</span>}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
