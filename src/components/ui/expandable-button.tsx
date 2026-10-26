"use client";

import { useState, useEffect } from "react";
import { Button } from "./button";
import { Save } from "lucide-react";
import { DateTimePicker } from "../DateTimerPicker";
import { X } from "lucide-react";
import { Plus } from "lucide-react";
import { Input } from "./input";
import { Lesson } from "@/types";
import { supabase } from "@/services/supabaseClient";
import { useUser } from "@/hooks/useUser";

interface ExpandableButtonProps {
  profileId?: string;
  refetch?: any;
  expanded?: boolean;
  lessonId?: string;
  lesson?: Lesson;
  editLesson?: boolean;
}

//

export default function ExpandableButton({
  profileId,
  refetch,
  expanded,
  lessonId,
  lesson,
}: ExpandableButtonProps) {
  const { schoolId } = useUser();

  // Debug log to check lesson data
  useEffect(() => {
    if (expanded && lesson) {
      console.log("ExpandableButton received lesson data:", lesson);
    }
  }, [expanded, lesson]);
  const [isExpanded, setIsExpanded] = useState(false);
  // Initialize date based on whether we're editing a lesson or creating a new one
  const [date, setDate] = useState<Date>(() => {
    if (lesson && lesson.date) {
      // If editing, convert lesson date and time to a Date object
      const lessonDate = new Date(lesson.date);
      if (lesson.time) {
        // Parse time string in format HH:MM:SS
        const timeParts = lesson.time.split(":");
        if (timeParts.length >= 2) {
          lessonDate.setHours(parseInt(timeParts[0], 10));
          lessonDate.setMinutes(parseInt(timeParts[1], 10));
        }
      }
      return lessonDate;
    }
    // Default to current date/time for new lessons
    return new Date();
  });

  // Initialize amount hours based on lesson prop or default to 1
  const [amountHours, setAmoutHours] = useState(lesson?.amount_hours || 1);
  const [isCreating, setIsCreating] = useState(false);

  // Update date when lesson changes
  useEffect(() => {
    if (lesson && lesson.date) {
      // If editing, convert lesson date and time to a Date object
      const lessonDate = new Date(lesson.date);
      if (lesson.time) {
        // Parse time string in format HH:MM:SS
        const timeParts = lesson.time.split(":");
        if (timeParts.length >= 2) {
          lessonDate.setHours(parseInt(timeParts[0], 10));
          lessonDate.setMinutes(parseInt(timeParts[1], 10));
        }
      }
      setDate(lessonDate);

      if (lesson.amount_hours) {
        setAmoutHours(lesson.amount_hours);
      }
    }
  }, [lesson]);

  const handleClick = () => {
    if (!isExpanded && !expanded) {
      setIsExpanded(true);
    } else {
      expanded ? updateLesson() : handleCreateLesson();
    }
  };

  const handleCreateLesson = async () => {
    if (isCreating) return;
    setIsCreating(true);

    // Format the date for database update (YYYY-MM-DD)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    // Format the time for database update (HH:MM:00)
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const formattedTime = `${hour}:${minute}:00`;

    // Create lesson data
    const lessonData = {
      date: formattedDate,
      time: formattedTime,
      profile_id: profileId,
      amount_hours: amountHours,
      school_id: schoolId,
      title: "Lezione",
    };

    try {
      const { error } = await supabase.from("lessons").insert(lessonData);

      if (error) throw error;

      await refetch(profileId);
    } catch (err: unknown) {
      console.error("Failed to create lesson:", err);
    } finally {
      setIsCreating(false);
      setIsExpanded(false);
    }
  };

  const updateLesson = async () => {
    if (isCreating) return;
    setIsCreating(true);

    // Format the date for database update (YYYY-MM-DD)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;

    // Format the time for database update (HH:MM:00)
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const formattedTime = `${hour}:${minute}:00`;

    // Update lesson data
    const lessonData = {
      date: formattedDate,
      time: formattedTime,
      amount_hours: amountHours,
    };

    try {
      const { error } = await supabase
        .from("lessons")
        .update(lessonData)
        .eq("id", lessonId);

      if (error) throw error;

      await refetch(profileId);
    } catch (err: unknown) {
      console.error("Failed to update lesson:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDateTimeSelect = (selectedDate: Date) => {
    setDate(selectedDate);
  };

  const resetForm = () => {
    // If we're editing a lesson, keep the lesson's original date
    if (expanded && lesson && lesson.date) {
      const lessonDate = new Date(lesson.date);
      if (lesson.time) {
        // Parse time string in format HH:MM:SS
        const timeParts = lesson.time.split(":");
        if (timeParts.length >= 2) {
          lessonDate.setHours(parseInt(timeParts[0], 10));
          lessonDate.setMinutes(parseInt(timeParts[1], 10));
        }
      }
      setDate(lessonDate);
    } else {
      // For new lessons, reset to current date
      setDate(new Date());
    }
    setIsExpanded(false);
  };

  // Different layout based on whether it's in edit mode or create mode
  if (expanded) {
    // Vertical layout for EditLesson scenario
    return (
      <div className="w-full space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="date-time"
            className="text-sm font-medium">
            Data & Ora
          </label>
          <DateTimePicker
            id="date-time"
            date={date}
            setDate={setDate}
            onDateTimeSelect={handleDateTimeSelect}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="hours"
            className="text-sm font-medium">
            Totale Ore
          </label>
          <Input
            id="hours"
            type="number"
            className="max-w-[100px]"
            value={amountHours}
            onChange={(e) => setAmoutHours(Number(e.target.value))}
          />
        </div>

        <div className="flex justify-start pt-2">
          <Button
            onClick={handleClick}
            disabled={isCreating}
            className="flex items-center justify-center gap-1"
            variant="secondary">
            <Save className="h-4 w-4 mr-1" />
            <span>{isCreating ? "Salvando..." : "Salva Modifiche"}</span>
          </Button>
        </div>
      </div>
    );
  } else {
    // Original horizontal layout for LessonsTable scenario
    return (
      <div className="flex items-center gap-3">
        <Button
          onClick={handleClick}
          disabled={isCreating}
          className="flex items-center justify-center gap-1 h-8"
          size="sm"
          variant="secondary">
          {isExpanded ? (
            <>
              <Save className="h-3 w-3" />
              <span>{isCreating ? "Salvando..." : "Salva"}</span>
            </>
          ) : (
            <>
              <Plus className="h-1 w-1" />
              <span>Crea</span>
            </>
          )}
        </Button>

        <div
          className={`flex items-center gap-3 transition-all duration-300 ease-in-out ${
            isExpanded
              ? "opacity-100 max-w-[1000px] translate-x-0"
              : "opacity-0 max-w-0 -translate-x-4 overflow-hidden pointer-events-none"
          }`}>
          <div className="flex items-center gap-2">
            <DateTimePicker
              date={date}
              setDate={setDate}
              onDateTimeSelect={handleDateTimeSelect}
            />
            <Input
              type="number"
              className="max-w-[60px]"
              value={amountHours}
              onChange={(e) => setAmoutHours(Number(e.target.value))}
            />
          </div>
          <Button
            onClick={resetForm}
            size="sm"
            variant="destructive"
            disabled={isCreating}
            className="shrink-0 h-8 w-8 rounded-md border-muted-foreground/20"
            aria-label="Cancel">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }
}
