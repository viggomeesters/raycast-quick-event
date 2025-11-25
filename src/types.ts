export interface CalendarEvent {
  id: string;
  eventTitle: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  validated: boolean;
  invitees: string[];
  recurrence?: string;
  recurrenceDescription?: string;
}
