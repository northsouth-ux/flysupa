import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/services/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, BookOpen, GraduationCap, Calendar } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Stat card skeleton                                                  */
/* ------------------------------------------------------------------ */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Format a date string for display (Italian locale)                   */
/* ------------------------------------------------------------------ */
function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */
export default function SchoolAdmin() {
  const { user, school, schoolId, schoolRole, loading, createInvite } = useUser();
  const navigate = useNavigate();

  // ---------- Invite state ----------
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const handleCreateInvite = async () => {
    setInviteLoading(true);
    try {
      const token = await createInvite("student");
      setInviteLink(`${window.location.origin}/join?token=${token}`);
    } catch (err) {
      console.error("Error creating invite:", err);
    } finally {
      setInviteLoading(false);
    }
  };

  // ---------- Stat counters ----------
  const [studentCount, setStudentCount] = useState<string>("...");
  const [instructorCount, setInstructorCount] = useState<string>("...");
  const [lessonCount, setLessonCount] = useState<string>("...");

  // ---------- Fetch stats when schoolId is known ----------
  useEffect(() => {
    if (!schoolId) return;

    async function fetchStats() {
      // Students
      const { count: students } = await supabase
        .from("school_members")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .eq("role", "student");
      setStudentCount(students != null ? String(students) : "0");

      // Instructors (owner, admin, instructor)
      const { count: instructors } = await supabase
        .from("school_members")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .in("role", ["instructor", "admin", "owner"]);
      setInstructorCount(instructors != null ? String(instructors) : "0");

      // Total lessons
      const { count: lessons } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId);
      setLessonCount(lessons != null ? String(lessons) : "0");
    }

    fetchStats();
  }, [schoolId]);

  // ---------- Access control ----------

  // Still resolving auth / school context
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <svg
            className="h-8 w-8 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm font-medium">Caricamento…</span>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  // Logged in but no school yet
  if (!schoolId) {
    navigate("/register-school", { replace: true });
    return null;
  }

  // Student role → denied
  if (schoolRole === "student") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <CardTitle>Accesso negato</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Non disponi dei permessi necessari per accedere a questa pagina.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Main dashboard ----------
  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:py-12">
      {/* ============ HEADER ============ */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {school?.name ?? "Autoscuola"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Pannello di controllo
        </p>
      </div>

      {/* ============ STATS GRID ============ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<GraduationCap className="h-5 w-5" />}
          label="Studenti"
          value={studentCount}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Istruttori"
          value={instructorCount}
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Lezioni totali"
          value={lessonCount}
        />
        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Data creazione"
          value={formatDate(school?.created_at ?? "")}
        />
      </div>

      {/* ============ QUICK ACTIONS ============ */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">
          Azioni rapide
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleCreateInvite}
            disabled={inviteLoading}
          >
            {inviteLoading ? "Generando..." : "Invita Studente"}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/users")}
          >
            Gestisci Utenti
          </Button>
        </div>

        {inviteLink && (
          <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
              Link di invito generato:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 text-xs bg-white border border-green-200 dark:border-green-700 rounded px-3 py-2 text-gray-700"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(inviteLink)}
              >
                Copia
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
