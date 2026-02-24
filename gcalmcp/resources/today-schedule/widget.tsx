import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";
import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import React from "react";
import { Link } from "react-router";
import "../styles.css";
import { ScheduleTable } from "./components/ScheduleTable";
import type { TodayScheduleProps } from "./types";
import { propSchema } from "./types";
import { Button } from "@openai/apps-sdk-ui/components/Button";

export const widgetMetadata: WidgetMetadata = {
  description: "Display today's Google Calendar schedule as a prioritized table",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Loading today's schedule...",
    invoked: "Schedule loaded",
  },
};

function formatDateHeader(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const TodaySchedule: React.FC = () => {
  const { props, isPending, sendFollowUpMessage } =
    useWidget<TodayScheduleProps>();

  if (isPending) {
    return (
      <McpUseProvider>
        <div className="relative bg-surface-elevated border border-default rounded-3xl">
          <div className="p-8 pb-4">
            <h5 className="text-secondary mb-1">Google Calendar</h5>
            <h2 className="heading-xl mb-3">Today's Schedule</h2>
            <div className="h-5 w-48 rounded-md bg-default/10 animate-pulse" />
          </div>
          <div className="px-8 pb-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-default/10 animate-pulse"
              />
            ))}
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const { date, events } = props;

  return (
    <McpUseProvider>
      <AppsSDKUIProvider linkComponent={Link}>
        <div className="relative bg-surface-elevated border border-default rounded-3xl">
          <div className="p-8 pb-4">
            <h5 className="text-secondary mb-1">Google Calendar</h5>
            <h2 className="heading-xl mb-1">Today&apos;s Schedule</h2>
            <p className="text-md text-secondary">{formatDateHeader(date)}</p>
          </div>

          <ScheduleTable date={date} events={events} />

          {events.length > 0 && (
            <div className="p-6 pt-4 border-t border-default/50">
              <Button
                color="secondary"
                variant="outline"
                size="md"
                onClick={() =>
                  sendFollowUpMessage("What should I do first today?")
                }
              >
                Ask: What should I do first?
              </Button>
            </div>
          )}
        </div>
      </AppsSDKUIProvider>
    </McpUseProvider>
  );
};

export default TodaySchedule;
