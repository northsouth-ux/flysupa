import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/services/supabaseClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Users, GraduationCap, BookOpen } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface SchoolRow {
  id: string;
  name: string;
  created_at: string;
  memberCount: number;
}

/* ------------------------------------------------------------------ */
/*  Stat card component                                                */
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
/*  Helpers                                                            */
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
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function PlatformAdmin() {
  const { user, platformAdmin, loading } = useUser();
  const navigate = useNavigate();

  // ---------- Stat counters ----------
  const [schoolCount, setSchoolCount] = useState<string>("...");
  const [userCount, setUserCount] = useState<string>("...");
  const [studentCount, setStudentCount] = useState<string>("...");
  const [lessonCount, setLessonCount] = useState<string>("...");

  // ---------- Schools list ----------
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);

  // ---------- Fetch global stats ----------
  useEffect(() => {
    async function fetchStats() {
      const [schoolsRes, usersRes, studentsRes, lessonsRes] =
        await Promise.all([
          supabase
            .from("schools")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("school_members")
            .select("*", { count: "exact", head: true })
            .eq("role", "student"),
          supabase
            .from("lessons")
            .select("*", { count: "exact", head: true }),
        ]);

      setSchoolCount(schoolsRes.count != null ? String(schoolsRes.count) : "0");
      setUserCount(usersRes.count != null ? String(usersRes.count) : "0");
      setStudentCount(
        studentsRes.count != null ? String(studentsRes.count) : "0",
      );
      setLessonCount(
        lessonsRes.count != null ? String(lessonsRes.count) : "0",
      );
    }

    fetchStats();
  }, []);

  // ---------- Fetch schools list ----------
  useEffect(() => {
    async function fetchSchools() {
      setSchoolsLoading(true);
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data) {
        setSchoolsLoading(false);
        return;
      }

      // Fetch member count for each school in parallel
      const rows: SchoolRow[] = await Promise.all(
        data.map(async (s: any) => {
          const { count } = await supabase
            .from("school_members")
            .select("*", { count: "exact", head: true })
            .eq("school_id", s.id);
          return {
            id: s.id,
            name: s.name,
            created_at: s.created_at,
            memberCount: count ?? 0,
          };
        }),
      );

      setSchools(rows);
      setSchoolsLoading(false);
    }

    fetchSchools();
  }, []);

  // ---------- Access control ----------

  // Still resolving auth
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

  // Not a platform admin
  if (!platformAdmin) {
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
          Piattaforma
        </h1>
        <p className="mt-1 text-muted-foreground">
          Panoramica globale
        </p>
      </div>

      {/* ============ STATS GRID ============ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Building2 className="h-5 w-5" />}
          label="Scuole totali"
          value={schoolCount}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Utenti totali"
          value={userCount}
        />
        <StatCard
          icon={<GraduationCap className="h-5 w-5" />}
          label="Studenti"
          value={studentCount}
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Lezioni totali"
          value={lessonCount}
        />
      </div>

      {/* ============ SCHOOLS LIST ============ */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">
          Elenco scuole
        </h2>

        {schoolsLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <svg
              className="h-6 w-6 animate-spin text-primary"
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
          </div>
        ) : schools.length === 0 ? (
          <p className="text-muted-foreground">
            Nessuna scuola trovata.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    Nome scuola
                  </TableHead>
                  <TableHead>Membri</TableHead>
                  <TableHead>
                    Data creazione
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.name}
                    </TableCell>
                    <TableCell>
                      {s.memberCount}
                    </TableCell>
                    <TableCell>
                      {formatDate(s.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}
