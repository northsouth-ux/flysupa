import React, { useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useState } from "react";
import { Profile, Lesson, LessonsTableProps, LessonItem } from "@/types";
import { supabase } from "../services/supabaseClient.tsx";
import ExpandableButton from "./ui/expandable-button.tsx";

// Shadcn Components
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "./ui/badge.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { ChevronDown, ChevronRight, X, Plus } from "lucide-react";

/**
 * Renders a table of lessons.
 *
 * @param profile - The profile object.
 * @param lessons - The array of lessons.
 * @param deleteLesson - The function to delete a lesson.
 * @param refetchLessons - The function to refetch lessons.
 */

export default function LessonsTable({
  profile,
  lessons,
  deleteLesson,
  refetchLessons,
}: LessonsTableProps) {
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<{
    id: string;
    profileId: string;
  } | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [availableItems, setAvailableItems] = useState<LessonItem[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isItemListOpen, setIsItemListOpen] = useState(false);
  const [selected, setSelected] = useState<LessonItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle row expansion
  const toggleRowExpansion = (lessonId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [lessonId]: !prev[lessonId],
    }));
  };

  // Handle key events in the command input
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

  // Function to fetch existing associations for this lesson
  const fetchExistingAssociations = async (lessonId: string) => {
    // First fetch the current profile's ID from the lesson to ensure we only get items for this user
    const { data: lessonData, error: lessonError } = await supabase
      .from("lessons")
      .select("profile_id")
      .eq("id", lessonId)
      .single();

    if (lessonError) {
      console.error("Error fetching lesson profile:", lessonError.message);
      return;
    }

    const profileId = lessonData?.profile_id;
    if (!profileId) {
      console.error("No profile ID found for this lesson");
      return;
    }

    // The lesson_item_associations table doesn't contain profile_id
    // So we use the lesson_id to get associations, but we've verified
    // this lesson belongs to the current profile
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
    } else {
      setSelected([]);
    }
  };

  // Fetch available lesson items with their completion status across all lessons
  const fetchAvailableItems = async (lessonId: string) => {
    try {
      // First fetch the current profile's ID from the lesson to ensure we only get items for this user
      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .select("profile_id")
        .eq("id", lessonId)
        .single();

      if (lessonError) {
        console.error("Error fetching lesson profile:", lessonError.message);
        return;
      }

      const profileId = lessonData?.profile_id;
      if (!profileId) {
        console.error("No profile ID found for this lesson");
        return;
      }

      // First fetch all available items
      const { data: allItems, error: itemsError } = await supabase
        .from("lessons_items")
        .select("*");

      if (itemsError) {
        console.error("Error fetching available items:", itemsError.message);
        return;
      }

      if (!allItems) {
        setAvailableItems([]);
        return;
      }

      // Fetch lesson item associations for all lessons tied to this profile
      // First get all lessons for this profile
      const { data: profileLessons, error: profileLessonsError } =
        await supabase.from("lessons").select("id").eq("profile_id", profileId);

      if (profileLessonsError) {
        console.error(
          "Error fetching profile lessons:",
          profileLessonsError.message
        );
        setAvailableItems(allItems);
        return;
      }

      // Extract lesson IDs
      const lessonIds = profileLessons?.map((lesson) => lesson.id) || [];

      // If there are no lessons, return empty items
      if (lessonIds.length === 0) {
        setAvailableItems(allItems);
        return;
      }

      // Fetch associations only for this profile's lessons
      const { data: allAssociations, error: allAssociationsError } =
        await supabase
          .from("lesson_item_associations")
          .select("lesson_id, lesson_item_id, completion_degree")
          .in("lesson_id", lessonIds); // Filter to only include lessons belonging to this profile

      if (allAssociationsError) {
        console.error(
          "Error fetching all associations:",
          allAssociationsError.message
        );
        setAvailableItems(allItems);
        return;
      }

      // Then fetch existing associations for this specific lesson to mark current items
      const {
        data: currentLessonAssociations,
        error: currentAssociationsError,
      } = await supabase
        .from("lesson_item_associations")
        .select("lesson_item_id, completion_degree")
        .eq("lesson_id", lessonId);

      if (currentAssociationsError) {
        console.error(
          "Error fetching current associations:",
          currentAssociationsError.message
        );
      }

      // Create a map of item_id to completion_degree for current lesson
      const currentLessonCompletionMap: Record<string, string | null> = {};
      const currentLessonItemsSet = new Set<string>();

      if (currentLessonAssociations) {
        currentLessonAssociations.forEach((assoc) => {
          // Mark all items associated with this lesson, regardless of completion degree
          currentLessonItemsSet.add(assoc.lesson_item_id);
          currentLessonCompletionMap[assoc.lesson_item_id] =
            assoc.completion_degree;
        });
      }

      // Create a map of item_id to its best completion degree across all lessons
      const globalCompletionMap: Record<
        string,
        { degree: string | null; lessonId: string | null }
      > = {};
      if (allAssociations) {
        allAssociations.forEach((assoc) => {
          // Skip associations for the current lesson (we handle those separately)
          if (assoc.lesson_id === lessonId) return;

          const currentBest = globalCompletionMap[assoc.lesson_item_id];
          // Prioritize "Mastered" over "Trained" degree
          if (
            !currentBest ||
            (assoc.completion_degree === "Mastered" &&
              currentBest.degree !== "Mastered")
          ) {
            globalCompletionMap[assoc.lesson_item_id] = {
              degree: assoc.completion_degree,
              lessonId: assoc.lesson_id,
            };
          }
        });
      }

      // Merge the completion degrees into the items
      const itemsWithCompletion = allItems.map((item) => {
        // Check if the item is associated with the current lesson
        const isInCurrentLesson = currentLessonItemsSet.has(item.id);

        return {
          ...item,
          // For items in the current lesson, use their completion degree
          // For other items, use null
          completion_degree: isInCurrentLesson
            ? currentLessonCompletionMap[item.id]
            : null,
          // Mark items as assigned to this lesson with a special flag
          inCurrentLesson: isInCurrentLesson,
          // Include global completion status separate from the current lesson
          global_completion: globalCompletionMap[item.id] || {
            degree: null,
            lessonId: null,
          },
        };
      });

      setAvailableItems(itemsWithCompletion);
    } catch (err) {
      console.error("Error in fetchAvailableItems:", err);
    }
  };

  // Open add item dialog
  const openAddItemDialog = async (lessonId: string) => {
    setSelectedLessonId(lessonId);
    await fetchAvailableItems(lessonId);
    await fetchExistingAssociations(lessonId);
    setIsAddItemOpen(true);

    // Reset input field and ensure it doesn't get focus when opened
    setInputValue("");
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }, 50);
  };

  // Cycle through completion degrees: null -> Trained -> Mastered -> null
  const cycleCompletionDegree = (
    currentDegree: string | null
  ): string | null => {
    if (!currentDegree) return "Trained";
    if (currentDegree === "Trained") return "Mastered";
    return null; // From Mastered back to null
  };

  // Update completion degree
  const updateCompletionDegree = async (
    lessonId: string,
    lessonItemId: string,
    currentDegree: string | null
  ) => {
    // Prevent multiple clicks while updating
    const updateKey = `${lessonId}-${lessonItemId}`;
    if (updating === updateKey) return;

    setUpdating(updateKey);

    try {
      // Verify the lesson belongs to the intended profile
      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .select("profile_id")
        .eq("id", lessonId)
        .single();

      if (lessonError) {
        console.error("Error fetching lesson profile:", lessonError.message);
        return;
      }

      const profileId = lessonData?.profile_id;
      if (!profileId) {
        console.error("No profile ID found for this lesson");
        return;
      }

      // Get next completion degree in the cycle
      const newCompletionDegree = cycleCompletionDegree(currentDegree);

      // Prepare updates object
      const updates = {
        completion_degree: newCompletionDegree,
      };

      // Use Supabase client for the update - lesson_item_associations doesn't have profile_id column
      const { error } = await supabase
        .from("lesson_item_associations")
        .update(updates)
        .match({
          lesson_id: lessonId,
          lesson_item_id: lessonItemId,
        });

      if (error) {
        console.error("Error updating completion degree:", error);
        return;
      }

      // Refresh the lessons data
      if (profile?.id) {
        if (refetchLessons) {
          // Use the provided refetch function if available
          await refetchLessons(profile.id);
        } else {
          // Fallback to local refresh
          await fetchLessonDetails(lessonId);
        }
      }
    } catch (err) {
      console.error("Error in updateCompletionDegree:", err);
    } finally {
      setUpdating(null);
    }
  };

  // Fetch updated lesson details
  const fetchLessonDetails = async (lessonId: string) => {
    try {
      // First get the lesson with profile_id to verify ownership
      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .select("*, profile_id") // Include profile_id in selection
        .eq("id", lessonId)
        .single();

      if (lessonError) {
        console.error("Error fetching lesson:", lessonError);
        return;
      }

      // Verify the lesson belongs to the expected profile
      if (profile && profile.id && lessonData.profile_id !== profile.id) {
        console.error("Lesson does not belong to the current profile");
        return;
      }

      // Then get the lesson details
      const { data: detailsData, error: detailsError } = await supabase
        .from("lesson_item_details_view")
        .select("*")
        .eq("lesson_id", lessonId);

      if (detailsError) {
        console.error("Error fetching lesson details:", detailsError);
        return;
      }

      // Update the lesson in the lessons array
      const updatedLesson = { ...lessonData, details: detailsData };

      // Update the lessons state
      const lessonIndex = lessons.findIndex((l) => l.id === lessonId);
      if (lessonIndex !== -1) {
        const updatedLessons = [...lessons];
        updatedLessons[lessonIndex] = updatedLesson;
        // We would need to set lessons here, but since it's passed as a prop,
        // we need to lift this state up to the parent component or use context
        // For now, we'll just rerender the component
        forceUpdate();
      }
    } catch (err) {
      console.error("Error fetching lesson details:", err);
    }
  };

  // Force component update
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  // Function to associate a single item to a lesson
  const associateItemToLesson = async (lessonId: string, itemId: string) => {
    if (!lessonId || !itemId) return;

    try {
      // Verify the lesson belongs to the intended profile
      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .select("profile_id")
        .eq("id", lessonId)
        .single();

      if (lessonError) {
        console.error("Error fetching lesson profile:", lessonError.message);
        return null;
      }

      const profileId = lessonData?.profile_id;
      if (!profileId) {
        console.error("No profile ID found for this lesson");
        return null;
      }

      // lesson_item_associations doesn't have a profile_id column
      const association = {
        lesson_id: lessonId,
        lesson_item_id: itemId,
      };

      // First update the UI immediately for better responsiveness
      // Create a new array with the updated item
      const updatedItems = availableItems.map((item) => {
        if (item.id === itemId) {
          // Mark this item as being in the current lesson
          return {
            ...item,
            inCurrentLesson: true,
            completion_degree: item.completion_degree || null, // Keep existing completion degree if any
          };
        }
        return item;
      });

      // Update the state to show the change immediately
      setAvailableItems(updatedItems);

      // Then make the API call
      const { data, error } = await supabase
        .from("lesson_item_associations")
        .insert([association]);

      if (error) {
        console.error("Error associating item to lesson:", error.message);
        // If there was an error, revert the UI change
        setAvailableItems(availableItems);
        return null;
      }

      console.log("Item associated successfully:", data);

      // Refresh lessons data
      if (profile?.id && refetchLessons) {
        await refetchLessons(profile.id);
      }

      return data;
    } catch (err) {
      console.error("Error in associateItemToLesson:", err);
      // If there was an error, revert the UI change
      setAvailableItems(availableItems);
      return null;
    }
  };

  // Function to remove an item association
  const removeItemAssociation = async (lessonId: string, itemId: string) => {
    if (!lessonId || !itemId) return;

    // Prevent multiple clicks while updating
    const updateKey = `${lessonId}-${itemId}`;
    if (updating === updateKey) return;

    setUpdating(updateKey);

    try {
      // Verify the lesson belongs to the intended profile
      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .select("profile_id")
        .eq("id", lessonId)
        .single();

      if (lessonError) {
        console.error("Error fetching lesson profile:", lessonError.message);
        return null;
      }

      const profileId = lessonData?.profile_id;
      if (!profileId) {
        console.error("No profile ID found for this lesson");
        return null;
      }

      // First update the UI immediately for better responsiveness
      // Create a backup of the current state for potential rollback
      const originalItems = [...availableItems];

      // Update the item's status and force UI refresh
      setAvailableItems(
        availableItems.map((item) =>
          item.id === itemId ? { ...item, inCurrentLesson: false } : item
        )
      );

      // Then make the API call
      const { error } = await supabase
        .from("lesson_item_associations")
        .delete()
        .match({
          lesson_id: lessonId,
          lesson_item_id: itemId,
        });

      if (error) {
        console.error("Error removing item association:", error.message);
        // Revert the UI change if there was an error
        setAvailableItems(originalItems);
        return null;
      }

      console.log("Item association removed successfully");

      // Refresh lessons data
      if (profile?.id && refetchLessons) {
        await refetchLessons(profile.id);
      } else {
        // Local refresh as fallback
        await fetchLessonDetails(lessonId);
      }
    } catch (err) {
      console.error("Error in removeItemAssociation:", err);
      // If error occurred after UI update, we should fetch fresh data
      if (selectedLessonId) {
        fetchAvailableItems(selectedLessonId);
      }
    } finally {
      setUpdating(null);
    }
  };

  return (
    <>
      <ExpandableButton profileId={profile?.id} refetch={refetchLessons} />
      <Table>
        <TableCaption>
          Lezioni registrate per {profile?.nome_utente}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Ora</TableHead>
            <TableHead>Ore/Lez.</TableHead>
            <TableHead className="text-right">
              Argomenti
            </TableHead>
            <TableHead className="text-right">
              Azioni
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lessons && lessons.length > 0 ? (
            lessons.map((lesson: any) => (
              <React.Fragment key={lesson.id}>
                <TableRow
                  className={clsx(
                    "cursor-pointer",
                    expandedRows[lesson.id] && "bg-muted"
                  )}
                  onClick={() => toggleRowExpansion(lesson.id)}>
                  <TableCell className="max-w-[100%]">
                    <div className="flex items-center">
                      <span className="mr-2">
                        {expandedRows[lesson.id] ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </span>
                      {lesson.date ? (
                        new Date(lesson.date).toLocaleString("default", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })
                      ) : (
                        <Badge
                          variant={"outline"}
                          className="">
                          tbd
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lesson.time ? (
                      new Date(`1970-01-01T${lesson.time}`).toLocaleTimeString(
                        "default",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        }
                      )
                    ) : (
                      <Badge
                        variant={"outline"}
                        className="">
                        tbd
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={"outline"}
                      className="">
                      {lesson.amount_hours}h
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    {lesson.details && lesson.details.length > 0 ? (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {lesson.details.length} argomenti
                        </span>
                      </>
                    ) : (
                      <span>N/A</span>
                    )}
                  </TableCell>

                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mr-2"
                        onClick={() =>
                          navigate(`/edit-lesson/${lesson?.id}`, {
                            state: {
                              profileId: profile?.id,
                            },
                          })
                        }>
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
                        variant="destructive"
                        size="sm"
                        className=""
                        onClick={(e) => {
                          e.stopPropagation();
                          setLessonToDelete({
                            id: lesson.id,
                            profileId: profile?.id as string,
                          });
                          setIsDeleteDialogOpen(true);
                        }}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expanded content row */}
                {expandedRows[lesson.id] && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-2">
                      <div className="ml-2 py-2">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium">
                            Dettagli argomenti
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
                          {lesson.details?.length > 0
                            ? lesson.details
                                .slice() // Create a copy to avoid mutating the original array
                                .sort(
                                  (a: any, b: any) =>
                                    a.lesson_item_id - b.lesson_item_id
                                ) // Sort by lesson_item_id
                                .map((detail: any, index: number) => (
                                  <div
                                    key={index}
                                    className={clsx(
                                      "flex items-center bg-muted p-2 rounded cursor-pointer transition-all",
                                      updating ===
                                        `${lesson.id}-${detail.lesson_item_id}` &&
                                        "opacity-50",
                                      !updating &&
                                        "hover:bg-slate-200"
                                    )}
                                    onClick={() =>
                                      updateCompletionDegree(
                                        lesson.id,
                                        detail.lesson_item_id,
                                        detail.completion_degree
                                      )
                                    }>
                                    <Badge
                                      className={clsx(
                                        "mr-2",
                                        !detail.completion_degree &&
                                          "bg-[#aeaeae]",
                                        detail.completion_degree ===
                                          "Trained" &&
                                          "bg-orange-500 dark:bg-orange-400",
                                        detail.completion_degree ===
                                          "Mastered" &&
                                          "bg-[#0d580d] dark:bg-green-500"
                                      )}>
                                      {detail.lesson_item_id}
                                    </Badge>
                                    <span className="text-xs truncate">
                                      {detail.title || "Argomento"}
                                    </span>
                                    {updating ===
                                    `${lesson.id}-${detail.lesson_item_id}` ? (
                                      <span className="ml-auto text-xs animate-pulse">
                                        Updating...
                                      </span>
                                    ) : (
                                      <div className="ml-auto flex items-center gap-2">
                                        {detail.completion_degree && (
                                          <Badge
                                            className="text-xs"
                                            variant="outline">
                                            {detail.completion_degree}
                                          </Badge>
                                        )}
                                        <Badge
                                          variant="outline"
                                          className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeItemAssociation(
                                              lesson.id,
                                              detail.lesson_item_id
                                            );
                                          }}>
                                          <X className="h-3 w-3 font-black" />
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                ))
                            : null}

                          <Button
                            size="icon"
                            variant="outline"
                            className="flex w-full items-center bg-muted p-2 rounded bg-gray-400 text-white cursor-pointer transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddItemDialog(lesson.id);
                            }}>
                            Aggiungi
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center">
                Nessuna lezione disponibile
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Conferma eliminazione
            </DialogTitle>
            <DialogDescription>
              Sei sicuro di voler cancellare la lezione {lessonToDelete?.id}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="">
              Annulla
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="dark:bg-red-600 dark:hover:bg-red-700"
              onClick={() => {
                if (lessonToDelete) {
                  deleteLesson(lessonToDelete.id, lessonToDelete.profileId);
                  setIsDeleteDialogOpen(false);
                }
              }}>
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Aggiungi Argomenti
            </DialogTitle>
            <DialogDescription>
              Seleziona uno o più argomenti da aggiungere alla lezione.
              <span className="block mt-1 text-amber-500 dark:text-amber-400 text-sm">
                Gli argomenti già "Trained" (arancione) o "Mastered" (verde)
                sono mostrati nell'area sinistra.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <Command
              onKeyDown={handleKeyDown}
              className="overflow-visible bg-transparent select-none">
              <div className="group border border-input rounded-md px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <CommandPrimitive.Input
                  ref={inputRef}
                  value={inputValue}
                  onValueChange={setInputValue}
                  onBlur={() => setIsItemListOpen(false)}
                  onFocus={() => setIsItemListOpen(true)}
                  placeholder="Cerca argomenti..."
                  autoFocus={false}
                  readOnly={true}
                  onClick={() => {
                    setIsItemListOpen(true);
                    if (inputRef.current) {
                      // Remove readonly attribute when clicked, but not on mobile/tablet
                      if (window.innerWidth > 768) {
                        inputRef.current.readOnly = false;
                      }
                    }
                  }}
                  className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground no-select no-keyboard-mobile"
                />
              </div>
              <div className="relative mt-2">
                <CommandList>
                  {isItemListOpen && availableItems.length > 0 ? (
                    <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
                      <div className="flex divide-x">
                        {/* LEFT COLUMN - Items with completion status */}
                        <div className="w-1/2">
                          <CommandGroup className="h-[350px] overflow-auto select-none">
                            {/* Add a header for items already assigned to THIS lesson */}
                            {availableItems.some(
                              (item) =>
                                item.title &&
                                String(item.title)
                                  .toLowerCase()
                                  .includes(inputValue.toLowerCase()) &&
                                item.inCurrentLesson
                            ) && (
                              <div className="py-2 px-2 text-xs font-medium text-muted-foreground border-b">
                                Argomenti già assegnati in questa lezione
                              </div>
                            )}

                            {/* Show items already assigned to THIS lesson, including selected items from the right */}
                            {availableItems
                              .filter(
                                (item) =>
                                  item.title &&
                                  String(item.title)
                                    .toLowerCase()
                                    .includes(inputValue.toLowerCase()) &&
                                  item.inCurrentLesson
                              )
                              .sort((a, b) => Number(a.id) - Number(b.id))
                              .map((item) => (
                                <CommandItem
                                  key={item.id}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  className="cursor-pointer select-none">
                                  <div className="flex items-center w-full">
                                    <span>
                                      {item.id} - {item.title}
                                    </span>
                                    <div className="ml-auto flex items-center gap-2">
                                      {item.completion_degree && (
                                        <Badge
                                          className={clsx(
                                            item.completion_degree ===
                                              "Trained" &&
                                              "bg-orange-500 dark:bg-orange-400",
                                            item.completion_degree ===
                                              "Mastered" &&
                                              "bg-[#0d580d] dark:bg-green-500"
                                          )}>
                                          {item.completion_degree === "Trained"
                                            ? "Visto"
                                            : ""}
                                          {item.completion_degree === "Mastered"
                                            ? "Capito"
                                            : ""}
                                        </Badge>
                                      )}
                                      {/* Only show delete button if completion_degree is not "Mastered" */}
                                      {item.completion_degree !==
                                        "Mastered" && (
                                        <Badge
                                          variant="outline"
                                          className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (selectedLessonId) {
                                              removeItemAssociation(
                                                selectedLessonId,
                                                item.id
                                              );
                                              // The removeItemAssociation function now updates the UI directly
                                            }
                                          }}>
                                          <X className="h-3 w-3 font-black" />
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}

                            {/* Add a divider and header for items with any status from other lessons */}
                            {availableItems.some(
                              (item) =>
                                item.title &&
                                String(item.title)
                                  .toLowerCase()
                                  .includes(inputValue.toLowerCase()) &&
                                (item.global_completion?.degree ||
                                  item.global_completion?.lessonId) && // Include any items associated with other lessons
                                !item.completion_degree &&
                                !selected.some((s) => s.id === item.id)
                            ) && (
                              <div className="py-2 px-2 text-xs font-medium text-muted-foreground border-t border-b">
                                Argomenti presenti in altre lezioni
                              </div>
                            )}

                            {/* Show items with any status from other lessons, WITH and WITHOUT completion degree */}
                            {availableItems
                              .filter(
                                (item) =>
                                  item.title &&
                                  String(item.title)
                                    .toLowerCase()
                                    .includes(inputValue.toLowerCase()) &&
                                  (item.global_completion?.degree ||
                                    item.global_completion?.lessonId) && // Include any items associated with other lessons
                                  !item.completion_degree &&
                                  !selected.some((s) => s.id === item.id)
                              )
                              .sort((a, b) => {
                                // Sort by status (Mastered first, then Trained, then null)
                                if (
                                  a.global_completion?.degree === "Mastered" &&
                                  b.global_completion?.degree !== "Mastered"
                                )
                                  return -1;
                                if (
                                  a.global_completion?.degree !== "Mastered" &&
                                  b.global_completion?.degree === "Mastered"
                                )
                                  return 1;
                                if (
                                  a.global_completion?.degree === "Trained" &&
                                  !b.global_completion?.degree
                                )
                                  return -1;
                                if (
                                  !a.global_completion?.degree &&
                                  b.global_completion?.degree === "Trained"
                                )
                                  return 1;
                                // Then by ID
                                return Number(a.id) - Number(b.id);
                              })
                              .map((item) => (
                                <CommandItem
                                  key={item.id}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onSelect={async () => {
                                    setInputValue("");
                                    await associateItemToLesson(
                                      selectedLessonId as string,
                                      item.id
                                    );
                                    // The associateItemToLesson function now updates the UI directly
                                  }}
                                  className="cursor-pointer select-none">
                                  <div className="flex items-center w-full">
                                    <span>
                                      {item.id} - {item.title}
                                    </span>
                                    {item.global_completion?.degree ? (
                                      <Badge
                                        className={clsx(
                                          "ml-auto",
                                          item.global_completion.degree ===
                                            "Trained" &&
                                            "bg-orange-500 dark:bg-orange-400",
                                          item.global_completion.degree ===
                                            "Mastered" &&
                                            "bg-[#0d580d] dark:bg-green-500"
                                        )}>
                                        {item.global_completion.degree ===
                                        "Trained"
                                          ? "Visto"
                                          : " "}
                                        {item.global_completion.degree ===
                                        "Mastered"
                                          ? "Capito"
                                          : " "}
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="ml-auto text-xs">
                                        In altra lezione
                                      </Badge>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </div>

                        {/* RIGHT COLUMN - Only unassigned items (no completion status) */}
                        <div className="w-1/2">
                          <CommandGroup className="h-[350px] overflow-auto select-none">
                            <div className="py-2 px-2 text-xs font-medium text-muted-foreground border-b">
                              Argomenti disponibili senza stato
                            </div>

                            {availableItems
                              .filter(
                                (item) =>
                                  item.title &&
                                  String(item.title)
                                    .toLowerCase()
                                    .includes(inputValue.toLowerCase()) &&
                                  !item.inCurrentLesson &&
                                  !item.global_completion?.degree &&
                                  !item.global_completion?.lessonId
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
                                      await associateItemToLesson(
                                        selectedLessonId as string,
                                        item.id
                                      );
                                      // The associateItemToLesson function now updates the UI directly
                                    }}
                                    className="cursor-pointer select-none">
                                    {item.id} - {item.title}
                                  </CommandItem>
                                );
                              })}
                          </CommandGroup>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CommandList>
              </div>
            </Command>
          </div>

          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddItemOpen(false)}
              className="">
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function NoLessons({
  profileId,
  refetchLessons,
}: {
  refetchLessons: (profileId: string) => Promise<void>;
  profileId: string;
}) {
  return (
    <div className="text-left py-4 text-muted-foreground">
      <ExpandableButton profileId={profileId} refetch={refetchLessons} />
    </div>
  );
}

export function LoadingLessons() {
  return <div className="text-center py-4">Caricamento lezioni...</div>;
}
