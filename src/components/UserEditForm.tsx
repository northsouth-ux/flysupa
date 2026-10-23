"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient.tsx";
import { Profile, Lesson } from "@/types";
import { useUser } from "../hooks/useUser";

// Shadcn Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/DatePicker";
// Update imports to include our custom Avatar
import Avatar from "@/components/Avatar";

// Custom Components
import LessonsTable, { NoLessons, LoadingLessons } from "./LessonsTable";

// Import Dialog components
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

// License Thumbnail Component
function LicenseThumbnail({ licenseUrl }: { licenseUrl: string | null }) {
  return (
    <div className="relative flex items-center justify-center w-full h-28 bg-slate-200 rounded-md overflow-hidden">
      {licenseUrl ? (
        <Dialog>
          <DialogTrigger asChild>
            <div className="w-full h-full relative group cursor-pointer">
              <img
                src={licenseUrl}
                alt="Driving License"
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-2 right-2 bg-white/80 p-1.5 rounded-full opacity-70 group-hover:opacity-100 transition-opacity">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-700">
                  <path d="m15 3 6 6m-6-6v6h6"></path>
                  <path d="M10 21H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
                  <path d="M21 13v8"></path>
                  <path d="M18 16h6"></path>
                </svg>
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex items-center justify-center">
            <img
              src={licenseUrl}
              alt="Driving License"
              className="max-w-full max-h-[70vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <rect width="18" height="12" x="3" y="6" rx="2" />
            <path d="M3 10h18" />
            <path d="M7 15h.01" />
            <path d="M11 15h2" />
          </svg>
          <span className="mt-1 text-sm">Nessuna licenza</span>
        </div>
      )}
    </div>
  );
}

export default function UserEditForm() {
  const { id } = useParams<{ id: string }>(); // Get user ID from URL
  const { refetchTotalHours, downloadAndSetUserAvatar, schoolId, isAdmin } = useUser(); // Add downloadAndSetUserAvatar
  const [profile, setProfile] = useState<Profile | null>(null);
  const [licenseUrl, setLicenseUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmAlert, setShowConfirmAlert] = useState(false);
  const [error, setError] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]); // Initialize as an empty array
  const [loadingLessons, setLoadingLessons] = useState(true); //Initialize as 0
  const [lessonsCount, setLessonsCount] = useState<number>(0); // Initialize as 0
  // Create lesson form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDate, setNewLessonDate] = useState(new Date().toISOString().split("T")[0]);
  const [newLessonTime, setNewLessonTime] = useState("10:00");
  const [newLessonHours, setNewLessonHours] = useState(1);

  // Profile fields that we want to display in our table
  const fieldDisplayNames: { [key: string]: string } = {
    nome_utente: "Nome Completo",
    email: "Email",
    phone: "Telefono",
    licenza_date: "Data rilascio LAC",
    admin: "Amministratore",
    sensibilizzazione: "Sensibilizzazione",
    soccorritori: "Soccorritori",
  };

  // Use Effects
  useEffect(() => {
    if (!id) return;
    fetchProfile();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      await fetchProfile();
      await fetchProfileLessons(id);
    };

    fetchData();
  }, [id]);

  // Fetch Profile
  const fetchProfile = async () => {
    if (!id) {
      setError("Invalid User Id");
      return;
    }

    try {
      setLoading(true);

      // Use Supabase client for consistency
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch profile: ${error.message}`);
      }

      if (data) {
        const profileData = data;

        // Download and set avatar if available
        if (profileData.avatar_url) {
          const avatarUrl = await downloadAndSetUserAvatar(
            profileData.avatar_url
          );
          profileData.full_avatar_url = avatarUrl;
        }

        // Download and set license if available
        if (profileData.license_url) {
          try {
            const { data, error } = await supabase.storage
              .from("licenses")
              .download(profileData.license_url);

            if (error) throw error;
            const url = URL.createObjectURL(data);
            setLicenseUrl(url);
          } catch (error) {
            console.error("Error downloading license image:", error);
          }
        }

        console.log("Fetched profile data:", profileData);
        setProfile(profileData);
      }
    } catch (err: unknown) {
      console.error("Error in fetchProfile:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Lessons
  const fetchProfileLessons = async (id: string) => {
    try {
      setLoadingLessons(true);
      let query = supabase
        .from("lessons")
        .select(
          "*, lesson_item_associations(lesson_item_id, lessons_items(title))"
        )
        .eq("profile_id", id);
      if (schoolId) query = query.eq("school_id", schoolId);
      const { data, error } = await query.order("date", { ascending: true });

      if (error) throw error;

      // Map the associations embed to the `details` shape the table expects
      const lessonsWithDetails = (data || []).map((lesson: any) => ({
        ...lesson,
        details: (lesson.lesson_item_associations || []).map((a: any) => ({
          lesson_item_id: a.lesson_item_id,
          title: a.lessons_items?.title || "Argomento",
        })),
      }));

      setLessons(lessonsWithDetails);
      setLessonsCount(data?.length || 0);
    } catch (err) {
      console.error("Error fetching lessons:", err);
    } finally {
      setLoadingLessons(false);
    }
  };

  // Handle edits from custom edit components
  const handleFieldChange = (key: string, value: any) => {
    // Update the profile state
    setProfile((prev) => {
      if (!prev) return null;
      return { ...prev, [key]: value };
    });
  };

  const updateProfile = async () => {
    if (!id || !profile) return;

    try {
      setLoading(true);

      // Define the fields we want to update
      const updatableFields = [
        "nome_utente",
        "phone",
        "licenza_date",
        "admin",
        "sensibilizzazione",
        "soccorritori",
      ];

      // Extract only the fields we want to update, filtering out undefined values
      const updates = updatableFields.reduce((acc, key) => {
        // Only include the field if it exists in the profile and is not undefined
        if (profile[key as keyof typeof profile] !== undefined) {
          acc[key] = profile[key as keyof typeof profile];
        }
        return acc;
      }, {} as Record<string, any>);

      // Add required fields for upsert
      const profileData = {
        ...updates,
        id, // Make sure ID is included
        updated_at: new Date().toISOString(),
      };

      console.log("Updating profile with data:", profileData);

      // Use supabase client with upsert
      const { data, error } = await supabase
        .from("profiles")
        .upsert(profileData)
        .select();

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(`Profile update failed: ${error.message}`);
      }

      console.log("Profile updated successfully:", data);

      // Refetch profile data to ensure UI is in sync
      await fetchProfile();

      // Show success message
      setShowConfirmAlert(true);
    } catch (err: unknown) {
      console.error("Error in updateProfile:", err);
      setError(
        err instanceof Error ? err.message : "Unknown error updating profile"
      );
    } finally {
      setLoading(false);
    }
  };

  const createLesson = async (profileId: string) => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("lessons").insert({
        profile_id: profileId,
        school_id: schoolId,
        title: newLessonTitle,
        date: newLessonDate,
        time: newLessonTime,
        amount_hours: newLessonHours,
      });
      if (error) throw error;
      // Reset form
      setNewLessonTitle("");
      setNewLessonDate(new Date().toISOString().split("T")[0]);
      setNewLessonTime("10:00");
      setNewLessonHours(1);
      setShowCreateForm(false);
      // Refetch
      await fetchProfileLessons(profileId);
    } catch (err: any) {
      setError(err.message || "Failed to create lesson");
    } finally {
      setLoading(false);
    }
  };

  const deleteLesson = async (lessonId: string, profileId: string) => {
    try {
      const { error } = await supabase
        .from("lessons")
        .delete()
        .eq("id", lessonId)
        .eq("school_id", schoolId);
      if (error) throw error;
      await fetchProfileLessons(profileId);
    } catch (err: any) {
      setError(err.message || "Failed to delete lesson");
    }
  };

  // Loading handling
  if (loading && !profile) return <div>Loading...</div>;

  // Error handling
  if (error)
    return (
      <div className="flex justify-center items-center h-screen mt-[-6rem]">
        <div className="text-black">{error}</div>
      </div>
    );

  return (
    <div className="container px-[.8rem] py-4 space-y-6">
      {showConfirmAlert && (
        <div className="rounded-lg bg-green-100 dark:bg-green-900 p-4 text-green-700 dark:text-green-100 flex justify-between items-center">
          <p>Profilo aggiornato con successo!</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirmAlert(false)}
            className="dark:text-green-900 dark:border-green-700 dark:hover:bg-green-50">
            Chiudi
          </Button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* User data card */}
        <Card className="w-full lg:w-1/3">
          <CardHeader>
            <div className="flex flex-row items-center gap-4">
              <div>
                <Avatar
                  size="sm"
                  navbar={true}
                  userEditForm={true}
                  sourceUrl={profile?.full_avatar_url}
                  lessonsCount={lessonsCount || 0}
                />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Dati utente
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted-foreground">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </CardTitle>
                <CardDescription>
                  Modifica le informazioni del profilo utente
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Personal Information */}
            <div className="grid gap-4">
              <div className="gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={profile?.email || ""}
                    disabled
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Telefono
                  </Label>
                  <Input
                    id="phone"
                    value={profile?.phone || ""}
                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                    placeholder="+41"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome_utente">
                    Nome Completo
                  </Label>
                  <Input
                    id="nome_utente"
                    value={profile?.nome_utente || ""}
                    onChange={(e) =>
                      handleFieldChange("nome_utente", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <Label htmlFor="licenza_date">
                    Rilascio Lic. Allievo Conducente (LAC)
                  </Label>
                </div>
                <DatePicker
                  value={
                    profile?.licenza_date
                      ? new Date(profile.licenza_date)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(val) => handleFieldChange("licenza_date", val)}
                />
              </div>
            </div>

            {/* Status and License row */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Checkboxes section */}
              <div className="border rounded-lg p-4 space-y-4 flex-1">
                <h3 className="text-lg font-medium">
                  Certificazioni
                </h3>

                <div className="space-y-2">
                  {/* <div className="flex items-center space-x-2">
                    <Checkbox
                      disabled={true}
                      id="admin"
                      checked={profile?.admin || false}
                      onCheckedChange={(checked) =>
                        handleFieldChange("admin", checked)
                      }
                    />
                    <Label htmlFor="admin">
                      Amministratore
                    </Label>
                  </div> */}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sensibilizzazione"
                      checked={profile?.sensibilizzazione || false}
                      onCheckedChange={(checked) =>
                        handleFieldChange("sensibilizzazione", checked)
                      }
                    />
                    <Label
                      htmlFor="sensibilizzazione">
                      Sensibilizzazione
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="soccorritori"
                      checked={profile?.soccorritori || false}
                      onCheckedChange={(checked) =>
                        handleFieldChange("soccorritori", checked)
                      }
                    />
                    <Label
                      htmlFor="soccorritori">
                      Soccorritori
                    </Label>
                  </div>
                </div>
              </div>

              {/* License section */}
              <div className="border rounded-lg p-4 space-y-2 flex-1">
                <h3 className="text-lg font-medium">
                  Patente
                </h3>
                <LicenseThumbnail licenseUrl={licenseUrl} />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={updateProfile}
              disabled={loading}
              className="w-full">
              {loading ? "Salvando..." : "Salva Profilo"}
            </Button>
          </CardFooter>
        </Card>

        {/* Lessons card */}
        <Card className="w-full lg:w-2/3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Lezioni
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                  <line x1="16" x2="16" y1="2" y2="6"></line>
                  <line x1="8" x2="8" y1="2" y2="6"></line>
                  <line x1="3" x2="21" y1="10" y2="10"></line>
                </svg>
              </CardTitle>
              {isAdmin && (
                <Button size="sm" onClick={() => setShowCreateForm(true)}>
                  Crea
                </Button>
              )}
            </div>
            <CardDescription>
              Elenco delle lezioni registrate per questo utente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lessons && lessons.length > 0 ? (
              <LessonsTable
                id={id as any}
                lessons={lessons}
                profile={profile}
                lessonsCount={lessonsCount}
                deleteLesson={deleteLesson}
                refetchLessons={fetchProfileLessons}
              />
            ) : (
              <NoLessons
                profileId={profile?.id as any}
                refetchLessons={fetchProfileLessons}
              />
            )}
          </CardContent>
          <CardFooter className="flex justify-start">
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                Totale ore:{" "}
                <span className="font-medium">
                  {/* {profile?.total_hours || 0} */}
                </span>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Create Lesson Dialog */}
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent className="sm:max-w-md">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Aggiungi Lezione</CardTitle>
              <CardDescription>Data, ora e durata della nuova lezione</CardDescription>
            </CardHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lesson-title">Titolo</Label>
                <Input
                  id="lesson-title"
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder="es. Guida in città"
                />
              </div>
              <div>
                <Label htmlFor="lesson-hours">Ore</Label>
                <Input
                  id="lesson-hours"
                  type="number"
                  min={1}
                  max={8}
                  value={newLessonHours}
                  onChange={(e) => setNewLessonHours(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="lesson-date">Data</Label>
                <Input
                  id="lesson-date"
                  type="date"
                  value={newLessonDate}
                  onChange={(e) => setNewLessonDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="lesson-time">Ora</Label>
                <Input
                  id="lesson-time"
                  type="time"
                  value={newLessonTime}
                  onChange={(e) => setNewLessonTime(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => createLesson(id!)} disabled={loading}>
                {loading ? "Salvando..." : "Crea Lezione"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
