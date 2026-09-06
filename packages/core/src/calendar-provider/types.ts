export interface DateRange {
  start: Date
  end: Date
}

export interface BusyBlock {
  start: Date
  end: Date
  rawLabel: string | null
}

export interface NewEvent {
  title: string
  start: Date
  end: Date
}

export interface CreatedEvent {
  id: string
  title: string
  start: Date
  end: Date
}

export interface CalendarProvider {
  listBusyBlocks(calendarAccountId: string, range: DateRange): Promise<BusyBlock[]>
  listRawLabels(calendarAccountId: string): Promise<string[]>
  createEvent(calendarAccountId: string, event: NewEvent): Promise<CreatedEvent>
}
