/**
 * Google Calendar API v3 client helper (client-side Bearer token from in-memory Firebase OAuth).
 * Every mutating call MUST be preceded by explicit user confirmation in the UI.
 */

import type { DailyPlanItem } from '../../packages/shared/schemas';

export interface CalendarEventSummary {
  id: string;
  summary: string;
  start: string;
  htmlLink?: string;
}

export async function listUpcomingCalendarEvents(
  accessToken: string
): Promise<CalendarEventSummary[]> {
  const nowIso = new Date().toISOString();
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
    `?timeMin=${encodeURIComponent(nowIso)}&maxResults=5&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Calendar API returned HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    items?: Array<{
      id?: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      htmlLink?: string;
    }>;
  };
  return (data.items ?? []).map((item) => ({
    id: item.id ?? crypto.randomUUID(),
    summary: item.summary ?? 'Untitled Event',
    start: item.start?.dateTime ?? item.start?.date ?? '',
    htmlLink: item.htmlLink,
  }));
}

function parseWindowToTodayIso(timeWindow: string): { startIso: string; endIso: string } {
  const today = new Date();
  const match = timeWindow.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  let startHour = 17;
  let startMin = 0;
  if (match) {
    startHour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === 'PM') startHour += 12;
    startMin = Number(match[2] ?? 0);
  }
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    startHour,
    startMin,
    0
  );
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export async function createPlanEventInCalendar(
  accessToken: string,
  city: string,
  item: DailyPlanItem
): Promise<CalendarEventSummary> {
  const { startIso, endIso } = parseWindowToTodayIso(item.timeWindow);
  const body = {
    summary: `AirNest (${city}): ${item.title}`,
    description: `${item.detail}\n\nImpact Estimate: ${item.impactSummary}\nInversion Context: ${item.inversionNote}`,
    start: { dateTime: startIso },
    end: { dateTime: endIso },
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Could not create calendar event (HTTP ${res.status})`);
  }

  const created = (await res.json()) as {
    id?: string;
    summary?: string;
    start?: { dateTime?: string };
    htmlLink?: string;
  };
  return {
    id: created.id ?? 'created',
    summary: created.summary ?? body.summary,
    start: created.start?.dateTime ?? startIso,
    htmlLink: created.htmlLink,
  };
}
