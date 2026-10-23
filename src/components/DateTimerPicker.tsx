"use client";

import * as React from "react";
import { useEffect } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "../services/supabaseClient.tsx";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface DateTimePickerProps {
  id?: string;
  lessonId?: string;
  date?: Date;
  setDate?: (date: Date) => void;
  onDateTimeSelect?: (date: Date) => void;
}

/**
 * This component represents a date and time picker.
 * It allows the user to select a date and time,
 * and provides options for updating the selected date and time.
 *
 * The selected date and time can be controlled externally
 * by providing the `date` and `setDate` props.
 *
 * If a `lessonId` is provided, the component will update the
 * corresponding lesson in the database when the date or time is changed.
 * If an `onDateTimeSelect` callback is provided,
 * it will be called when a date and time are selected.
 */

export function DateTimePicker({
  id,
  lessonId,
  date: externalDate,
  setDate: setExternalDate,
  onDateTimeSelect,
}: DateTimePickerProps) {
  const [date, setInternalDate] = React.useState<Date | undefined>(
    externalDate
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [time, setTime] = React.useState<{ hour: number; minute: number }>({
    hour: 7,
    minute: 0,
  });

  const hours = Array.from({ length: 17 }, (_, i) => i + 7);
  const minutes = [0, 15, 30, 45];

  // Handle externally controlled date if provided
  useEffect(() => {
    if (externalDate) {
      setInternalDate(externalDate);
      setTime({
        hour: externalDate.getHours(),
        minute: externalDate.getMinutes(),
      });
    }
  }, [externalDate]);

  // Use the appropriate setDate function
  const setDate = (newDate: Date | undefined) => {
    if (setExternalDate && newDate) {
      setExternalDate(newDate);
    }
    setInternalDate(newDate);
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;

    // Preserve the current time when selecting a new date
    if (time) {
      selectedDate.setHours(time.hour);
      selectedDate.setMinutes(time.minute);
    }

    setDate(selectedDate);

    // If we have a lessonId, update the existing lesson
    if (lessonId) {
      // Format the date for database update (YYYY-MM-DD)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      // Update the database
      async function updateLessonDate(lessonId: string, dateStr: string) {
        console.log(`Updating lesson ${lessonId} date to ${dateStr}`);

        const { data, error } = await supabase
          .from("lessons")
          .update({ date: dateStr })
          .eq("id", lessonId);

        if (error) {
          console.error("Error updating lesson date:", error.message);
          return null;
        }

        return data;
      }

      updateLessonDate(lessonId, formattedDate);
    }
    // If we have an onDateTimeSelect callback, this is being used in ExpandableButton
    else if (onDateTimeSelect) {
      onDateTimeSelect(selectedDate);
    }
  };

  useEffect(() => {
    async function fetchLessonDateTime(lessonId: string) {
      const { data, error } = await supabase
        .from("lessons")
        .select("date, time")
        .eq("id", lessonId)
        .single();

      if (error) {
        console.error("Error fetching lesson date and time:", error.message);
        return;
      }

      if (data) {
        // Set date
        if (data.date) {
          const fetchedDate = new Date(data.date);
          setDate(fetchedDate);

          // Set time if available
          if (data.time) {
            try {
              const timeParts = data.time.split(":");
              if (timeParts.length >= 2) {
                const hours = parseInt(timeParts[0], 10);
                const minutes = parseInt(timeParts[1], 10);

                // Update date with time
                fetchedDate.setHours(hours);
                fetchedDate.setMinutes(minutes);
                setDate(fetchedDate);

                // Update time state
                setTime({
                  hour: hours,
                  minute: minutes,
                });
              }
            } catch (e) {
              console.error("Error parsing time:", e);
            }
          }
        }
      }
    }

    if (lessonId) {
      fetchLessonDateTime(lessonId);
    }
  }, [lessonId]);

  const handleTimeChange = (type: "hour" | "minute", value: string) => {
    const valueNum = parseInt(value, 10);

    // Create a new time object based on current time
    const newTime = { ...time };

    // Update the hour or minute
    if (type === "hour") {
      newTime.hour = valueNum;
    } else if (type === "minute") {
      newTime.minute = valueNum;
    }

    // Update time state
    setTime(newTime);

    // Update the date object if it exists
    if (date) {
      const newDate = new Date(date);
      newDate.setHours(newTime.hour);
      newDate.setMinutes(newTime.minute);
      setDate(newDate);

      // If we have an onDateTimeSelect callback, this is being used in ExpandableButton
      if (onDateTimeSelect) {
        onDateTimeSelect(newDate);
      }
    }

    // If we have a lessonId, update the existing lesson
    if (lessonId) {
      // Format the time string for the database (HH:MM:00)
      const formattedTime = `${String(newTime.hour).padStart(2, "0")}:${String(
        newTime.minute
      ).padStart(2, "0")}:00`;

      // Update in database
      async function updateLessonTime(lessonId: string, timeStr: string) {
        console.log(`Updating lesson ${lessonId} time to ${timeStr}`);

        const { data, error } = await supabase
          .from("lessons")
          .update({ time: timeStr })
          .eq("id", lessonId);

        if (error) {
          console.error("Error updating lesson time:", error.message);
          return null;
        }

        return data;
      }

      updateLessonTime(lessonId, formattedTime).then((updatedLesson) => {
        if (updatedLesson) {
          console.log("Updated lesson time successfully");
        } else {
          console.log("Failed to update lesson time");
        }
      });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "border-slate-300 flex flex-row justify-start font-normal text-sm",
            !date && "text-muted-foreground"
          )}>
          <CalendarIcon className="mr-2 h-4 w-8" color="darkgray" />
          {date ? (
            <>
              {date.toLocaleString("it", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
              <span className="ml-auto">
                {`${String(time.hour).padStart(2, "0")}:${String(
                  time.minute
                ).padStart(2, "0")}`}
              </span>
            </>
          ) : (
            <>
              <span>Selezione data e ora</span>
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0">
        <div className="sm:flex">
          {/* Date */}
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
          />
          {/* Time */}
          <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
            <ScrollArea className="w-64 sm:w-auto">
              {/* Hours */}
              <div className="flex sm:flex-col p-2">
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    size="icon"
                    variant={time.hour === hour ? "default" : "ghost"}
                    className="sm:w-full shrink-0 aspect-square"
                    onClick={() => handleTimeChange("hour", hour.toString())}>
                    {hour}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
            <ScrollArea className="w-64 sm:w-auto">
              {/* Minutes */}
              <div className="flex sm:flex-col p-2">
                {minutes.map((minute) => (
                  <Button
                    key={minute}
                    size="icon"
                    variant={time.minute === minute ? "default" : "ghost"}
                    className="sm:w-full shrink-0 aspect-square"
                    onClick={() =>
                      handleTimeChange("minute", minute.toString())
                    }>
                    {minute.toString().padStart(2, "0")}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
