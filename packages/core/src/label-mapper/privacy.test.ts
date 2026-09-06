import { describe, expect, it } from 'vitest'
import { filterEventsForViewer } from './privacy'
import type { BusyBlock } from '../calendar-provider/types'

function block(rawLabel: string | null): BusyBlock {
  return { start: new Date('2026-09-06T09:00:00'), end: new Date('2026-09-06T10:00:00'), rawLabel }
}

function mapping(rawLabel: string, categoryId: string) {
  return { rawLabel, categoryId, category: { name: categoryId } } as any
}

function visibility(categoryId: string, displayMode: 'CATEGORY_NAME' | 'BUSY_ONLY' | 'HIDDEN') {
  return { categoryId, displayMode } as any
}

describe('filterEventsForViewer', () => {
  it('shows category name when displayMode is CATEGORY_NAME', () => {
    const events = [block('Gym')]
    const mappings = [mapping('Gym', 'health')]
    const vis = [visibility('health', 'CATEGORY_NAME')]
    const result = filterEventsForViewer(events, mappings, vis)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('health')
  })

  it('shows "Busy" when displayMode is BUSY_ONLY', () => {
    const events = [block('Gym')]
    const mappings = [mapping('Gym', 'health')]
    const vis = [visibility('health', 'BUSY_ONLY')]
    const result = filterEventsForViewer(events, mappings, vis)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Busy')
  })

  it('omits events when displayMode is HIDDEN', () => {
    const events = [block('Gym')]
    const mappings = [mapping('Gym', 'health')]
    const vis = [visibility('health', 'HIDDEN')]
    const result = filterEventsForViewer(events, mappings, vis)
    expect(result).toHaveLength(0)
  })

  it('defaults to CATEGORY_NAME when no visibility row exists', () => {
    const events = [block('Gym')]
    const mappings = [mapping('Gym', 'health')]
    const result = filterEventsForViewer(events, mappings, [])
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('health')
  })

  it('shows "Busy" for events with no rawLabel', () => {
    const events = [block(null)]
    const result = filterEventsForViewer(events, [], [])
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Busy')
  })

  it('preserves start and end times', () => {
    const events = [block('Gym')]
    const mappings = [mapping('Gym', 'health')]
    const result = filterEventsForViewer(events, mappings, [])
    expect(result[0].start).toEqual(new Date('2026-09-06T09:00:00'))
    expect(result[0].end).toEqual(new Date('2026-09-06T10:00:00'))
  })
})
