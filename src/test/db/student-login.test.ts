// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMember, seedSchool, service, signIn } from "./helpers";

// Today's students are records without a login, but an invite can still create a
// login with the student role, so these rules already apply to it.
describe("student login", () => {
  let school: Awaited<ReturnType<typeof seedSchool>>;
  let member: Awaited<ReturnType<typeof createMember>>;
  let client: Awaited<ReturnType<typeof signIn>>["client"];

  beforeAll(async () => {
    school = await seedSchool(1);
    member = await createMember(school.id, "student");
    client = (await signIn(member.email)).client;
  });

  afterAll(async () => {
    await member?.remove();
  });

  it("can't edit another student", async () => {
    await client
      .from("profiles")
      .update({ nome_utente: "Modificato" })
      .eq("id", school.student.id);

    const { data } = await service
      .from("profiles")
      .select("nome_utente")
      .eq("id", school.student.id)
      .single();
    expect(data?.nome_utente).toBe(school.student.nome_utente);
  });

  it("can't delete another student", async () => {
    await client.from("profiles").delete().eq("id", school.student.id);

    const { data } = await service
      .from("profiles")
      .select("id")
      .eq("id", school.student.id);
    expect(data).toHaveLength(1);
  });

  it("can't add a student", async () => {
    const { error } = await client.from("profiles").insert({
      school_id: school.id,
      email: "seed-test-new-student@flysupa.test",
      is_student: true,
    });
    expect(error?.code).toBe("42501");
  });

  it("can't remove another member from the school", async () => {
    const { data: owner } = await service
      .from("school_members")
      .select("user_id")
      .eq("school_id", school.id)
      .eq("role", "owner")
      .single();

    await client.from("school_members").delete().eq("user_id", owner!.user_id);

    const { data } = await service
      .from("school_members")
      .select("user_id")
      .eq("user_id", owner!.user_id);
    expect(data).toHaveLength(1);
  });

  // FS-75: the lessons rules only check the school, not the role. it.fails keeps CI
  // green while this is true, and turns red once it is fixed: then change it to it().
  it.fails("can't delete a lesson", async () => {
    const { data: lesson } = await service
      .from("lessons")
      .insert({
        profile_id: school.student.id,
        school_id: school.id,
        title: "Lezione di test (student login)",
      })
      .select("id")
      .single();

    await client.from("lessons").delete().eq("id", lesson!.id);

    const { data } = await service.from("lessons").select("id").eq("id", lesson!.id);
    await service.from("lessons").delete().eq("id", lesson!.id);
    expect(data).toHaveLength(1);
  });
});
