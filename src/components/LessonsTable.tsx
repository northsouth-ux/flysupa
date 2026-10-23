import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
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
} from "@/components/ui/dialog";
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

  // Toggle row expansion
  const toggleRowExpansion = (lessonId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [lessonId]: !prev[lessonId],
    }));
  };

  // Fetch all lesson items and mark which ones are already in this lesson.
  // Two parallel queries (was previously ~7 sequential round-trips).
  const fetchAvailableItems = async (lessonId: string) => {
    try {
      const [itemsRes, assocRes] = await Promise.all([
        supabase
          .from("lessons_items")
          .select("id, title, description")
          .order("id"),
        supabase
          .from("lesson_item_associations")
          .select("lesson_item_id")
          .eq("lesson_id", lessonId),
      ]);

      if (itemsRes.error) {
        console.error("Error fetching available items:", itemsRes.error.message);
        return;
      }

      const inLesson = new Set(
        (assocRes.data || []).map((a: any) => String(a.lesson_item_id))
      );

      setAvailableItems(
        (itemsRes.data || []).map((item: any) => ({
          ...item,
          inCurrentLesson: inLesson.has(String(item.id)),
        }))
      );
    } catch (err) {
      console.error("Error in fetchAvailableItems:", err);
    }
  };

  // Open the add-item dialog
  const openAddItemDialog = async (lessonId: string) => {
    setSelectedLessonId(lessonId);
    await fetchAvailableItems(lessonId);
    setIsAddItemOpen(true);
  };

  // Associate an item to the lesson. Optimistic: no ownership verification
  // round-trip, no awaited refetch — the UI updates immediately.
  const associateItemToLesson = async (lessonId: string, itemId: string) => {
    if (!lessonId || !itemId) return;

    setAvailableItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, inCurrentLesson: true } : item
      )
    );

    const { error } = await supabase
      .from("lesson_item_associations")
      .insert([{ lesson_id: lessonId, lesson_item_id: itemId }]);

    if (error) {
      console.error("Error associating item to lesson:", error.message);
      setAvailableItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, inCurrentLesson: false } : item
        )
      );
      return;
    }

    // Refresh the parent's lesson details in the background
    if (profile?.id && refetchLessons) refetchLessons(profile.id);
  };

  // Remove an item from the lesson. Optimistic.
  const removeItemAssociation = async (lessonId: string, itemId: string) => {
    if (!lessonId || !itemId) return;

    const updateKey = `${lessonId}-${itemId}`;
    if (updating === updateKey) return;
    setUpdating(updateKey);

    setAvailableItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, inCurrentLesson: false } : item
      )
    );

    const { error } = await supabase
      .from("lesson_item_associations")
      .delete()
      .match({ lesson_id: lessonId, lesson_item_id: itemId });

    if (error) {
      console.error("Error removing item association:", error.message);
      setAvailableItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, inCurrentLesson: true } : item
        )
      );
    }

    if (profile?.id && refetchLessons) refetchLessons(profile.id);
    setUpdating(null);
  };

  const inLessonItems = availableItems.filter((item) => item.inCurrentLesson);
  const availableForLesson = availableItems.filter(
    (item) => !item.inCurrentLesson
  );

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
                        <Badge variant={"outline"} className="">
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
                      <Badge variant={"outline"} className="">
                        tbd
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge variant={"outline"} className="">
                      {lesson.amount_hours}h
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    {lesson.details && lesson.details.length > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {lesson.details.length} argomenti
                      </span>
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
                        <div className="grid grid-cols-1 gap-2">
                          {lesson.details?.length > 0
                            ? lesson.details
                                .slice()
                                .sort(
                                  (a: any, b: any) =>
                                    a.lesson_item_id - b.lesson_item_id
                                )
                                .map((detail: any, index: number) => (
                                  <div
                                    key={index}
                                    className={clsx(
                                      "flex items-center bg-muted p-2 rounded",
                                      updating ===
                                        `${lesson.id}-${detail.lesson_item_id}` &&
                                        "opacity-50"
                                    )}>
                                    <span className="text-xs truncate">
                                      {detail.title || "Argomento"}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="ml-auto cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30"
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
                                ))
                            : null}

                          <Button
                            size="icon"
                            variant="outline"
                            className="flex w-full items-center bg-muted p-2 rounded bg-gray-400 text-white cursor-pointer"
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
              <TableCell colSpan={5} className="text-center">
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
            <DialogTitle>Conferma eliminazione</DialogTitle>
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

      {/* Add Item Dialog — 2 columns: available | in this lesson */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Aggiungi Argomenti</DialogTitle>
            <DialogDescription>
              Seleziona gli argomenti da trattare in questa lezione.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {/* LEFT — available topics */}
            <div>
              <h4 className="mb-2 text-sm font-medium">
                Argomenti disponibili
              </h4>
              <div className="h-[320px] overflow-auto rounded-md border p-1">
                {availableForLesson.length > 0 ? (
                  availableForLesson.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        associateItemToLesson(
                          selectedLessonId as string,
                          item.id
                        )
                      }
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-muted">
                      <span>{item.title}</span>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))
                ) : (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    Tutti gli argomenti sono nella lezione.
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT — topics in this lesson */}
            <div>
              <h4 className="mb-2 text-sm font-medium">
                Argomenti da trattare in questa lezione
              </h4>
              <div className="h-[320px] overflow-auto rounded-md border p-1">
                {inLessonItems.length > 0 ? (
                  inLessonItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted">
                      <span>{item.title}</span>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30"
                        onClick={() =>
                          removeItemAssociation(
                            selectedLessonId as string,
                            item.id
                          )
                        }>
                        <X className="h-3 w-3" />
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    Nessun argomento selezionato.
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-end">
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
