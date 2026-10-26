import { useState } from "react";
import { cn } from "@/lib/utils";
import CalendarView from "@/pages/CalendarView";
import Home from "@/pages/Home";

type Mode = "calendar" | "list";

export default function Lezioni() {
  const [mode, setMode] = useState<Mode>("calendar");

  return (
    <div className="container py-6 space-y-4">
      <div className="flex justify-center">
        <div className="flex rounded-lg border bg-muted p-0.5">
          <button
            onClick={() => setMode("calendar")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              mode === "calendar"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}>
            Calendario
          </button>
          <button
            onClick={() => setMode("list")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              mode === "list"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}>
            Lista
          </button>
        </div>
      </div>

      {mode === "calendar" ? <CalendarView /> : <Home />}
    </div>
  );
}
