import type { BusyBlock } from '../calendar-provider/types'

export interface ViewableBlock {
  start: Date
  end: Date
  label: string | null
}

interface MappingWithCategory {
  rawLabel: string
  categoryId: string
  category: { name: string }
}

interface VisibilitySetting {
  categoryId: string
  displayMode: 'CATEGORY_NAME' | 'BUSY_ONLY' | 'HIDDEN'
}

export function filterEventsForViewer(
  events: BusyBlock[],
  mappings: MappingWithCategory[],
  visibility: VisibilitySetting[],
): ViewableBlock[] {
  const mappingByLabel = new Map(mappings.map((m) => [m.rawLabel, m]))
  const visibilityByCategoryId = new Map(visibility.map((v) => [v.categoryId, v.displayMode]))

  const result: ViewableBlock[] = []

  for (const event of events) {
    const mapping = event.rawLabel ? mappingByLabel.get(event.rawLabel) : null

    if (!mapping) {
      result.push({ start: event.start, end: event.end, label: 'Busy' })
      continue
    }

    const displayMode = visibilityByCategoryId.get(mapping.categoryId) ?? 'CATEGORY_NAME'

    if (displayMode === 'HIDDEN') continue

    const label = displayMode === 'BUSY_ONLY' ? 'Busy' : mapping.category.name

    result.push({ start: event.start, end: event.end, label })
  }

  return result
}
