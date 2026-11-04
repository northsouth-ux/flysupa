// Helpers for the database tests. They run against the local Supabase only, seeded
// with `npm run seed`. The URL is fixed so a test can never write to a hosted project.
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";

const LOCAL_URL = "http://127.0.0.1:54321";
const SEED_PASSWORD = "SeedPass123!";

function localKeys() {
  let status: string;
  try {
    status = execSync("supabase status -o env", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error(
      "Local Supabase is not running. Run npm run db:start and npm run seed first."
    );
  }
  const read = (name: string) => {
    const value = status.match(new RegExp(`^${name}="(.*)"$`, "m"))?.[1];
    if (!value) throw new Error(`${name} is missing from supabase status`);
    return value;
  };
  return { anon: read("ANON_KEY"), service: read("SERVICE_ROLE_KEY") };
}

const keys = localKeys();
const options = { auth: { persistSession: false, autoRefreshToken: false } };

// Bypasses the access rules: use it to set up data and to check what really changed.
export const service = createClient<Database>(LOCAL_URL, keys.service, options);

// No login: the same access as a logged-out visitor.
export const anonClient = () =>
  createClient<Database>(LOCAL_URL, keys.anon, options);

// Logged in, so it goes through the same access rules as the app.
export async function signIn(email: string, password = SEED_PASSWORD) {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
  return { client, user: data.user };
}

export const signInAdmin = (school: 1 | 2) =>
  signIn(`seed-admin-${school}@flysupa.test`);

// The seed's data for one school.
export async function seedSchool(school: 1 | 2) {
  const { data: row, error } = await service
    .from("schools")
    .select("id")
    .eq("slug", `seed-scuola-${school}`)
    .single();
  if (error) throw new Error(`Seed school ${school} not found. Run npm run seed.`);

  const first = async <T>(query: PromiseLike<{ data: T[] | null }>) => {
    const { data } = await query;
    if (!data?.length) throw new Error(`Seed school ${school} has missing data.`);
    return data[0];
  };
  const student = await first(
    service
      .from("profiles")
      .select("id, nome_utente")
      .eq("school_id", row.id)
      .eq("is_student", true)
      .limit(1)
  );
  const lesson = await first(
    service.from("lessons").select("id, title").eq("school_id", row.id).limit(1)
  );
  const topic = await first(
    service.from("lessons_items").select("id").eq("school_id", row.id).limit(1)
  );
  return { id: row.id, student, lesson, topic };
}

// A login that belongs to a school with the given role. The seed creates only owners.
// The seed- prefix means the next seed removes it if a test run stops halfway.
export async function createMember(
  schoolId: string,
  role: Database["public"]["Enums"]["school_role"]
) {
  const email = `seed-test-${role}-${Date.now()}@flysupa.test`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const id = data.user.id;

  const member = await service
    .from("school_members")
    .insert({ user_id: id, school_id: schoolId, role });
  if (member.error) throw member.error;
  const profile = await service
    .from("profiles")
    .update({ school_id: schoolId })
    .eq("id", id);
  if (profile.error) throw profile.error;

  return {
    email,
    remove: async () => {
      await service.from("school_members").delete().eq("user_id", id);
      await service.from("profiles").delete().eq("id", id);
      await service.auth.admin.deleteUser(id);
    },
  };
}
