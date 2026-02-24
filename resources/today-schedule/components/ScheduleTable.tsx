import React from "react";
import type { CalendarEventProps } from "../types";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const mins = Math.round((end.getTime() - start.getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function formatDateDisplay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ScheduleTableProps {
  date: string;
  events: CalendarEventProps[];
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({ date, events }) => {
  if (events.length === 0) {
    return (
      <div className="p-6 text-center text-secondary">
        <p className="text-lg font-medium">No events for today</p>
        <p className="text-sm mt-1">{formatDateDisplay(date)}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-default">
            <th className="py-3 px-4 text-xs font-medium uppercase tracking-wide text-secondary w-16">
              #
            </th>
            <th className="py-3 px-4 text-xs font-medium uppercase tracking-wide text-secondary w-24">
              Time
            </th>
            <th className="py-3 px-4 text-xs font-medium uppercase tracking-wide text-secondary">
              Event
            </th>
            <th className="py-3 px-4 text-xs font-medium uppercase tracking-wide text-secondary w-20">
              Duration
            </th>
            <th className="py-3 px-4 text-xs font-medium uppercase tracking-wide text-secondary hidden sm:table-cell">
              Location
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.id}
              className={`border-b border-default/50 transition-colors ${
                event.isNext
                  ? "bg-info/10 dark:bg-info/5"
                  : "hover:bg-default/5"
              }`}
            >
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                    event.isNext
                      ? "bg-info text-info-contrast"
                      : "bg-default/20 text-secondary"
                  }`}
                >
                  {event.priority}
                </span>
              </td>
              <td className="py-3 px-4 text-sm">
                {event.isAllDay ? (
                  <span className="text-secondary">All day</span>
                ) : (
                  formatTime(event.start)
                )}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-default">
                    {event.summary}
                  </span>
                  {event.isNext && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-info/20 text-info">
                      Next up
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-secondary">
                {event.isAllDay ? "—" : formatDuration(event.start, event.end)}
              </td>
              <td className="py-3 px-4 text-sm text-secondary hidden sm:table-cell">
                {event.location ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
