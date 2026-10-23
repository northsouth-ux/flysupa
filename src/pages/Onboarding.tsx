import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { Profile } from "@/types";

export default function Onboarding() {
  const {
    user,
    loading,
    nomeUtente,
    setNomeUtente,
    updateProfile,
    platformAdmin,
    profileComplete,
  } = useUser();

  const navigate = useNavigate();

  const [cognome, setCognome] = useState("");
  const [phone, setPhone] = useState("+41 (0) ");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ---------- Access control ---------- */
  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login", { replace: true });
      } else if (platformAdmin) {
        navigate("/home", { replace: true });
      } else if (profileComplete) {
        navigate("/home", { replace: true });
      }
    }
  }, [loading, user, platformAdmin, profileComplete, navigate]);

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm font-medium">Caricamento…</span>
        </div>
      </div>
    );
  }

  /* ---------- Guard: no user yet (prevents flash before redirect) ---------- */
  if (!user || platformAdmin || profileComplete) return null;

  /* ---------- Submit ---------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nomeUtente?.trim() || !cognome.trim()) {
      setError("Nome e cognome sono obbligatori.");
      return;
    }

    setSubmitting(true);
    try {
      await updateProfile({
        nome_utente: nomeUtente.trim(),
        cognome_utente: cognome.trim(),
        phone: phone.trim(),
        date_of_birth: dateOfBirth || undefined,
      } as Profile);
      navigate("/home", { replace: true });
    } catch (err: any) {
      setError(
        err?.message ?? "Errore durante il salvataggio del profilo.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Onboarding form ---------- */
  return (
    <section className="mx-auto max-w-lg px-4 py-12 sm:py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Completa il tuo profilo
        </h1>
        <p className="mt-3 text-muted-foreground">
          Questi dati ti aiuteranno a gestire la tua autoscuola
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>I tuoi dati</CardTitle>
          <CardDescription>
            Compila i campi sottostanti per completare la registrazione.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                type="text"
                required
                placeholder="Il tuo nome"
                value={nomeUtente ?? ""}
                onChange={(e) => setNomeUtente(e.target.value)}
              />
            </div>

            {/* Cognome */}
            <div className="space-y-2">
              <Label htmlFor="cognome">
                Cognome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cognome"
                type="text"
                required
                placeholder="Il tuo cognome"
                value={cognome}
                onChange={(e) => setCognome(e.target.value)}
              />
            </div>

            {/* Telefono */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Telefono
              </Label>
              <Input
                id="phone"
                type="text"
                placeholder="+41 (0) XX XXX XX XX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Data di nascita */}
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">
                Data di nascita
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="dark:[color-scheme:dark]"
              />
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Salvataggio…" : "Salva e continua"}
            </Button>
          </form>

          {/* Skip link */}
          <div className="mt-4 text-center">
            <Link
              to="/home"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Salta per ora
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
