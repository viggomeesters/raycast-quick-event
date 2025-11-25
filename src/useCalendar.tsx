import { randomId, showToast, ToastStyle } from '@raycast/api';
import { useState } from 'react';
import { CalendarEvent } from './types';
import { getEndDate, getStartDate } from './dates';
import osascript from 'osascript-tag';
import Sherlock from 'sherlockjs';

const emailRegex = /@?[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const normalizeInvitee = (value: string) => value.replace(/^@/, '').trim().toLowerCase();

const extractInviteesFromQuery = (query: string) => {
  let sanitizedQuery = query;
  const invitees: string[] = [];

  const withBlockMatch = query.match(/\bwith\b[\s,:-]*(.*)$/i);
  if (withBlockMatch && withBlockMatch.index !== undefined) {
    const blockText = withBlockMatch[0];
    const emailsInBlock = blockText.match(emailRegex) ?? [];

    if (emailsInBlock.length) {
      invitees.push(...emailsInBlock.map(normalizeInvitee));
      sanitizedQuery = query.slice(0, withBlockMatch.index).trim();
    }
  }

  if (invitees.length === 0) {
    const matches = query.match(emailRegex) ?? [];
    if (matches.length) {
      invitees.push(...matches.map(normalizeInvitee));
      matches.forEach((email) => {
        sanitizedQuery = sanitizedQuery.replace(email, '').trim();
      });
      sanitizedQuery = sanitizedQuery.replace(/\s{2,}/g, ' ').trim();
    }
  }

  return {
    invitees,
    sanitizedQuery,
  };
};

export const executeJxa = async (script: string) => {
  try {
    const result = await osascript.jxa({ parse: false })`${script}`;
    return result;
  } catch (err: unknown) {
    const normalizedError =
      err instanceof Error
        ? err
        : new Error(typeof err === 'string' ? err.replace('execution error: Error: ', '') : String(err));

    throw normalizedError;
  }
};

const extractRecurrenceFromQuery = (query: string) => {
  let sanitizedQuery = query;
  let recurrence: string | undefined;
  let description: string | undefined;

  const daysMap: Record<string, string> = {
    mon: 'MO', monday: 'MO',
    tue: 'TU', tuesday: 'TU',
    wed: 'WE', wednesday: 'WE',
    thu: 'TH', thursday: 'TH',
    fri: 'FR', friday: 'FR',
    sat: 'SA', saturday: 'SA',
    sun: 'SU', sunday: 'SU'
  };

  // Check for specific days pattern: "every Mon, Tue and Fri"
  const daysPattern = /\bevery\s+((?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*,?\s*(?:and\s+)?)+)\b/i;
  const daysMatch = query.match(daysPattern);

  if (daysMatch) {
    const daysString = daysMatch[1];
    const days = daysString.toLowerCase().split(/[\s,]+/).filter(d => d !== 'and' && d.length > 0);
    const byDay = days.map(d => {
      for (const key in daysMap) {
        if (d.startsWith(key)) return daysMap[key];
      }
      return null;
    }).filter(Boolean);

    if (byDay.length > 0) {
      recurrence = `FREQ=WEEKLY;INTERVAL=1;BYDAY=${byDay.join(',')}`;
      description = `Every ${days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}`;
      sanitizedQuery = sanitizedQuery.replace(daysPattern, '').trim();
      return { recurrence, description, sanitizedQuery };
    }
  }

  const patterns = [
    { regex: /\bevery\s+(\d+)\s+days?\b/i, freq: 'DAILY', unit: 'day' },
    { regex: /\bevery\s+(\d+)\s+weeks?\b/i, freq: 'WEEKLY', unit: 'week' },
    { regex: /\bevery\s+(\d+)\s+months?\b/i, freq: 'MONTHLY', unit: 'month' },
    { regex: /\bevery\s+(\d+)\s+years?\b/i, freq: 'YEARLY', unit: 'year' },
    { regex: /\bevery\s+day\b/i, freq: 'DAILY', interval: 1, desc: 'Daily' },
    { regex: /\bdaily\b/i, freq: 'DAILY', interval: 1, desc: 'Daily' },
    { regex: /\bevery\s+week\b/i, freq: 'WEEKLY', interval: 1, desc: 'Weekly' },
    { regex: /\bweekly\b/i, freq: 'WEEKLY', interval: 1, desc: 'Weekly' },
    { regex: /\bevery\s+month\b/i, freq: 'MONTHLY', interval: 1, desc: 'Monthly' },
    { regex: /\bmonthly\b/i, freq: 'MONTHLY', interval: 1, desc: 'Monthly' },
    { regex: /\bevery\s+year\b/i, freq: 'YEARLY', interval: 1, desc: 'Yearly' },
    { regex: /\byearly\b/i, freq: 'YEARLY', interval: 1, desc: 'Yearly' },
  ];

  for (const pattern of patterns) {
    const match = sanitizedQuery.match(pattern.regex);
    if (match) {
      const interval = pattern.interval || parseInt(match[1], 10);
      recurrence = `FREQ=${pattern.freq};INTERVAL=${interval}`;
      
      if (pattern.desc) {
        description = pattern.desc;
      } else {
        description = `Every ${interval} ${pattern.unit}s`;
      }
      
      sanitizedQuery = sanitizedQuery.replace(pattern.regex, '').trim();
      break;
    }
  }

  return {
    recurrence,
    description,
    sanitizedQuery,
  };
};

export const parseEvent = (query: string): CalendarEvent | null => {
  const { sanitizedQuery: queryWithoutInvitees, invitees } = extractInviteesFromQuery(query);
  const { sanitizedQuery, recurrence, description } = extractRecurrenceFromQuery(queryWithoutInvitees);

  if (sanitizedQuery.length === 0) {
    return null;
  }

  const parsedEvent = Sherlock.parse(sanitizedQuery);
  const fallbackTitle = sanitizedQuery || 'New Event';

  const event: CalendarEvent = {
    ...parsedEvent,
    id: randomId(),
    invitees,
    recurrence,
    recurrenceDescription: description,
    eventTitle: parsedEvent.eventTitle?.trim() || fallbackTitle,
  };

  if (!event.startDate) {
    event.startDate = getStartDate();
  }

  if (!event.endDate) {
    event.endDate = getEndDate(event.startDate);
  }

  return event;
};

export function useCalendar() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<CalendarEvent[]>([]);
  const [calendarText, setCalendarText] = useState('');

  async function parse(query: string) {
    try {
      setIsLoading(true);
      setCalendarText(query);

      const event = parseEvent(query);

      if (!event) {
        setResults([]);
      } else {
        setResults([event]);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('error', error);
      showToast(ToastStyle.Failure, 'Could not parse event', String(error));
    }
  }

  return {
    isLoading,
    results,
    calendarText,
    parse,
  };
}
