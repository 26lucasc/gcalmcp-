import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = join(__dirname, "..", "credentials.json");
const TOKEN_PATH = join(__dirname, "..", "token.json");

export type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  isAllDay: boolean;
  location?: string;
  priority: number;
  isNext: boolean;
};

export type TodayEventsResult = {
  events: CalendarEvent[];
  prioritized: CalendarEvent[];
  summary: string;
};

function loadFromFiles(): {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
} | null {
  if (!existsSync(CREDENTIALS_PATH) || !existsSync(TOKEN_PATH)) return null;
  try {
    const creds = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8"));
    const token = JSON.parse(readFileSync(TOKEN_PATH, "utf8"));
    const web = creds.web ?? creds.installed;
    if (!web?.client_id || !web?.client_secret || !token?.refresh_token)
      return null;
    return {
      clientId: web.client_id,
      clientSecret: web.client_secret,
      refreshToken: token.refresh_token,
    };
  } catch {
    return null;
  }
}

function trim(s: string | undefined): string {
  return (s ?? "").trim().replace(/^["']|["']$/g, "");
}

function getAuthClient() {
  let clientId = trim(process.env.GOOGLE_CLIENT_ID);
  let clientSecret = trim(process.env.GOOGLE_CLIENT_SECRET);
  let refreshToken = trim(process.env.GOOGLE_REFRESH_TOKEN);

  if (!clientId || !clientSecret || !refreshToken) {
    const fromFiles = loadFromFiles();
    if (!fromFiles) return null;
    clientId = fromFiles.clientId.trim();
    clientSecret = fromFiles.clientSecret.trim();
    refreshToken = fromFiles.refreshToken.trim();
  }

  // Use redirect_uri from credentials.json if available (Web vs Desktop)
  let redirectUri = "http://localhost:3000/oauth2callback";
  if (existsSync(CREDENTIALS_PATH)) {
    try {
      const creds = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8"));
      const web = creds.web ?? creds.installed;
      const uris = web?.redirect_uris;
      if (Array.isArray(uris) && uris[0]) redirectUri = uris[0];
      else if (creds.installed) redirectUri = "urn:ietf:wg:oauth:2.0:oob";
    } catch {
      // keep default
    }
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export function hasGoogleCredentials(): boolean {
  if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  ) {
    return true;
  }
  return loadFromFiles() !== null;
}

export async function getCalendarClient(): Promise<calendar_v3.Calendar | null> {
  const auth = getAuthClient();
  if (!auth) return null;

  const calendar = google.calendar({ version: "v3", auth });
  return calendar;
}

function parseEventStart(event: calendar_v3.Schema$Event): Date {
  const start = event.start?.dateTime ?? event.start?.date;
  return start ? new Date(start) : new Date(0);
}

export async function fetchTodayEvents(
  calendarId: string = "primary",
  includeAllDay: boolean = true
): Promise<TodayEventsResult> {
  const calendar = await getCalendarClient();
  if (!calendar) {
    throw new Error("Google Calendar not connected. Run get-refresh-token.js and set GOOGLE_REFRESH_TOKEN.");
  }

  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults: 100,
    singleEvents: true,
    orderBy: "startTime",
  });

  const items = response.data.items ?? [];
  const nowTime = now.getTime();

  const events: CalendarEvent[] = items
    .filter((e) => {
      if (!includeAllDay && !e.start?.dateTime) return false;
      return !!e.id && !!e.summary;
    })
    .map((e, index) => {
      const start = e.start?.dateTime ?? e.start?.date ?? "";
      const end = e.end?.dateTime ?? e.end?.date ?? "";
      const isAllDay = !!e.start?.date && !e.start?.dateTime;
      const startTime = parseEventStart(e).getTime();
      const endTime = end ? new Date(end).getTime() : startTime;
      const isNext = nowTime >= startTime - 60000 && nowTime <= endTime + 60000;

      return {
        id: e.id!,
        summary: e.summary ?? "(No title)",
        start,
        end,
        isAllDay,
        location: e.location ?? undefined,
        priority: index + 1,
        isNext,
      };
    });

  // Mark first upcoming as "next" if none is current
  if (!events.some((e) => e.isNext) && events.length > 0) {
    const firstUpcoming = events.find((e) => new Date(e.start).getTime() > nowTime);
    if (firstUpcoming) firstUpcoming.isNext = true;
  }

  const dateStr = timeMin.toISOString().slice(0, 10);
  const summary =
    events.length === 0
      ? `No events for ${dateStr}`
      : `${events.length} event(s) for ${dateStr}`;

  return {
    events,
    prioritized: [...events],
    summary,
  };
}
