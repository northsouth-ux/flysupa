// Users.tsx
import React, { useEffect, useState } from "react";
import { useUser } from "../hooks/useUser.tsx";
import { useNavigate } from "react-router-dom";
import { ColumnDef } from "@tanstack/react-table";
import { Profile } from "@/types";
import { supabase } from "@/services/supabaseClient.tsx";

/**
 * Users.tsx
 *
 * * This file contains the Users component which displays a list of user profiles
 * in a table format. It fetches user data from a Supabase database and displays
 * various details about each user, including their avatar, total hours, license
 * expiration, and other relevant information.
 *
 * Main Methods:
 *  @fetchLessonsCountForProfile Fetches the total number of lessons for a given profile.
 *  @fetchProfiles Fetches all profiles from the Supabase database and enriches them
 *  with avatar URLs and lesson counts.
 *
 * Main Classes:
 * - Users: The main component that renders the user profiles in a table.
 * - Avatar: A custom component used to display user avatars.
 * - DataTable: A reusable component for displaying tabular data.
 * - Button, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle: UI components
 *   from the Shadcn library used for styling and layout.
 */

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
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
import { UserPlus } from "lucide-react";

// Update imports to include our custom Avatar
import Avatar from "@/components/Avatar";

const formatDate = (dateStr: string | number | Date) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function Users() {
  const { downloadAndSetUserAvatar, schoolId, createStudent } = useUser();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Function to fetch the total lessons count for a profile
  async function fetchLessonsCountForProfile(
    profileId: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("lessons")
        .select("id", { count: "exact" })
        .eq("profile_id", profileId);

      if (error) {
        console.error("Error counting lessons for profile:", error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error("Error in fetchLessonsCountForProfile:", error);
      return 0;
    }
  }

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("school_id", schoolId)
          .eq("is_student", true);

        if (error) throw error;

        // Fetch avatar URLs for each profile
        const profilesWithAvatars = await Promise.all(
          data.map(async (profile: Profile) => {
            let avatarUrl = profile.avatar_url; // Initialize with the existing URL
            if (profile.avatar_url) {
              avatarUrl = await downloadAndSetUserAvatar(profile.avatar_url);
            }
            const lessonsCount = await fetchLessonsCountForProfile(
              profile.id as any
            );
            return {
              ...profile,
              avatar_url: avatarUrl,
              lessonsCount: lessonsCount,
            };
          })
        );

        setProfiles(profilesWithAvatars as Profile[]);
      } catch (error) {
        console.error("Error fetching profiles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [downloadAndSetUserAvatar, setProfiles]);

  // ---------- Add student ----------
  const [dialogOpen, setDialogOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({
    nome_utente: "",
    cognome_utente: "",
    email: "",
    phone: "",
    licenza_date: "",
  });
  const [studentError, setStudentError] = useState<string | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);

    if (!studentForm.nome_utente.trim() || !studentForm.cognome_utente.trim()) {
      setStudentError("Nome e cognome sono obbligatori.");
      return;
    }

    setStudentLoading(true);
    try {
      const newId = await createStudent({
        nome_utente: studentForm.nome_utente.trim(),
        cognome_utente: studentForm.cognome_utente.trim(),
        email: studentForm.email.trim() || undefined,
        phone: studentForm.phone.trim() || undefined,
        licenza_date: studentForm.licenza_date || undefined,
      });
      setDialogOpen(false);
      setStudentForm({
        nome_utente: "",
        cognome_utente: "",
        email: "",
        phone: "",
        licenza_date: "",
      });
      navigate(`/user-edit/${newId}`);
    } catch (err: any) {
      setStudentError(
        err?.message ?? "Errore durante la creazione dello studente."
      );
    } finally {
      setStudentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  // Define columns for data table
  const columns: ColumnDef<Profile>[] = [
    {
      accessorKey: "avatar",
      header: "Avatar",
      cell: ({ row }) => {
        const profile: any = row.original;
        return (
          <Avatar
            size="sm"
            navbar={true}
            sourceUrl={profile.avatar_url}
            lessonsCount={profile.lessonsCount || 0}
          />
        );
      },
    },
    {
      accessorKey: "nome_utente",
      header: "Nome",
      cell: ({ row }) => {
        const p = row.original;
        const fullName = [p.nome_utente, p.cognome_utente]
          .filter(Boolean)
          .join(" ");
        return <span className="font-medium">{fullName || "—"}</span>;
      },
    },
    {
      accessorKey: "total_hours",
      header: "Lez.",
      cell: ({ row }) => {
        const hours = row.original.total_hours;
        const profile: any = row.original;
        if (hours === 0) return null;
        return (
          <div className="flex items-left">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-b border border-black text-gray">
              {profile.lessonsCount}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "licenza_date",
      header: "Licenza",
      cell: ({ row }) => (
        <span>
          {formatDate(row.original.licenza_date || "")}
        </span>
      ),
    },
    {
      accessorKey: "soccorritori",
      header: "SOC",
      cell: ({ row }) =>
        row.original.soccorritori && (
          <Badge
            variant="tertiary"
            className="text-sm text-white dark:bg-[#003d34c7] dark:border-[#009e86]">
            ok
          </Badge>
        ),
    },
    {
      accessorKey: "sensibilizzazione",
      header: "SEN",
      cell: ({ row }) =>
        row.original.sensibilizzazione && (
          <Badge
            variant="tertiary"
            className="text-sm text-white dark:bg-[#003d34f5] dark:border-[#009e86]">
            ok
          </Badge>
        ),
    },
    {
      id: "actions",
      header: () => (
        <div className="text-right">Azioni</div>
      ),
      cell: ({ row }) => {
        const profile = row.original;
        return (
          <div className="text-right">
            <Button
              variant="outline"
              size="sm"
              className="mr-2"
              onClick={() => navigate(`/user-edit/${profile.id}`)}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </Button>
            <Button
              variant="outline"
              size="sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="container py-2 space-y-6">
      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={profiles}
            searchColumn="email"
            searchPlaceholder="Cerca studenti..."
            headerActions={
              <Button onClick={() => setDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Aggiungi studente
              </Button>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Aggiungi studente</DialogTitle>
            <DialogDescription>
              Crea un nuovo studente (non serve un account — è solo un profilo da
              monitorare).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome_utente">
                  Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nome_utente"
                  required
                  placeholder="es. Mario"
                  value={studentForm.nome_utente}
                  onChange={(e) =>
                    setStudentForm((f) => ({ ...f, nome_utente: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cognome_utente">
                  Cognome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cognome_utente"
                  required
                  placeholder="es. Rossi"
                  value={studentForm.cognome_utente}
                  onChange={(e) =>
                    setStudentForm((f) => ({
                      ...f,
                      cognome_utente: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student_email">Email</Label>
                <Input
                  id="student_email"
                  type="email"
                  placeholder="es. mario.rossi@email.com"
                  value={studentForm.email}
                  onChange={(e) =>
                    setStudentForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student_phone">Telefono</Label>
                <Input
                  id="student_phone"
                  type="text"
                  placeholder="+41 (0) XX XXX XX XX"
                  value={studentForm.phone}
                  onChange={(e) =>
                    setStudentForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenza_date">Data patente</Label>
                <Input
                  id="licenza_date"
                  type="date"
                  value={studentForm.licenza_date}
                  className="dark:[color-scheme:dark]"
                  onChange={(e) =>
                    setStudentForm((f) => ({
                      ...f,
                      licenza_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {studentError && (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {studentError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={studentLoading}>
                {studentLoading ? "Salvataggio…" : "Aggiungi studente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
