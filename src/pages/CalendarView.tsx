import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  startOfMonth,
  startOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/services/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarLesson {
  id: string;
  date: string;
  time: string | null;
  amount_hours: number;
  profile_id: string;
  profiles: {
    nome_utente: string | null;
    cognome_utente: string | null;
  } | null;
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function studentName(l: CalendarLesson): string {
  const p = l.profiles;
  if (!p) return "—";
  return [p.nome_utente, p.cognome_utente].filter(Boolean).join(" ") || "—";
}

export default function CalendarView() {
  const { schoolId } = useUser();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<CalendarLesson[]>([]);
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  useEffect(() => {
    if (!schoolId) return;
    const fetchLessons = async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select(
          "id, date, time, amount_hours, profile_id, profiles(nome_utente, cognome_utente)"
        )
        .eq("school_id", schoolId);
      if (error) {
        console.error("Error fetching lessons:", error);
        return;
      }
      setLessons((data as unknown as CalendarLesson[]) || []);
    };
    fetchLessons();
  }, [schoolId]);

  // Group lessons by YYYY-MM-DD, sorted by time within each day
  const lessonsByDate = useMemo(() => {
    const map = new Map<string, CalendarLesson[]>();
    for (const l of lessons) {
      if (!l.date) continue;
      const arr = map.get(l.date) || [];
      arr.push(l);
      map.set(l.date, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    }
    return map;
  }, [lessons]);

  // 6-week grid (42 cells) starting Monday
  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const selectedLessons = selectedDay
    ? lessonsByDate.get(format(selectedDay, "yyyy-MM-dd")) || []
    : [];

  return (
    <div className="container py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Calendario lezioni</CardTitle>
            <CardDescription>
              Visualizza e pianifica le lezioni della tua scuola.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMonth(startOfMonth(new Date()));
                setSelectedDay(new Date());
              }}>
              Oggi
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth(subMonths(month, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-medium capitalize">
              {format(month, "MMMM yyyy", { locale: it })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-px rounded-t-lg border border-b-0 bg-border">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="bg-muted px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-lg border border-t-0 bg-border">
            {grid.map((day, i) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayLessons = lessonsByDate.get(dateStr) || [];
              const inMonth = isSameMonth(day, month);
              const today = isToday(day);
              const selected = selectedDay && isSameDay(day, selectedDay);

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "flex min-h-[96px] cursor-pointer flex-col bg-background p-1.5 transition-colors hover:bg-muted/50",
                    !inMonth && "opacity-40",
                    selected && "ring-2 ring-inset ring-primary"
                  )}>
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center self-end rounded-full text-xs",
                      today
                        ? "bg-primary font-bold text-primary-foreground"
                        : "text-muted-foreground"
                    )}>
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 flex flex-col gap-1 overflow-hidden">
                    {dayLessons.slice(0, 3).map((l) => (
                      <button
                        key={l.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/edit-lesson/${l.id}`);
                        }}
                        title={`${l.time?.slice(0, 5) || ""} ${studentName(l)}`}
                        className="truncate rounded bg-emerald-500/15 px-1 py-0.5 text-left text-[10px] leading-tight text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300">
                        {l.time?.slice(0, 5)} {studentName(l)}
                      </button>
                    ))}
                    {dayLessons.length > 3 && (
                      <span className="px-1 text-[10px] text-muted-foreground">
                        +{dayLessons.length - 3} altre
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium capitalize">
                Lezioni del {format(selectedDay, "d MMMM yyyy", { locale: it })}
              </h3>
              {selectedLessons.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedLessons.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => navigate(`/edit-lesson/${l.id}`)}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          {l.time?.slice(0, 5) || "—"}
                        </Badge>
                        <span className="font-medium">{studentName(l)}</span>
                      </div>
                      <Badge variant="outline">{l.amount_hours}h</Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nessuna lezione in questa data.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
