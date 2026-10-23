import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../hooks/useUser";
import { supabase } from "../services/supabaseClient";

const AuthRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, schoolId, loading, shouldRedirect, setShouldRedirect, profileComplete, platformAdmin } = useUser();

  useEffect(() => {
    // Wait until loading is done before redirecting
    if (loading) return;

    // Not logged in — let the login page handle it
    if (!user) return;

    if (!shouldRedirect) return;

    // Already on one of these onboarding pages — don't redirect away
    if (
      location.pathname === "/register-school" ||
      location.pathname === "/login" ||
      location.pathname === "/onboarding" ||
      location.pathname === "/join"
    ) {
      setShouldRedirect(false);
      return;
    }

    // Process invite if present (from sessionStorage after /join → /register flow)
    const processInvite = async () => {
      const inviteStr = sessionStorage.getItem("invite");
      if (!inviteStr) return false;

      try {
        const invite = JSON.parse(inviteStr);
        if (!invite.token) return false;

        // Use SECURITY DEFINER RPC to bypass RLS
        const { data, error } = await supabase.rpc("join_school_via_invite", {
          invite_token: invite.token,
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        sessionStorage.removeItem("invite");
        return true;
      } catch (err) {
        console.error("Error processing invite:", err);
        sessionStorage.removeItem("invite");
        return false;
      }
    };

    // If user has no school, try processing an invite first
    if (!schoolId) {
      processInvite().then((processed) => {
        if (processed) {
          // Invite processed — reload will pick up the new school
          window.location.reload();
          return;
        }
        // No invite — send to school registration
        navigate("/register-school");
        setShouldRedirect(false);
      });
      return;
    }

    // Profile incomplete AND not a platform admin — send to onboarding
    if (!profileComplete && !platformAdmin) {
      navigate("/onboarding");
      setShouldRedirect(false);
      return;
    }

    navigate("/home");
    setShouldRedirect(false);
  }, [user, schoolId, loading, shouldRedirect, profileComplete, platformAdmin, navigate, setShouldRedirect, location.pathname]);

  return null;
};

export default AuthRedirect;