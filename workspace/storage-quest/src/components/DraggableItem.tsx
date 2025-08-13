import { useMemo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import useAppStore from '../store'

export type DraggableItemProps = {
  itemId: string
}

export default function DraggableItem({ itemId }: DraggableItemProps) {
  const item = useAppStore(s => s.itemInstances[itemId])
  const def = useAppStore(s => (item ? s.itemDefinitions[item.defId] : undefined))

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `item:${itemId}`,
    data: { itemId },
  })

  const style: React.CSSProperties = useMemo(() => ({
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.6 : 1,
  }), [transform, isDragging])

  if (!item || !def) return null

  return (
    <div ref={setNodeRef} style={style} className="item" {...listeners} {...attributes}>
      <div className="item-emoji" aria-hidden>{def.emoji}</div>
      {item.label ? <div className="item-label">{item.label}</div> : null}
    </div>
  )
}