// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { seedSchool, service, signInAdmin } from "./helpers";

const TITLE = "Lezione di test";

describe("lessons", () => {
  let school: Awaited<ReturnType<typeof seedSchool>>;
  let admin: Awaited<ReturnType<typeof signInAdmin>>["client"];

  const createLesson = async () => {
    const { data, error } = await admin
      .from("lessons")
      .insert({
        profile_id: school.student.id,
        school_id: school.id,
        title: TITLE,
        date: "2030-01-15",
        time: "10:00:00",
        amount_hours: 1,
      })
      .select()
      .single();
    expect(error).toBeNull();
    return data!;
  };

  beforeAll(async () => {
    school = await seedSchool(1);
    admin = (await signInAdmin(1)).client;
  });

  afterEach(async () => {
    await service.from("lessons").delete().eq("title", TITLE);
  });

  it("creates a lesson that the school can see", async () => {
    const lesson = await createLesson();

    const { data } = await admin
      .from("lessons")
      .select("title, date, time, amount_hours, profile_id")
      .eq("id", lesson.id)
      .single();
    expect(data).toEqual({
      title: TITLE,
      date: "2030-01-15",
      time: "10:00:00",
      amount_hours: 1,
      profile_id: school.student.id,
    });
  });

  it("shows the student's name next to the lesson", async () => {
    const lesson = await createLesson();

    const { data, error } = await admin
      .from("lessons")
      .select("id, profiles(nome_utente)")
      .eq("id", lesson.id)
      .single();
    expect(error).toBeNull();
    expect(data?.profiles?.nome_utente).toBe(school.student.nome_utente);
  });

  it("changes a lesson's date and time", async () => {
    const lesson = await createLesson();

    const { error } = await admin
      .from("lessons")
      .update({ date: "2030-02-20", time: "14:30:00", amount_hours: 2 })
      .eq("id", lesson.id);
    expect(error).toBeNull();

    const { data } = await service
      .from("lessons")
      .select("date, time, amount_hours")
      .eq("id", lesson.id)
      .single();
    expect(data).toEqual({
      date: "2030-02-20",
      time: "14:30:00",
      amount_hours: 2,
    });
  });

  it("deletes a lesson", async () => {
    const lesson = await createLesson();

    const { error } = await admin.from("lessons").delete().eq("id", lesson.id);
    expect(error).toBeNull();

    const { data } = await service.from("lessons").select("id").eq("id", lesson.id);
    expect(data).toEqual([]);
  });

  it("adds and removes a topic on a lesson", async () => {
    const lesson = await createLesson();
    const link = { lesson_id: lesson.id, lesson_item_id: school.topic.id };

    const added = await admin.from("lesson_item_associations").insert([link]);
    expect(added.error).toBeNull();

    const shown = await admin
      .from("lesson_item_details_view")
      .select("lesson_item_id")
      .eq("lesson_id", lesson.id);
    expect(shown.data).toEqual([{ lesson_item_id: school.topic.id }]);

    const removed = await admin
      .from("lesson_item_associations")
      .delete()
      .match(link);
    expect(removed.error).toBeNull();

    const left = await service
      .from("lesson_item_associations")
      .select("lesson_item_id")
      .eq("lesson_id", lesson.id);
    expect(left.data).toEqual([]);
  });
});
