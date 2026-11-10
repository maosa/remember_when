'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { addTag, removeTag, reorderTags } from '../actions'

type Tag = { id: string; tag: string }

interface Props {
  momentId: string
  tags: Tag[]
  canEdit: boolean
}

export function TagsSection({ momentId, tags, canEdit }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Local mirror of the server-provided order so drags feel instant. Re-synced
  // whenever the server order changes (revalidation is authoritative) using the
  // "adjust state during render" pattern rather than an effect. The signature
  // encodes id + order, so an optimistic reorder (which leaves the prop order
  // unchanged until revalidation) doesn't clobber the in-progress local state.
  const [order, setOrder] = useState<Tag[]>(tags)
  const signature = tags.map((t) => `${t.id}:${t.tag}`).join(',')
  const [prevSignature, setPrevSignature] = useState(signature)
  if (signature !== prevSignature) {
    setPrevSignature(signature)
    setOrder(tags)
  }

  const sensors = useSensors(
    // A small activation distance so a click on a pill / its remove button
    // isn't swallowed as a drag start.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Screen-reader announcements in tag names and positions. dnd-kit's defaults
  // read out the raw tag IDs (UUIDs).
  const tagName = (id: string | number) => order.find((t) => t.id === id)?.tag ?? 'tag'
  const position = (id: string | number) => `${order.findIndex((t) => t.id === id) + 1} of ${order.length}`
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up tag ${tagName(active.id)}, position ${position(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `Tag ${tagName(active.id)} is over position ${position(over.id)}.` : `Tag ${tagName(active.id)} is no longer over a position.`,
    onDragEnd: ({ active, over }) =>
      over ? `Tag ${tagName(active.id)} dropped at position ${position(over.id)}.` : `Tag ${tagName(active.id)} dropped.`,
    onDragCancel: ({ active }) => `Reordering cancelled. Tag ${tagName(active.id)} returned to position ${position(active.id)}.`,
  }

  function showError(msg: string) {
    if (errorTimer.current) clearTimeout(errorTimer.current)
    setError(msg)
    errorTimer.current = setTimeout(() => setError(null), 2500)
  }

  function handleAddTag(raw: string) {
    const t = raw.trim().toLowerCase()
    if (!t) return
    if (order.some((existing) => existing.tag === t)) {
      showError('This tag has already been added.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await addTag(momentId, t)
      if (res.error) showError(res.error)
      else setInput('')
    })
  }

  function handleRemoveTag(tagId: string) {
    startTransition(async () => {
      await removeTag(momentId, tagId)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const value = input
      setInput('') // clear before async so onBlur doesn't re-submit
      handleAddTag(value)
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return

    const oldIndex = order.findIndex((t) => t.id === active.id)
    const newIndex = order.findIndex((t) => t.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const next = arrayMove(order, oldIndex, newIndex)
    setOrder(next) // optimistic
    startTransition(async () => {
      const res = await reorderTags(momentId, next.map((t) => t.id))
      if (res.error) {
        showError(res.error)
        router.refresh() // fall back to server truth
      }
    })
  }

  if (order.length === 0 && !canEdit) return null

  const sortable = canEdit && order.length > 1

  return (
    <section className="mx-auto max-w-[720px] px-4 md:px-6 py-3 border-b border-rw-border-subtle space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {sortable ? (
          <DndContext
            id="moment-tags-sortable"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            accessibility={{
              announcements,
              screenReaderInstructions: {
                draggable: 'To reorder, press Space or Enter to pick up the tag, use the arrow keys to move it, then press Space or Enter to drop it, or Escape to cancel.',
              },
            }}
          >
            <SortableContext items={order.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
              {order.map((t) => (
                <SortableTag
                  key={t.id}
                  tag={t}
                  disabled={isPending}
                  onRemove={() => handleRemoveTag(t.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          order.map((t) => (
            <Badge key={t.id} variant="default" className="h-6 gap-1 pl-2 pr-1.5">
              {t.tag}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t.id)}
                  disabled={isPending}
                  className="text-rw-accent/70 hover:text-rw-accent transition-colors"
                  aria-label={`Remove tag ${t.tag}`}
                >
                  <X className="size-2.5" />
                </button>
              )}
            </Badge>
          ))
        )}

        {canEdit && (
          <div className="flex items-center gap-1">
            <input
              value={input}
              onChange={(e) => { setInput(e.target.value.slice(0, 20)); setError(null) }}
              onKeyDown={handleKeyDown}
              onBlur={() => handleAddTag(input)}
              placeholder="Add tag…"
              className="h-6 w-24 rounded-md border border-dashed border-rw-border bg-transparent px-2 text-base md:text-xs outline-none placeholder:text-rw-text-placeholder/60 focus:border-rw-accent"
              disabled={isPending}
            />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-rw-danger">{error}</p>}
    </section>
  )
}

interface SortableTagProps {
  tag: Tag
  disabled: boolean
  onRemove: () => void
}

function SortableTag({ tag, disabled, onRemove }: SortableTagProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tag.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1 : undefined,
  }

  // The chip is a plain container with two sibling controls: the drag handle
  // (tag text, carrying dnd-kit's role="button"/tabIndex/listeners) and the
  // remove button. Nesting the remove button inside the draggable element made
  // it a button-inside-a-button for screen readers and AI agents. The padding
  // lives on the children so the chip looks and drags exactly as before, and
  // the chip shows a focus ring when its handle has keyboard focus.
  return (
    <Badge
      ref={setNodeRef}
      style={style}
      variant="default"
      className="h-6 gap-0 px-0 py-0 has-[[data-drag-handle]:focus-visible]:ring-2 has-[[data-drag-handle]:focus-visible]:ring-rw-accent"
    >
      <span
        data-drag-handle=""
        {...attributes}
        {...listeners}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        className="flex h-full items-center pl-2 pr-1 rounded-l-rw-pill touch-none select-none outline-none"
      >
        {tag.tag}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="flex h-full items-center pr-1.5 rounded-r-rw-pill text-rw-accent/70 hover:text-rw-accent transition-colors cursor-pointer"
        aria-label={`Remove tag ${tag.tag}`}
      >
        <X className="size-2.5" />
      </button>
    </Badge>
  )
}
