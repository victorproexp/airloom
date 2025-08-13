import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type ItemDefinition = {
  id: string
  name: string
  emoji: string
  color?: string
}

export type ItemInstance = {
  id: string
  defId: string
  label?: string
  notes?: string
  createdAt: number
}

export type StorageUnit = {
  id: string
  name: string
  rows: number
  cols: number
  slots: (string | null)[][]
}

export type ItemLocation =
  | { type: 'inventory' }
  | { type: 'slot'; unitId: string; r: number; c: number }

function createEmptyGrid(rows: number, cols: number): (string | null)[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null))
}

interface AppState {
  itemDefinitions: Record<string, ItemDefinition>
  itemInstances: Record<string, ItemInstance>
  units: Record<string, StorageUnit>
  unitOrder: string[]

  addUnit: (name: string, rows: number, cols: number) => string
  renameUnit: (unitId: string, name: string) => void
  deleteUnit: (unitId: string) => void

  addDefinition: (name: string, emoji: string, color?: string) => string
  createItem: (defId: string, label?: string) => string
  deleteItem: (itemId: string) => void

  placeItem: (itemId: string, unitId: string, r: number, c: number) => void
  removeItemFromSlot: (unitId: string, r: number, c: number) => void

  findItemLocation: (itemId: string) => ItemLocation
  getInventoryItemIds: () => string[]
}

const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      itemDefinitions: {},
      itemInstances: {},
      units: {},
      unitOrder: [],

      addUnit: (name, rows, cols) => {
        const id = nanoid()
        const unit: StorageUnit = { id, name, rows, cols, slots: createEmptyGrid(rows, cols) }
        set(state => ({
          units: { ...state.units, [id]: unit },
          unitOrder: [...state.unitOrder, id],
        }))
        return id
      },

      renameUnit: (unitId, name) => {
        set(state => ({ units: { ...state.units, [unitId]: { ...state.units[unitId], name } } }))
      },

      deleteUnit: (unitId) => {
        set(state => {
          const nextUnits = { ...state.units }
          delete nextUnits[unitId]
          const nextOrder = state.unitOrder.filter(id => id !== unitId)
          return { units: nextUnits, unitOrder: nextOrder }
        })
      },

      addDefinition: (name, emoji, color) => {
        const id = nanoid()
        const def: ItemDefinition = { id, name, emoji, color }
        set(state => ({ itemDefinitions: { ...state.itemDefinitions, [id]: def } }))
        return id
      },

      createItem: (defId, label) => {
        const id = nanoid()
        const inst: ItemInstance = { id, defId, label, createdAt: Date.now() }
        set(state => ({ itemInstances: { ...state.itemInstances, [id]: inst } }))
        return id
      },

      deleteItem: (itemId) => {
        // Remove from slots if present
        const loc = get().findItemLocation(itemId)
        if (loc.type === 'slot') {
          get().removeItemFromSlot(loc.unitId, loc.r, loc.c)
        }
        set(state => {
          const next = { ...state.itemInstances }
          delete next[itemId]
          return { itemInstances: next }
        })
      },

      placeItem: (itemId, unitId, r, c) => {
        set(state => {
          const unit = state.units[unitId]
          if (!unit) return {}

          const nextUnits = { ...state.units }

          // Remove from old location if exists
          const currentLoc = get().findItemLocation(itemId)
          if (currentLoc.type === 'slot') {
            const fromUnit = nextUnits[currentLoc.unitId]
            if (fromUnit) {
              const nextFromSlots = fromUnit.slots.map(row => row.slice())
              nextFromSlots[currentLoc.r][currentLoc.c] = null
              nextUnits[currentLoc.unitId] = { ...fromUnit, slots: nextFromSlots }
            }
          }

          // Place into target slot
          const toUnit = nextUnits[unitId] || unit
          const toSlots = toUnit.slots.map(row => row.slice())
          toSlots[r][c] = itemId
          nextUnits[unitId] = { ...toUnit, slots: toSlots }

          return { units: nextUnits }
        })
      },

      removeItemFromSlot: (unitId, r, c) => {
        set(state => {
          const unit = state.units[unitId]
          if (!unit) return {}
          const nextSlots = unit.slots.map(row => row.slice())
          nextSlots[r][c] = null
          return { units: { ...state.units, [unitId]: { ...unit, slots: nextSlots } } }
        })
      },

      findItemLocation: (itemId) => {
        const { units } = get()
        for (const unitId of Object.keys(units)) {
          const unit = units[unitId]
          for (let r = 0; r < unit.rows; r++) {
            for (let c = 0; c < unit.cols; c++) {
              if (unit.slots[r][c] === itemId) return { type: 'slot', unitId, r, c } as const
            }
          }
        }
        return { type: 'inventory' } as const
      },

      getInventoryItemIds: () => {
        const { itemInstances, units } = get()
        const placed = new Set<string>()
        Object.values(units).forEach(unit => {
          unit.slots.forEach(row => row.forEach(cell => { if (cell) placed.add(cell) }))
        })
        return Object.keys(itemInstances).filter(id => !placed.has(id))
      },
    }),
    {
      name: 'storage-quest-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (stateArg) => {
        // Seed demo data on first run
        if (!stateArg) return
        const s = stateArg
        const hasData = Object.keys(s.units).length > 0 || Object.keys(s.itemInstances).length > 0
        if (!hasData) {
          const defs: Array<[string,string]> = [
            ['Console', '🎮'],
            ['Book', '📚'],
            ['Hardware', '🧰'],
            ['Camera', '📷'],
            ['Game', '🕹️'],
          ]
          const defIds: Record<string, string> = {}
          defs.forEach(([name, emoji]) => {
            const id = nanoid()
            defIds[name] = id
            s.itemDefinitions[id] = { id, name, emoji }
          })

          const unitA: StorageUnit = { id: nanoid(), name: 'Shelf A', rows: 3, cols: 6, slots: createEmptyGrid(3, 6) }
          const unitB: StorageUnit = { id: nanoid(), name: 'Bin B', rows: 2, cols: 4, slots: createEmptyGrid(2, 4) }
          s.units[unitA.id] = unitA
          s.units[unitB.id] = unitB
          s.unitOrder.push(unitA.id, unitB.id)

          function addItem(defKey: string, label: string) {
            const id = nanoid()
            s.itemInstances[id] = { id, defId: defIds[defKey], label, createdAt: Date.now() }
            return id
          }

          const snes = addItem('Console', 'SNES')
          const n64 = addItem('Console', 'N64')
          const gamecube = addItem('Console', 'GameCube')
          const ps2 = addItem('Console', 'PS2')
          const cleanCode = addItem('Book', 'Clean Code')
          const rpi = addItem('Hardware', 'Raspberry Pi 4')

          s.units[unitA.id].slots[0][0] = snes
          s.units[unitA.id].slots[0][1] = n64
          s.units[unitA.id].slots[0][2] = gamecube
          s.units[unitA.id].slots[1][0] = ps2
          s.units[unitA.id].slots[2][0] = cleanCode
          s.units[unitB.id].slots[0][0] = rpi
        }
      },
    }
  )
)

export default useAppStore