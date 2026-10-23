import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "@/hooks/useUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

/* ------------------------------------------------------------------ */
/*  Pricing tier data                                                  */
/* ------------------------------------------------------------------ */
const pricingTiers = [
  {
    name: "Starter",
    price: "Gratuito",
    features: ["Fino a 20 studenti", "1 istruttore", "Lezioni base"],
    popular: false,
  },
  {
    name: "Pro",
    price: "CHF 29/mese",
    features: [
      "Studenti illimitati",
      "5 istruttori",
      "Template lezioni avanzate",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Personalizzato",
    features: [
      "Tutto incluso",
      "Istruttori illimitati",
      "Supporto dedicato",
    ],
    popular: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Helper: derive a slug from the school name                         */
/* ------------------------------------------------------------------ */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export default function SchoolRegistration() {
  const { user, loading, schoolId, registerSchool } = useUser();
  const navigate = useNavigate();

  const [schoolName, setSchoolName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ---------- Redirect if not logged in ----------
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [loading, user, navigate]);

  // ---------- Auto‑generate slug when name changes ----------
  const handleNameChange = useCallback(
    (value: string) => {
      setSchoolName(value);
      setSlug(nameToSlug(value));
    },
    [],
  );

  // ---------- Submit handler ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!schoolName.trim() || !slug.trim()) {
      setError("Nome e slug sono obbligatori.");
      return;
    }

    setSubmitting(true);
    try {
      await registerSchool(schoolName.trim(), slug.trim());
      navigate("/home", { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Errore durante la registrazione della scuola.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Loading state ----------
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

  // ---------- Already have schools — allow adding more ----------
  if (schoolId) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <CardTitle>
              Crea un&apos;altra autoscuola
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Hai già un&apos;autoscuola, ma puoi crearne un&apos;altra qui sotto.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  // ---------- No user yet (prevents brief flash before redirect) ----------
  if (!user) return null;

  // ---------- Registration form ----------
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* ==================== PRICING SECTION ==================== */}
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Scegli il tuo piano
        </h2>
        <p className="mt-3 text-muted-foreground">
          Tutti i piani includono una prova gratuita di 14 giorni.
        </p>
      </div>

      <div className="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {pricingTiers.map((tier) => (
          <Card
            key={tier.name}
            className={`relative flex flex-col transition-shadow hover:shadow-md ${
              tier.popular
                ? "border-primary ring-2 ring-primary/20"
                : ""
            }`}
          >
            {/* Popular badge */}
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge
                  variant="default"
                  className="bg-primary px-4 py-1 text-xs font-semibold"
                >
                  Più richiesto
                </Badge>
              </div>
            )}

            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {tier.name}
              </CardTitle>
              <div
                className={`text-2xl font-bold ${
                  tier.popular
                    ? "text-primary"
                    : "text-foreground"
                }`}
              >
                {tier.price}
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-2">
              <ul className="mt-2 space-y-2">
                {tier.features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <svg
                      className="h-4 w-4 shrink-0 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feat}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ==================== REGISTRATION FORM ==================== */}
      <div className="mx-auto max-w-lg">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>
              Registra la tua Autoscuola
            </CardTitle>
            <CardDescription>
              Inserisci i dati della tua autoscuola per iniziare.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* School name */}
              <div className="space-y-2">
                <Label htmlFor="schoolName">
                  Nome Autoscuola
                </Label>
                <Input
                  id="schoolName"
                  type="text"
                  required
                  placeholder="es. Scuola Guida Lugano"
                  value={schoolName}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug
                </Label>
                <Input
                  id="slug"
                  type="text"
                  required
                  placeholder="es. scuola-guida-lugano"
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-]/g, ""),
                    )
                  }
                />
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                disabled={submitting || loading}
                className="w-full"
              >
                {submitting ? "Caricamento…" : "Crea Autoscuola"}
              </Button>

              {/* Error message */}
              {error && (
                <p className="text-center text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
