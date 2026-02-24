import {
  MCPServer,
  error,
  markdown,
  object,
  text,
  widget,
} from "mcp-use/server";
import { z } from "zod";
import {
  fetchTodayEvents,
  hasGoogleCredentials,
} from "./lib/google-calendar.js";

const server = new MCPServer({
  name: "gcalmcp",
  title: "Google Calendar MCP",
  version: "1.0.0",
  description:
    "Connect to Google Calendar to see today's tasks, priorities, and schedule",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://mcp-use.com",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

// --- Tools ---

server.tool(
  {
    name: "get-todays-events",
    description:
      "Fetch today's calendar events from Google Calendar. Returns structured data with priorities and 'next up' indicator.",
    schema: z.object({
      calendarId: z
        .string()
        .optional()
        .default("primary")
        .describe("Calendar ID (default: primary)"),
      includeAllDay: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include all-day events"),
    }),
  },
  async ({ calendarId, includeAllDay }) => {
    if (!hasGoogleCredentials()) {
      return error(
        "Google Calendar not connected. Run get-refresh-token.js and set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN."
      );
    }
    try {
      const result = await fetchTodayEvents(calendarId, includeAllDay);
      return object({
        events: result.events,
        prioritized: result.prioritized,
        summary: result.summary,
      });
    } catch (err) {
      return error(
        `Failed to fetch calendar: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }
);

server.tool(
  {
    name: "get-todays-schedule",
    description:
      "Get today's calendar schedule and display it in a visual table. Use when the user asks what to do today, what's on the schedule, or wants to see their day.",
    schema: z.object({
      calendarId: z
        .string()
        .optional()
        .default("primary")
        .describe("Calendar ID (default: primary)"),
      includeAllDay: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include all-day events"),
    }),
    widget: {
      name: "today-schedule",
      invoking: "Loading today's schedule...",
      invoked: "Schedule loaded",
    },
  },
  async ({ calendarId, includeAllDay }) => {
    if (!hasGoogleCredentials()) {
      return error(
        "Google Calendar not connected. Run get-refresh-token.js and set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN."
      );
    }
    try {
      const result = await fetchTodayEvents(calendarId, includeAllDay);
      const now = new Date();
      const date = now.toISOString().slice(0, 10);
      return widget({
        props: { date, events: result.events },
        output: text(result.summary),
      });
    } catch (err) {
      return error(
        `Failed to fetch calendar: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }
);

// --- Prompts ---

server.prompt(
  {
    name: "what-to-do-today",
    description:
      "What is there to do today? Summarizes and prioritizes today's calendar events.",
    schema: z.object({
      focusArea: z
        .string()
        .optional()
        .describe("Optional focus area (e.g., 'work', 'personal')"),
    }),
  },
  async () => {
    return markdown(`First, call the **get-todays-events** or **get-todays-schedule** tool to fetch the user's calendar events for today.

Then, based on the events returned:
1. Summarize what they have scheduled
2. List events in priority/chronological order
3. Highlight the "next up" event if applicable
4. If no events, suggest they might have a free day or ask if they want to add something`);
  }
);

server.prompt(
  {
    name: "how-to-plan-day",
    description:
      "How should I do things? Suggests order, time blocks, and pacing for today's schedule.",
    schema: z.object({
      focusArea: z
        .string()
        .optional()
        .describe("Optional focus area for planning advice"),
    }),
  },
  async () => {
    return markdown(`First, call the **get-todays-events** or **get-todays-schedule** tool to fetch today's calendar events.

Then, provide actionable planning advice:
1. Suggest an order for tackling tasks (consider time, duration, and dependencies)
2. Identify potential time blocks or focus windows
3. Recommend breaks or buffer time between back-to-back meetings
4. Note any conflicts or tight scheduling`);
  }
);

server.prompt(
  {
    name: "what-to-do-first",
    description:
      "What should I do first? Identifies the single next or most important task for today.",
    schema: z.object({
      focusArea: z
        .string()
        .optional()
        .describe("Optional focus area to narrow the suggestion"),
    }),
  },
  async () => {
    return markdown(`First, call the **get-todays-events** or **get-todays-schedule** tool to fetch today's calendar events.

Then, identify the ONE thing they should do first:
1. If there's an event marked "next up" or starting soon, that's the answer
2. Otherwise, pick the soonest or highest-priority event
3. Give a clear, actionable recommendation: "You should do X first"`);
  }
);

server.listen().then(() => {
  console.log(`Server running`);
});
