// @vitest-environment node
import { describe, expect, it } from "vitest";
import { anonClient, seedSchool, signIn, signInAdmin } from "./helpers";

describe("login", () => {
  it("gives an admin their profile and school", async () => {
    const school = await seedSchool(1);
    const { client, user } = await signInAdmin(1);

    const { data: profile } = await client
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();
    expect(profile?.school_id).toBe(school.id);

    const { data: membership } = await client
      .from("school_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("school_id", school.id)
      .single();
    expect(membership?.role).toBe("owner");
  });

  it("refuses a wrong password", async () => {
    await expect(
      signIn("seed-admin-1@flysupa.test", "wrong-password")
    ).rejects.toThrow("Login failed");
  });

  it("shows a logged-out visitor no lessons or students", async () => {
    const client = anonClient();
    const lessons = await client.from("lessons").select("id");
    const students = await client.from("profiles").select("id");

    expect(lessons.data ?? []).toEqual([]);
    expect(students.data ?? []).toEqual([]);
  });
});
