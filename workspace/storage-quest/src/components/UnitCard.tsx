import { useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import useAppStore from '../store'
import DraggableItem from './DraggableItem'

export type UnitCardProps = {
  unitId: string
}

function Slot({ unitId, r, c, itemId }: { unitId: string; r: number; c: number; itemId: string | null }) {
  const droppableId = `slot:${unitId}:${r}:${c}`
  const { isOver, setNodeRef } = useDroppable({ id: droppableId, data: { unitId, r, c } })
  const className = isOver ? 'slot droppable-over' : itemId ? 'slot' : 'slot empty'
  return (
    <div ref={setNodeRef} className={className}>
      {itemId ? <DraggableItem itemId={itemId} /> : null}
    </div>
  )
}

export default function UnitCard({ unitId }: UnitCardProps) {
  const unit = useAppStore(s => s.units[unitId])
  const renameUnit = useAppStore(s => s.renameUnit)

  const gridStyle: React.CSSProperties = useMemo(() => ({
    gridTemplateColumns: `repeat(${unit?.cols ?? 0}, var(--tile-size))`,
  }), [unit])

  if (!unit) return null

  return (
    <div className="unit-card">
      <div className="unit-header">
        <div className="unit-name">{unit.name}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => {
            const name = prompt('Rename unit', unit.name)
            if (name) renameUnit(unitId, name)
          }}>Rename</button>
        </div>
      </div>
      <div className="unit-grid" style={gridStyle}>
        {Array.from({ length: unit.rows }).map((_, r) => (
          Array.from({ length: unit.cols }).map((__, c) => {
            const itemId = unit.slots[r][c]
            return <Slot key={`${r}:${c}`} unitId={unitId} r={r} c={c} itemId={itemId} />
          })
        ))}
      </div>
    </div>
  )
}