// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { seedSchool, service, signInAdmin } from "./helpers";

// A blocked update or delete is not an error: it matches 0 rows. So these tests
// check the row itself afterwards, with the service client.
describe("school separation", () => {
  let mine: Awaited<ReturnType<typeof seedSchool>>;
  let other: Awaited<ReturnType<typeof seedSchool>>;
  let admin: Awaited<ReturnType<typeof signInAdmin>>;

  const otherLessonTitle = async () => {
    const { data } = await service
      .from("lessons")
      .select("title")
      .eq("id", other.lesson.id)
      .single();
    return data?.title;
  };

  beforeAll(async () => {
    mine = await seedSchool(1);
    other = await seedSchool(2);
    admin = await signInAdmin(1);
  });

  it("shows an admin only their own school's lessons and students", async () => {
    const lessons = await admin.client.from("lessons").select("school_id");
    expect(lessons.data?.length).toBeGreaterThan(0);
    expect(new Set(lessons.data?.map((l) => l.school_id))).toEqual(
      new Set([mine.id])
    );

    const students = await admin.client
      .from("profiles")
      .select("school_id")
      .eq("is_student", true);
    expect(students.data?.length).toBeGreaterThan(0);
    expect(new Set(students.data?.map((s) => s.school_id))).toEqual(
      new Set([mine.id])
    );
  });

  it("hides another school and its topics", async () => {
    const school = await admin.client.from("schools").select("id").eq("id", other.id);
    expect(school.data).toEqual([]);

    const topic = await admin.client
      .from("lessons_items")
      .select("id")
      .eq("id", other.topic.id);
    expect(topic.data).toEqual([]);
  });

  it("refuses a lesson created in another school", async () => {
    const { error } = await admin.client.from("lessons").insert({
      profile_id: other.student.id,
      school_id: other.id,
      title: "Lezione di test",
    });
    expect(error?.code).toBe("42501");
  });

  it("leaves another school's lesson unchanged on update and delete", async () => {
    const title = await otherLessonTitle();

    await admin.client
      .from("lessons")
      .update({ title: "Modificata" })
      .eq("id", other.lesson.id);
    expect(await otherLessonTitle()).toBe(title);

    await admin.client.from("lessons").delete().eq("id", other.lesson.id);
    expect(await otherLessonTitle()).toBe(title);
  });

  it("leaves another school's student unchanged", async () => {
    await admin.client
      .from("profiles")
      .update({ nome_utente: "Modificato" })
      .eq("id", other.student.id);
    await admin.client.from("profiles").delete().eq("id", other.student.id);

    const { data } = await service
      .from("profiles")
      .select("nome_utente")
      .eq("id", other.student.id)
      .single();
    expect(data?.nome_utente).toBe(other.student.nome_utente);
  });

  it("refuses a topic added to another school's lesson", async () => {
    const { error } = await admin.client.from("lesson_item_associations").insert({
      lesson_id: other.lesson.id,
      lesson_item_id: mine.topic.id,
    });
    expect(error?.code).toBe("42501");
  });

  it("stops an admin moving themselves into another school", async () => {
    const { error } = await admin.client
      .from("profiles")
      .update({ school_id: other.id })
      .eq("id", admin.user.id);
    expect(error).not.toBeNull();

    const { data } = await service
      .from("profiles")
      .select("school_id")
      .eq("id", admin.user.id)
      .single();
    expect(data?.school_id).toBe(mine.id);
  });

  it("stops an admin making themselves a platform admin", async () => {
    const { error } = await admin.client
      .from("profiles")
      .update({ platform_admin: true })
      .eq("id", admin.user.id);
    expect(error).not.toBeNull();

    const { data } = await service
      .from("profiles")
      .select("platform_admin")
      .eq("id", admin.user.id)
      .single();
    expect(data?.platform_admin).toBeFalsy();
  });
});
