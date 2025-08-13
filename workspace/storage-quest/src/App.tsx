import { useState } from 'react'
import { DndContext, DragOverlay, useDroppable } from '@dnd-kit/core'
import useAppStore from './store'
import DraggableItem from './components/DraggableItem'
import UnitCard from './components/UnitCard'
import './App.css'

function Inventory() {
  const inventoryIds = useAppStore(s => s.getInventoryItemIds())
  const { isOver, setNodeRef } = useDroppable({ id: 'inventory' })
  const className = isOver ? 'panel inventory droppable-over' : 'panel inventory'

  return (
    <div ref={setNodeRef} className={className}>
      {inventoryIds.map(id => <DraggableItem key={id} itemId={id} />)}
    </div>
  )
}

function QuickAdd() {
  const defs = useAppStore(s => Object.values(s.itemDefinitions))
  const createItem = useAppStore(s => s.createItem)

  return (
    <div className="panel">
      <div className="section-title">Quick add</div>
      <div className="quick-defs">
        {defs.map(d => (
          <button key={d.id} className="def-btn" onClick={() => createItem(d.id)}>
            <span style={{ fontSize: 22 }} aria-hidden>{d.emoji}</span>
            <span>{d.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function NewDefinitionForm() {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🎮')
  const addDefinition = useAppStore(s => s.addDefinition)

  return (
    <div className="panel">
      <div className="section-title">New category</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px auto', gap: 8 }}>
        <input placeholder="Name (e.g., Console)" value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="Emoji" value={emoji} onChange={e => setEmoji(e.target.value)} />
        <button onClick={() => { if (!name.trim()) return; addDefinition(name.trim(), emoji || '🎮'); setName(''); }}>Add</button>
      </div>
      <div className="helper" style={{ marginTop: 8 }}>Use any emoji as a placeholder sprite. You can swap for pixel art later.</div>
    </div>
  )
}

export default function App() {
  const unitIds = useAppStore(s => s.unitOrder)
  const addUnit = useAppStore(s => s.addUnit)
  const placeItem = useAppStore(s => s.placeItem)
  const removeItemFromSlot = useAppStore(s => s.removeItemFromSlot)
  const findItemLocation = useAppStore(s => s.findItemLocation)

  const [activeItemId, setActiveItemId] = useState<string | null>(null)

  return (
    <div>
      <div className="topbar">
        <div className="title">Storage Quest</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => addUnit(`New Unit`, 3, 6)}>+ Unit</button>
        </div>
      </div>

      <DndContext
        onDragStart={(e) => {
          const data = e.active?.data?.current as any
          setActiveItemId(data?.itemId || null)
        }}
        onDragEnd={(e) => {
          const data = e.active?.data?.current as any
          const itemId: string | undefined = data?.itemId
          const overId = e.over?.id as string | undefined
          setActiveItemId(null)
          if (!itemId) return

          if (!overId) return
          if (overId === 'inventory') {
            const loc = findItemLocation(itemId)
            if (loc.type === 'slot') removeItemFromSlot(loc.unitId, loc.r, loc.c)
            return
          }

          if (overId.startsWith('slot:')) {
            const [, unitId, rStr, cStr] = overId.split(':')
            const r = Number(rStr)
            const c = Number(cStr)
            if (!Number.isNaN(r) && !Number.isNaN(c)) {
              placeItem(itemId, unitId, r, c)
            }
          }
        }}
      >
        <div className="layout container">
          <div style={{ display: 'grid', gap: 12 }}>
            <QuickAdd />
            <NewDefinitionForm />
            <div className="panel">
              <div className="section-title">Inventory</div>
              <Inventory />
            </div>
          </div>

          <div className="panel">
            <div className="section-title">Your storage units</div>
            <div className="units-scroll">
              <div className="units">
                {unitIds.map(id => <UnitCard key={id} unitId={id} />)}
              </div>
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeItemId ? <DraggableItem itemId={activeItemId} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
