import { createContext, ReactNode, useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabaseClient.tsx";
import { User, Profile, UserContextType, School, SchoolRole } from "@/types";

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  // ---- Auth / user state ----
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [nomeUtente, setNomeUtente] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [licenseUrl, setLicenseUrl] = useState<string | null>(null);
  const [totalHours, setTotalHours] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [platformAdmin, setPlatformAdmin] = useState<boolean | null>(null);

  // ---- School / tenant state ----
  const [school, setSchool] = useState<School | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolRole, setSchoolRole] = useState<SchoolRole | null>(null);
  const [userSchools, setUserSchools] = useState<{ school: School; role: SchoolRole }[]>([]);

  // ---- UI flags ----
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [showConfirmAlert, setShowConfirmAlert] = useState<boolean>(false);
  const [shouldRedirect, setShouldRedirect] = useState<boolean>(false);

  // ---- Auth listener ----
  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          total_hours: 0,
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    };

    fetchUserData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          total_hours: 0,
        });
      } else {
        setUser(null);
        setSchool(null);
        setSchoolId(null);
        setSchoolRole(null);
        setUserSchools([]);
        setIsAdmin(null);
        setPlatformAdmin(null);
        setNomeUtente(null);
        setAvatarUrl(null);
        setLicenseUrl(null);
        setLoading(false);
      }
      if (event !== "INITIAL_SESSION") { setShouldRedirect(true); }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // ---- Fetch profile + school membership (runs when user changes) ----
  useEffect(() => {
    if (!user?.id) return;

    const fetchProfileAndSchool = async () => {
      setLoading(true);
      try {
        // Fetch profile (use maybeSingle so missing profiles don't crash)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("nome_utente, avatar_url, license_url, admin, platform_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        setNomeUtente(profile?.nome_utente || "");
        setIsAdmin(profile?.admin || false);
        setPlatformAdmin(profile?.platform_admin || false);
        setTotalHours(
          (profile as any)?.total_hours !== null
            ? Number((profile as any).total_hours)
            : null
        );
        setEmail(user?.email || "");

        if (profile?.avatar_url) {
          await downloadAndSetAvatar(profile.avatar_url);
        }
        if ((profile as any)?.license_url) {
          await downloadAndSetLicense((profile as any).license_url);
        }

        // Fetch all school memberships (multi-school support)
        const { data: memberships, error: memberError } = await supabase
          .from("school_members")
          .select("school_id, role, schools(*)")
          .eq("user_id", user.id);

        if (memberError) {
          console.error("Error fetching school memberships:", memberError);
        }

        if (memberships && memberships.length > 0) {
          const schools = memberships.map((m: any) => ({
            school: m.schools as School,
            role: m.role as SchoolRole,
          }));
          setUserSchools(schools);

          // Determine active school: localStorage > profiles.school_id > first
          const savedSchoolId = localStorage.getItem("flysupa_active_school");
          const profileSchoolId = (profile as any)?.school_id;
          const activeEntry =
            schools.find((s) => s.school.id === savedSchoolId) ||
            schools.find((s) => s.school.id === profileSchoolId) ||
            schools[0];

          setSchoolId(activeEntry.school.id);
          setSchoolRole(activeEntry.role);
          setSchool(activeEntry.school);
          setIsAdmin(activeEntry.role !== "student");
        } else {
          setSchoolId(null);
          setSchoolRole(null);
          setSchool(null);
          setUserSchools([]);
        }
      } catch (error) {
        console.error("Error fetching profile/school data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndSchool();
  }, [user]);

  // ---- registerSchool: create a new school and assign the current user as owner ----
  const registerSchool = useCallback(
    async (schoolName: string, slug: string): Promise<void> => {
      if (!user?.id) throw new Error("No authenticated user");

      setLoading(true);
      try {
        // Create school atomically via SECURITY DEFINER RPC
        // (school + owner membership + profile.school_id in one transaction).
        const { data, error } = await supabase.rpc("create_school", {
          school_name: schoolName,
          school_slug: slug,
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (!data) throw new Error("School creation returned no data");

        const newSchool = data as School;

        setSchool(newSchool);
        setSchoolId(newSchool.id);
        setSchoolRole("owner");
        setIsAdmin(true);
        setUserSchools((prev) => [
          ...prev,
          { school: newSchool, role: "owner" as SchoolRole },
        ]);
      } catch (error) {
        console.error("Error registering school:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // ---- createInvite: generate an invite link for the current school ----
  const createInvite = useCallback(
    async (role: SchoolRole = "student"): Promise<string> => {
      if (!schoolId || !user?.id) throw new Error("No school or user");

      const { data, error } = await supabase
        .from("invites")
        .insert({
          school_id: schoolId,
          role,
          created_by: user.id,
        })
        .select("token")
        .single();

      if (error) throw error;
      return data.token;
    },
    [schoolId, user]
  );

  // ---- switchSchool: change active school ----
  const switchSchool = useCallback(
    async (newSchoolId: string): Promise<void> => {
      const entry = userSchools.find((s) => s.school.id === newSchoolId);
      if (!entry || !user?.id) return;

      // Persist active school server-side (SECURITY DEFINER RPC)
      const { error } = await supabase.rpc("set_active_school", {
        target_school_id: newSchoolId,
      });
      if (error) {
        console.error("Error switching school:", error);
        return;
      }

      localStorage.setItem("flysupa_active_school", newSchoolId);

      // Update local state
      setSchool(entry.school);
      setSchoolId(newSchoolId);
      setSchoolRole(entry.role);
      setIsAdmin(entry.role !== "student");
    },
    [userSchools, user]
  );

  // ---- Profile update ----
  const updateProfile = async (profile: Profile): Promise<void> => {
    try {
      setLoading(true);
      const updates = {
        nome_utente: profile.nome_utente,
        cognome_utente: profile.cognome_utente,
        phone: profile.phone,
        date_of_birth: profile.date_of_birth,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user?.id as string);
      if (error) throw error;

      if (profile.nome_utente !== undefined) setNomeUtente(profile.nome_utente);
      if (profile.avatar_url !== undefined) setAvatarUrl(profile.avatar_url);

      setShowConfirmAlert(true);
    } catch (error) {
      alert("Error updating the data!");
      console.error("Error updating the data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ---- Image upload ----
  const uploadImage = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "license" = "avatar"
  ): Promise<void> => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user?.id}/${Math.random()}.${fileExt}`;

      const bucket = type === "license" ? "licenses" : "avatars";
      const field = type === "license" ? "license_url" : "avatar_url";

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ [field]: filePath })
        .eq("id", user?.id);

      if (updateError) throw updateError;

      if (type === "license") {
        await downloadAndSetLicense(filePath);
      } else {
        await downloadAndSetAvatar(filePath);
      }
    } catch (error) {
      alert(`Error uploading ${type}!`);
      console.error(`Error uploading ${type}:`, error);
    } finally {
      setUploading(false);
    }
  };

  // ---- Avatar / license download helpers ----
  const downloadAndSetAvatar = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      setAvatarUrl(url);
    } catch (error) {
      console.error("Error downloading avatar image:", error);
    }
  };

  const downloadAndSetLicense = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("licenses")
        .download(path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      setLicenseUrl(url);
    } catch (error) {
      console.error("Error downloading license image:", error);
    }
  };

  const downloadAndSetUserAvatar = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .download(path);
      if (error) throw error;
      return URL.createObjectURL(data);
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  };

  // ---- Dummy refetchTotalHours (placeholder to satisfy the type) ----
  const refetchTotalHours = async () => {
    // TODO: implement if needed
  };

  return (
    <UserContext.Provider
      value={{
        user,
        email,
        loading,
        isAdmin,
        avatarUrl,
        licenseUrl,
        totalHours,
        nomeUtente,
        setNomeUtente,
        uploadImage,
        updateProfile,
        showConfirmAlert,
        setShowConfirmAlert,
        shouldRedirect,
        setShouldRedirect,
        downloadAndSetUserAvatar,
        // School / tenant
        school,
        schoolId,
        schoolRole,
        platformAdmin,
        profileComplete: !!nomeUtente,
        registerSchool,
        createInvite,
        userSchools,
        switchSchool,
        // Placeholder fields to satisfy the type
        profileTotalHours: [],
        isLoadingHours: false,
        refetchTotalHours,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
