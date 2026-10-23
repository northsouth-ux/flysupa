import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/services/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SchoolRole } from "@/types";

interface InviteData {
  id: string;
  school_id: string;
  role: SchoolRole;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  schools: {
    name: string;
  } | null;
}

type PageState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "valid"; invite: InviteData };

const roleLabels: Record<SchoolRole, string> = {
  owner: "Proprietario",
  admin: "Amministratore",
  instructor: "Istruttore",
  student: "Studente",
};

export default function Join() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();

  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const params = new URLSearchParams(location.search);
  const token = params.get("token");

  // Validate the invite token on mount
  useEffect(() => {
    if (!token) {
      setPageState({ status: "invalid" });
      return;
    }

    let cancelled = false;

    async function validateToken() {
      const { data: invite, error } = await supabase
        .from("invites")
        .select("*, schools(name)")
        .eq("token", token)
        .single();

      if (cancelled) return;

      if (error || !invite) {
        setPageState({ status: "invalid" });
        return;
      }

      // Check if already used
      if (invite.used_at) {
        setPageState({ status: "invalid" });
        return;
      }

      // Check if expired
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        setPageState({ status: "invalid" });
        return;
      }

      setPageState({ status: "valid", invite: invite as InviteData });
    }

    validateToken();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // ---- Join handler for logged-in users ----
  async function handleJoin() {
    if (pageState.status !== "valid" || !user) return;

    setJoining(true);
    setJoinError(null);

    try {
      // Join atomically via SECURITY DEFINER RPC (validates invite server-side,
      // inserts membership, sets active school, marks invite used).
      const { data, error } = await supabase.rpc("join_school_via_invite", {
        invite_token: token,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      navigate("/home");
    } catch (err: any) {
      console.error("Join error:", err);
      setJoinError(
        err?.message || "Errore durante l'iscrizione. Riprova più tardi."
      );
    } finally {
      setJoining(false);
    }
  }

  // ---- Handler for unauthenticated users ----
  function handleRegisterAndJoin() {
    if (pageState.status !== "valid") return;

    const { school_id, role } = pageState.invite;

    sessionStorage.setItem(
      "invite",
      JSON.stringify({ token, school_id, role })
    );

    navigate("/register");
  }

  // ---- Render: loading ----
  if (pageState.status === "loading" || userLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="h-8 w-8 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-muted-foreground">Verifica invito...</p>
        </div>
      </div>
    );
  }

  // ---- Render: invalid / expired / used ----
  if (pageState.status === "invalid") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">
              Invito non valido o scaduto
            </CardTitle>
            <CardDescription className="text-center">
              Questo link di invito non è più attivo. Contatta
              l&rsquo;amministratore della scuola per ricevere un nuovo invito.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ---- Render: valid invite ----
  const { invite } = pageState;
  const schoolName = invite.schools?.name ?? "Scuola";
  const expiresDate = new Date(invite.expires_at).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Unisciti a {schoolName}
          </CardTitle>
          <CardDescription className="text-center">
            Sei stato invitato a far parte di questa scuola su FlySupa.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Invite details */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Scuola</span>
              <span className="font-medium">{schoolName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ruolo</span>
              <span className="font-medium">
                {roleLabels[invite.role] ?? invite.role}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Scade il</span>
              <span className="font-medium">{expiresDate}</span>
            </div>
          </div>

          {/* Join error */}
          {joinError && (
            <p className="text-sm text-destructive text-center">{joinError}</p>
          )}

          {/* Join button */}
          {user ? (
            <Button
              className="w-full"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? "Unisciti ora..." : "Unisciti ora"}
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleRegisterAndJoin}
            >
              Registrati e unisciti
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
