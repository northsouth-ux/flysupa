import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "../hooks/useUser";
import { supabase } from "../services/supabaseClient";
import Avatar from "@/components/Avatar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface UpcomingLesson {
  amount_hours: number;
  id: string;
  date: string;
  time: string;
  profile_id: string;
  profiles: {
    avatar_url: string;
    nome_utente: string;
    profile_id: string;
  };
  processed_avatar_url?: string;
  isToday?: boolean;
  lessonsCount?: number;
}

export default function Home() {
  const { user, isAdmin, schoolId, downloadAndSetUserAvatar } = useUser();
  const navigate = useNavigate();
  const [upcomingLessons, setUpcomingLessons] = useState<UpcomingLesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [totalLessons, setTotalLessons] = useState(0); // Total lessons count

  // Function to check if a date is today
  function checkIsToday(dateString: string): boolean {
    const formattedLessonDate = dateString.split("T")[0];
    const formattedToday = new Date().toISOString().split("T")[0];
    return formattedLessonDate === formattedToday;
  }

  // Format a date with day of week
  function formatDate(dateString: string): string {
    if (!dateString) return "TBD";
    const dateObj = new Date(dateString);
    return dateObj.toLocaleString("default", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  }

  // Format time
  function formatTime(timeString: string): string {
    if (!timeString) return "TBD";
    try {
      return new Date(`1970-01-01T${timeString}`).toLocaleTimeString(
        "default",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      );
    } catch (error) {
      console.error("Error formatting time:", error);
      return timeString;
    }
  }

  // Function to fetch the total lessons count for a profile
  async function fetchLessonsCountForProfile(
    profileId: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("lessons")
        .select("id", { count: "exact" })
        .eq("profile_id", profileId)
        .eq("school_id", schoolId);

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

  // Process a single lesson (handle avatar URL, today check, and lessons count)
  async function processLesson(
    lesson: UpcomingLesson
  ): Promise<UpcomingLesson> {
    try {
      const isTodayLesson = checkIsToday(lesson.date);
      const processedLesson = { ...lesson, isToday: isTodayLesson };

      // Process avatar if available
      if (lesson.profiles?.avatar_url) {
        try {
          const avatarUrl = await downloadAndSetUserAvatar(
            lesson.profiles.avatar_url
          );
          processedLesson.processed_avatar_url = avatarUrl;
        } catch (error) {
          console.error("Error processing avatar:", error);
        }
      }

      // Fetch and add the lessons count for this profile
      if (lesson.profile_id) {
        try {
          const lessonsCount = await fetchLessonsCountForProfile(
            lesson.profile_id
          );
          processedLesson.lessonsCount = lessonsCount;
        } catch (error) {
          console.error("Error fetching lessons count:", error);
        }
      }

      return processedLesson;
    } catch (error) {
      console.error("Error processing lesson:", error);
      return lesson;
    }
  }

  // Fetch all upcoming lessons
  async function fetchLessons() {
    setLoading(true);

    try {
      const startIndex = currentPage * itemsPerPage;
      const endIndex = startIndex + itemsPerPage - 1;

      // Fetch total count of lessons
      const { count, error: countError } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId)
        .gte("date", new Date().toISOString().split("T")[0]);

      if (countError) {
        console.error("Error fetching total lessons count:", countError);
        setLoading(false);
        return;
      }

      setTotalLessons(count || 0);

      const { data, error } = await supabase
        .from("lessons")
        .select(
          `id,
          date,
          time,
          amount_hours,
          profile_id,
          profiles (avatar_url, nome_utente)
        `
        )
        .eq("school_id", schoolId)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .order("time", { ascending: true })
        .range(startIndex, endIndex);

      if (error) throw error;

      if (data && data.length > 0) {
        console.log("Raw data from API:", data);

        // Process each lesson
        const processedLessons = await Promise.all(
          data.map((lesson) => processLesson(lesson as any))
        );

        setUpcomingLessons(processedLessons);

        // For debugging
        console.log("Today's date:", new Date().toISOString().split("T")[0]);
        console.log("Processed lessons:", processedLessons);
      } else {
        setUpcomingLessons([]);
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
    } finally {
      setLoading(false);
    }
  }

  // Load data on component mount
  useEffect(() => {
    if (isAdmin) {
      fetchLessons();
    }
  }, [isAdmin, currentPage]);

  // Group lessons
  const todayLessons = upcomingLessons.filter((lesson) => lesson.isToday);
  const futureLessons = upcomingLessons.filter((lesson) => !lesson.isToday);

  // Calculate the start and end item numbers for the current page
  const startIndex = currentPage * itemsPerPage + 1;
  const endIndex = Math.min((currentPage + 1) * itemsPerPage, totalLessons);

  // Calculate the total number of pages
  const totalPages = Math.ceil(totalLessons / itemsPerPage);

  // Function to generate page numbers array for display
  const getPageNumbers = () => {
    const pageNumbers = [];
    if (totalPages <= 5) {
      // If total pages is 5 or less, show all pages
      for (let i = 0; i < totalPages; i++) {
        pageNumbers.push(i + 1);
      }
    } else {
      // If total pages is more than 5, show a limited range
      if (currentPage < 2) {
        // Show first 5 pages
        for (let i = 0; i < 5; i++) {
          pageNumbers.push(i + 1);
        }
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      } else if (currentPage > totalPages - 3) {
        // Show last 5 pages
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = totalPages - 4; i < totalPages; i++) {
          pageNumbers.push(i + 1);
        }
      } else {
        // Show current page, 2 pages before and 2 pages after
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i + 1);
        }
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="container py-2 space-y-6">
      {user ? (
        isAdmin ? (
          <Card>
            <CardHeader>
              <h1 className="text-2xl font-bold tracking-tight">
                Prossime lezioni
              </h1>
              <p className="text-sm text-muted-foreground">
                Results: {startIndex}-{endIndex} di {totalLessons}
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">
                  Caricamento lezioni...
                </div>
              ) : upcomingLessons.length > 0 ? (
                <Table>
                  <TableCaption>
                    {totalPages > 1 ? (
                      <div className="flex justify-between items-center">
                        <Button
                          variant="outline"
                          disabled={currentPage === 0}
                          onClick={() => setCurrentPage(currentPage - 1)}
                        >
                          Precedenti
                        </Button>

                        {/* Page numbers */}
                        <div>
                          {pageNumbers.map((page, index) => (
                            <Button
                              key={index}
                              className="mx-1"
                              variant={
                                page === "..."
                                  ? "ghost"
                                  : currentPage + 1 === page
                                  ? "default"
                                  : "outline"
                              }
                              disabled={page === "..."}
                              onClick={() => {
                                if (typeof page === "number") {
                                  setCurrentPage(page - 1);
                                }
                              }}>
                              {page}
                            </Button>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          disabled={
                            currentPage >= totalPages - 1 ||
                            upcomingLessons.length < itemsPerPage ||
                            loading
                          }
                          onClick={() => setCurrentPage(currentPage + 1)}
                        >
                          Prossime
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        {upcomingLessons.length === 0
                          ? "Nessuna lezione trovata"
                          : `${upcomingLessons.length} ${
                              upcomingLessons.length === 1
                                ? "lezione"
                                : "lezioni"
                            } trovate`}
                      </div>
                    )}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        Studente
                      </TableHead>
                      <TableHead>
                        Data
                      </TableHead>
                      <TableHead>Ora</TableHead>
                      <TableHead>
                        Ore/lez.
                      </TableHead>
                      <TableHead className="text-right">
                        Azioni
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayLessons.length > 0 && (
                      <>
                        <TableRow className="">
                          <TableCell
                            colSpan={4}>
                            <div className="font-semibold py-1">
                              Oggi
                            </div>
                          </TableCell>
                        </TableRow>
                        {todayLessons.map((lesson) => (
                          <TableRow
                            key={lesson.id}
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/user-edit/${lesson.profile_id}`);
                            }}
                            title={`Click to view ${lesson.profiles?.nome_utente}'s profile`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Avatar
                                  size="sm"
                                  navbar={true}
                                  sourceUrl={lesson.processed_avatar_url || ""}
                                  lessonsCount={lesson.lessonsCount || 0}
                                />
                                <span>
                                  {lesson.profiles?.nome_utente || ""}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatDate(lesson.date)}
                            </TableCell>
                            <TableCell>
                              {formatTime(lesson.time)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={"outline"}
                                className="">
                                {lesson.amount_hours}h
                              </Badge>
                            </TableCell>
                            <TableCell
                              className="text-right"
                              onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/edit-lesson/${lesson?.id}`, {
                                    state: {
                                      profile: lesson.profiles,
                                    },
                                  });
                                }}>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="mr-1">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}

                    {futureLessons.length > 0 && (
                      <>
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="bg-muted">
                            <div className="font-semibold py-1">
                              Prossimamente
                            </div>
                          </TableCell>
                        </TableRow>
                        {futureLessons.map((lesson) => (
                          <TableRow
                            key={lesson.id}
                            className="cursor-pointer"
                            onClick={() =>
                              navigate(`/user-edit/${lesson.profile_id}`)
                            }
                            title={`Click to view ${lesson.profiles?.nome_utente}'s profile`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Avatar
                                  size="sm"
                                  navbar={true}
                                  sourceUrl={lesson.processed_avatar_url || ""}
                                  lessonsCount={lesson.lessonsCount || 0}
                                />
                                <span>
                                  {lesson.profiles?.nome_utente ||
                                    "Unknown Student"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatDate(lesson.date)}
                            </TableCell>
                            <TableCell>
                              {formatTime(lesson.time)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={"outline"}
                                className="">
                                {lesson.amount_hours}h
                              </Badge>
                            </TableCell>
                            <TableCell
                              className="text-right"
                              onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/edit-lesson/${lesson.id}`);
                                }}>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="mr-1">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4">
                  No upcoming lessons found
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div>Non sei un amministratore.</div>
        )
      ) : (
        <div>Please log in.</div>
      )}
    </div>
  );
}
