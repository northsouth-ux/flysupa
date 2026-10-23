"use client";

import * as React from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale"; // Import Italian locale
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DatePicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (val: string) => void;
}) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );

  const handleSelect = (selectedDate?: Date) => {
    setDate(selectedDate);
    if (selectedDate) {
      onChange(selectedDate.toISOString().split("T")[0]); // Format as YYYY-MM-DD
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "border-slate-200 w-full justify-start text-left font-normal text-sm",
            !date && "text-muted-foreground"
          )}>
          <CalendarIcon />
          {date ? (
            format(date, "dd/MM/yyyy", { locale: it })
          ) : (
            <span>Pick a date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
