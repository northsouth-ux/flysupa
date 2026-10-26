import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  startOfMonth,
  startOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

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

interface StudentOption {
  id: string;
  nome_utente: string | null;
  cognome_utente: string | null;
}

type CalendarViewType = "day" | "week" | "month";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00–21:00

const VIEW_LABELS: Record<CalendarViewType, string> = {
  day: "Giorno",
  week: "Settimana",
  month: "Mese",
};

function studentName(p: {
  nome_utente: string | null;
  cognome_utente: string | null;
} | null | undefined): string {
  if (!p) return "—";
  return [p.nome_utente, p.cognome_utente].filter(Boolean).join(" ") || "—";
}

export default function CalendarView() {
  const { schoolId } = useUser();
  const navigate = useNavigate();
  const [view, setView] = useState<CalendarViewType>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [lessons, setLessons] = useState<CalendarLesson[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);

  // Create lesson modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date>(new Date());
  const [createTime, setCreateTime] = useState("10:00");
  const [createStudentId, setCreateStudentId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createHours, setCreateHours] = useState(1);
  const [creating, setCreating] = useState(false);

  const fetchLessons = useCallback(async () => {
    if (!schoolId) return;
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
  }, [schoolId]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  useEffect(() => {
    if (!schoolId) return;
    const fetchStudents = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome_utente, cognome_utente")
        .eq("school_id", schoolId)
        .eq("is_student", true)
        .order("nome_utente");
      if (!error) setStudents((data as StudentOption[]) || []);
    };
    fetchStudents();
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

  const lessonsAt = (day: Date, hour: number): CalendarLesson[] => {
    const dateStr = format(day, "yyyy-MM-dd");
    return (lessonsByDate.get(dateStr) || []).filter((l) =>
      l.time ? parseInt(l.time.slice(0, 2), 10) === hour : false
    );
  };

  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const title =
    view === "month"
      ? format(cursor, "MMMM yyyy", { locale: it })
      : view === "week"
        ? `${format(weekStart, "d MMM", { locale: it })} – ${format(
            addDays(weekStart, 6),
            "d MMM yyyy",
            { locale: it }
          )}`
        : format(cursor, "EEEE d MMMM yyyy", { locale: it });

  const navPrev = () =>
    setCursor((c) =>
      view === "month" ? subMonths(c, 1) : view === "week" ? addDays(c, -7) : addDays(c, -1)
    );
  const navNext = () =>
    setCursor((c) =>
      view === "month" ? addMonths(c, 1) : view === "week" ? addDays(c, 7) : addDays(c, 1)
    );

  const openCreate = (day: Date, hour?: number) => {
    setCreateDate(day);
    setCreateTime(hour != null ? `${String(hour).padStart(2, "0")}:00` : "10:00");
    setCreateStudentId("");
    setCreateTitle("");
    setCreateHours(1);
    setCreateOpen(true);
  };

  const createLesson = async () => {
    if (!schoolId || !createStudentId) return;
    setCreating(true);
    try {
      const { error } = await supabase.from("lessons").insert({
        profile_id: createStudentId,
        school_id: schoolId,
        title: createTitle.trim() || "Lezione",
        date: format(createDate, "yyyy-MM-dd"),
        time: createTime,
        amount_hours: createHours,
      });
      if (error) throw error;
      setCreateOpen(false);
      await fetchLessons();
    } catch (err) {
      console.error("Failed to create lesson:", err);
    } finally {
      setCreating(false);
    }
  };

  const lessonBlock = (l: CalendarLesson) => (
    <button
      key={l.id}
      onClick={() => navigate(`/edit-lesson/${l.id}`)}
      title={`${l.time?.slice(0, 5) || ""} ${studentName(l.profiles)}`}
      className="mb-1 block w-full truncate rounded bg-emerald-500/15 px-1.5 py-1 text-left text-[11px] leading-tight text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300">
      {l.time?.slice(0, 5)} · {studentName(l.profiles)}
    </button>
  );

  return (
    <>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Calendario lezioni</CardTitle>
              <CardDescription>
                Visualizza e pianifica le lezioni della tua scuola.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="flex rounded-lg border bg-muted p-0.5">
                {(Object.keys(VIEW_LABELS) as CalendarViewType[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                      view === v
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}>
                    {VIEW_LABELS[v]}
                  </button>
                ))}
              </div>

              <Button size="sm" onClick={() => openCreate(cursor)}>
                <Plus className="h-4 w-4 mr-1" />
                Crea
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor(new Date())}>
              Oggi
            </Button>
            <Button variant="outline" size="icon" onClick={navPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[160px] text-center text-sm font-medium capitalize">
              {title}
            </span>
            <Button variant="outline" size="icon" onClick={navNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {view === "month" && (
            <>
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
                {Array.from({ length: 42 }, (_, i) =>
                  addDays(startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), i)
                ).map((day, i) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const dayLessons = lessonsByDate.get(dateStr) || [];
                  const inMonth = isSameMonth(day, cursor);
                  const today = isToday(day);

                  return (
                    <div
                      key={i}
                      onClick={() => openCreate(day)}
                      className={cn(
                        "group relative flex min-h-[96px] cursor-pointer flex-col bg-background p-1.5 transition-colors hover:bg-muted/50",
                        !inMonth && "opacity-40"
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
                            title={`${l.time?.slice(0, 5) || ""} ${studentName(l.profiles)}`}
                            className="truncate rounded bg-emerald-500/15 px-1 py-0.5 text-left text-[10px] leading-tight text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300">
                            {l.time?.slice(0, 5)} {studentName(l.profiles)}
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
            </>
          )}

          {view === "week" && (
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                {/* Day headers */}
                <div className="flex">
                  <div className="w-[52px] shrink-0" />
                  {weekDays.map((d) => (
                    <div
                      key={d.toISOString()}
                      className="flex-1 border-l pb-1 text-center text-xs">
                      <div className="font-medium capitalize text-muted-foreground">
                        {format(d, "EEE", { locale: it })}
                      </div>
                      <div
                        className={cn(
                          "mx-auto flex h-6 w-6 items-center justify-center rounded-full",
                          isToday(d) && "bg-primary font-bold text-primary-foreground"
                        )}>
                        {format(d, "d")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hour rows */}
                {HOURS.map((hour) => (
                  <div key={hour} className="flex min-h-[52px] border-t">
                    <div className="w-[52px] shrink-0 py-1 pr-2 text-right text-xs text-muted-foreground">
                      {String(hour).padStart(2, "0")}:00
                    </div>
                    {weekDays.map((d) => (
                      <div
                        key={d.toISOString()}
                        className="flex-1 cursor-pointer border-l px-1 py-1 transition-colors hover:bg-muted/50"
                        onClick={() => openCreate(d, hour)}>
                        {lessonsAt(d, hour).map(lessonBlock)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === "day" && (
            <div className="mx-auto max-w-2xl">
              {HOURS.map((hour) => (
                <div key={hour} className="flex min-h-[52px] border-t">
                  <div className="w-[52px] shrink-0 py-1 pr-2 text-right text-xs text-muted-foreground">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  <div
                    className="flex-1 cursor-pointer border-l px-2 py-1 transition-colors hover:bg-muted/50"
                    onClick={() => openCreate(cursor, hour)}>
                    {lessonsAt(cursor, hour).map(lessonBlock)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create lesson dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuova lezione</DialogTitle>
            <DialogDescription>
              Seleziona l'allievo e i dettagli della lezione.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-student">Allievo</Label>
              <select
                id="create-student"
                value={createStudentId}
                onChange={(e) => setCreateStudentId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="" disabled>
                  Seleziona allievo…
                </option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {studentName(s) === "—" ? "Senza nome" : studentName(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-title">Titolo</Label>
              <Input
                id="create-title"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="es. Guida in città"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="create-date">Data</Label>
                <Input
                  id="create-date"
                  type="date"
                  value={format(createDate, "yyyy-MM-dd")}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [y, m, d] = e.target.value.split("-").map(Number);
                    setCreateDate(new Date(y, m - 1, d));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-time">Ora</Label>
                <Input
                  id="create-time"
                  type="time"
                  value={createTime}
                  onChange={(e) => setCreateTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-hours">Ore</Label>
                <Input
                  id="create-hours"
                  type="number"
                  min={1}
                  max={8}
                  value={createHours}
                  onChange={(e) => setCreateHours(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annulla
            </Button>
            <Button onClick={createLesson} disabled={creating || !createStudentId}>
              {creating ? "Salvando..." : "Crea Lezione"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
