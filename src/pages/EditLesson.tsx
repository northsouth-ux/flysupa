"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient.tsx";
import { useUser } from "@/hooks/useUser";
import { Lesson, LessonItem, Profile } from "@/types";
import { X, ArrowLeft } from "lucide-react";

/**
 * EditLesson Component
 *
 * This component is responsible for editing a specific lesson. It allows users to:
 * - View and edit the details of a lesson, including its date, duration, and content.
 * - Manage associations between the lesson and various lesson items.
 * - Display user profile information related to the lesson.
 * - Provide a user-friendly interface for selecting and deselecting lesson items.
 *
 * Key functionalities include:
 * - Fetching lesson details, user profile, and available lesson items from the database.
 * - Handling the selection and deselection of lesson items with real-time updates.
 * - Associating and removing lesson items from the lesson in the database.
 * - Displaying the total number of lessons assigned to the user profile.
 * - Navigating back to the previous page.
 *
 * The component uses various hooks such as useState, useEffect, useRef, and useCallback
 * to manage state, side effects, and performance optimizations.
 */

import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Avatar from "@/components/Avatar";
import { Input } from "@/components/ui/input.tsx";
import ExpandableButton from "@/components/ui/expandable-button.tsx";

export default function EditLesson() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { schoolId } = useUser();

  // Handling props via state parameters originating from the useNavigate in LessonsTable.tsx
  const location = useLocation();

  const [lessonsCount, setLessonsCount] = useState<number>(0);
  const [lesson, setLesson] = useState<Lesson>();

  const [profile, setProfile] = useState<Profile>();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [selected, setSelected] = useState<LessonItem[]>([]);
  const [availableItems, setAvailableItems] = useState<LessonItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");

  const [open, setOpen] = useState(false);

  const handleUnselect = useCallback(
    async (item: LessonItem) => {
      // Update UI immediately for better UX
      setSelected((prev) => prev.filter((s) => s.id !== item.id));

      // Remove the association from the database
      if (lesson?.id) {
        await removeItemAssociation(lesson.id, item.id);
      }
    },
    [lesson?.id]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "") {
            setSelected((prev) => {
              const newSelected = [...prev];
              newSelected.pop();
              return newSelected;
            });
          }
        }
        if (e.key === "Escape") {
          input.blur();
        }
      }
    },
    []
  );

  async function fetchLessonById(id: any) {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching lesson:", error.message);
      return null;
    }
    setLesson(data);
  }

  async function fetchAvailableItems() {
    const { data, error } = await supabase.from("lessons_items").select("*");

    if (error) {
      console.error("Error fetching available items:", error.message);
      return null;
    }
    setAvailableItems(data);
  }

  // Function to associate a single item to a lesson
  async function associateItemToLesson(lessonId: string, itemId: string) {
    const association = {
      lesson_id: lessonId,
      lesson_item_id: itemId,
    };

    const { data, error } = await supabase
      .from("lesson_item_associations")
      .insert([association]);

    if (error) {
      console.error("Error associating item to lesson:", error.message);
      return null;
    }

    console.log("Item associated successfully:", data);
    return data;
  }

  // Function to remove an item association
  async function removeItemAssociation(lessonId: string, itemId: string) {
    const { data, error } = await supabase
      .from("lesson_item_associations")
      .delete()
      .match({
        lesson_id: lessonId,
        lesson_item_id: itemId,
      });

    if (error) {
      console.error("Error removing item association:", error.message);
      return null;
    }

    console.log("Item association removed successfully:", data);
    return data;
  }

  // Function to fetch existing associations for this lesson
  async function fetchExistingAssociations(lessonId: string) {
    const { data, error } = await supabase
      .from("lesson_item_associations")
      .select("*, lessons_items!lesson_item_id(*)")
      .eq("lesson_id", lessonId);

    if (error) {
      console.error("Error fetching existing associations:", error.message);
      return;
    }

    if (data && data.length > 0) {
      // Extract the lesson items from the associations and set them as selected
      const selectedItems = data.map(
        (association) => association.lessons_items
      );
      setSelected(selectedItems);
    }
  }

  async function fetchLessonsCount(lessonId: string) {
    // Step 1: Retrieve the profile_id from the lessons table
    const { data: lessonData, error: lessonError } = await supabase
      .from("lessons")
      .select("profile_id")
      .eq("id", lessonId)
      .single();

    if (lessonError) {
      console.error("Error fetching lesson:", lessonError);
    } else {
      const profileId = lessonData.profile_id;

      // Step 2: Count the total lessons assigned to the retrieved profile_id
      const { data: lessonsCountData, error: countError } = await supabase
        .from("lessons")
        .select("id", { count: "exact" })
        .eq("profile_id", profileId);

      if (countError) {
        console.error("Error counting lessons:", countError);
      } else {
        console.log(
          "Total lessons assigned to the profile:",
          lessonsCountData.length
        );
        setLessonsCount(lessonsCountData.length);
      }
    }
  }

  async function fetchProfileFromLessonId(lessonId: string) {
    // API call to get the profile data linked to the specified lessonId
    const { data: profileData, error } = await supabase
      .from("lessons")
      .select(
        `
        profiles(*)
      `
      )
      .eq("id", lessonId)
      .eq("school_id", schoolId)
      .single();

    if (error) {
      console.error("Error fetching profile data:", error);
    } else {
      const profile = (profileData as any)?.profiles as Profile;
      setProfile(profile);
      if (profile?.avatar_url) {
        getAvatarUrl(profile.avatar_url);
      }
    }
  }

  async function getAvatarUrl(path: string): Promise<void> {
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      console.log("error", url);

      setAvatarUrl(url);
    } catch (error) {
      console.log("error", error);
    }
  }

  // Add no-select class to body when component is active
  useEffect(() => {
    // Add the no-select class to prevent text selection in mobile
    document.body.classList.add("no-select");

    // Return cleanup function
    return () => {
      document.body.classList.remove("no-select");
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchProfileFromLessonId(id);
    fetchLessonById(id);
    fetchAvailableItems();
    fetchExistingAssociations(id);
    fetchLessonsCount(id);
  }, [id]);

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="mr-2 hover:bg-slate-100"
            aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Modifica Lezione
          </h1>
          {lesson && lesson.id && (
            <Badge
              className="ml-2 mt-1.5"
              variant="outline">
              {lesson.id}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader />
          <CardContent className="mb-4">
            <div className="flex flex-row items-center justify-between">
              {/* Section 1: Avatar and User info */}
              <div className="flex items-center gap-3">
                {profile && (
                  <Avatar
                    size="sm"
                    lessonsCount={lessonsCount}
                    navbar={true}
                    userEditForm={true}
                    sourceUrl={avatarUrl || undefined}
                  />
                )}
                <div className="flex flex-col ml-8">
                  <span className="font-medium">
                    Utente
                  </span>
                  <span className="text-sm">
                    {profile?.nome_utente || "N/A"}
                  </span>
                  <div className="mt-1"></div>
                  <Badge
                    className={
                      profile?.sensibilizzazione
                        ? "bg-[#23c55d] dark:bg-[#23c55d] "
                        : "bg-gray-400"
                    }
                    variant={
                      profile?.sensibilizzazione ? undefined : "outline"
                    }>
                    {profile?.sensibilizzazione
                      ? "Sensibilizzazione"
                      : "No Sensibilizzazione"}
                  </Badge>
                  <div className="mt-1"></div>
                  <Badge
                    className={
                      profile?.soccorritori
                        ? "bg-[#23c55d] dark:bg-[#23c55d] "
                        : "bg-gray-400"
                    }
                    variant={profile?.soccorritori ? undefined : "outline"}>
                    {profile?.soccorritori ? "Soccorritore" : "No Soccorritore"}
                  </Badge>
                </div>
              </div>

              {/* Section 2: Status badges */}
              <div className="flex flex-col items-center "></div>
              {/* Section 3: Lesson count */}
              <div className="flex flex-col items-center mr-12">
                <span className="text-3xl font-bold">
                  {lessonsCount || 0}
                </span>
                <span className="text-xs">
                  Lezioni totali
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Data</CardTitle>
              <CardDescription>
                Data e durata della lezione
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-row justify-start">
              <ExpandableButton
                lesson={lesson}
                lessonId={lesson?.id}
                profileId={profile?.id}
                expanded={true}
                refetch={fetchLessonById}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contenuto</CardTitle>
              <CardDescription>
                Temi e argomenti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Command
                onKeyDown={handleKeyDown}
                className="overflow-visible bg-transparent select-none">
                <div className="group border border-input rounded-md px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <div className="flex flex-wrap gap-1">
                    {selected.map((item) => {
                      return (
                        <Badge
                          key={item.id}
                          variant="secondary"
                          className="text-md">
                          {item.id} - {item.title}
                          <button
                            className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUnselect(item);
                              }
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={() => handleUnselect(item)}>
                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </button>
                        </Badge>
                      );
                    })}
                    <CommandPrimitive.Input
                      ref={inputRef}
                      value={inputValue}
                      onValueChange={setInputValue}
                      onBlur={() => setOpen(false)}
                      onFocus={() => setOpen(true)}
                      placeholder="Seleziona..."
                      autoFocus={false}
                      readOnly={true}
                      onClick={() => {
                        setOpen(true);
                        if (inputRef.current) {
                          // Remove readonly attribute when clicked, but not on mobile/tablet
                          if (window.innerWidth > 768) {
                            inputRef.current.readOnly = false;
                          }
                        }
                      }}
                      className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground no-select no-keyboard-mobile"
                    />
                  </div>
                </div>
                <div className="relative mt-2">
                  <CommandList>
                    {open && availableItems.length > 0 ? (
                      <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                        <CommandGroup className="h-[250px] overflow-auto select-none">
                          {availableItems
                            .filter(
                              (item) => !selected.some((s) => s.id === item.id)
                            )
                            .sort((a, b) => Number(a.id) - Number(b.id))
                            .map((item) => {
                              return (
                                <CommandItem
                                  key={item.id}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onSelect={async (value) => {
                                    setInputValue("");
                                    setSelected((prev) => [...prev, item]);
                                    await associateItemToLesson(
                                      lesson?.id as string,
                                      item.id
                                    );
                                  }}
                                  className="cursor-pointer select-none">
                                  {item.id} - {item.title}
                                </CommandItem>
                              );
                            })}
                        </CommandGroup>
                      </div>
                    ) : null}
                  </CommandList>
                </div>
              </Command>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
