import { z } from "zod";

export const eventSchema = z.object({
  id: z.string(),
  summary: z.string(),
  start: z.string(),
  end: z.string(),
  isAllDay: z.boolean(),
  location: z.string().optional(),
  priority: z.number(),
  isNext: z.boolean(),
});

export const propSchema = z.object({
  date: z.string().describe("ISO date string"),
  events: z.array(eventSchema),
});

export type CalendarEventProps = z.infer<typeof eventSchema>;
export type TodayScheduleProps = z.infer<typeof propSchema>;
