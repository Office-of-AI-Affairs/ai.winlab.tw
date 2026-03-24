"use client";

import { useEffect, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

type EventOption = {
  id: string;
  name: string;
  status: string;
};

type EventVendorPickerProps = {
  selectedEventIds: string[];
  onChange: (ids: string[]) => void;
};

export function EventVendorPicker({
  selectedEventIds,
  onChange,
}: EventVendorPickerProps) {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("events")
      .select("id, name, status")
      .order("name")
      .then(({ data }) => {
        setEvents((data as EventOption[]) ?? []);
        setLoading(false);
      });
  }, []);

  function toggle(id: string) {
    if (selectedEventIds.includes(id)) {
      onChange(selectedEventIds.filter((x) => x !== id));
    } else {
      onChange([...selectedEventIds, id]);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">尚無活動資料</p>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div key={event.id} className="flex items-center gap-2">
          <Checkbox
            id={`event-${event.id}`}
            checked={selectedEventIds.includes(event.id)}
            onCheckedChange={() => toggle(event.id)}
          />
          <Label
            htmlFor={`event-${event.id}`}
            className="flex items-center gap-2 cursor-pointer font-normal"
          >
            <span>{event.name}</span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                event.status === "published"
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {event.status === "published" ? "published" : "draft"}
            </span>
          </Label>
        </div>
      ))}
    </div>
  );
}
