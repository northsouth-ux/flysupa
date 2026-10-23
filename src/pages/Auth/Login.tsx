import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabaseClient.tsx";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Track error state
  const navigate = useNavigate();

  useEffect(() => {
    setPassword("");
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null); // Reset error before making request

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message); // Store error message
    } else {
      navigate("/account");
    }

    setLoading(false);
  };

  return (
    <section>
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        <Card className="w-full md:max-w-md">
          <CardHeader>
            <CardTitle className="text-xl text-center md:text-2xl">
              Accedi / Registra <br /> Scuola Guida Lugano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4 md:space-y-6" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label htmlFor="email">Mail</Label>
                <Input
                  required
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Caricamento..." : "Log In"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <p className="text-sm text-muted-foreground">
              Non hai ancora un account?
            </p>
            <Link to="/register">
              <Button variant="link" className="p-0 font-bold">
                Registrati
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        {/* Display error alert when there's an error */}
        {error && (
          <Card className="w-full md:max-w-md mt-4">
            <Alert variant="destructive" className="dark:bg-red-900 dark:border-red-800">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Attenzione</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </Card>
        )}
      </div>
    </section>
  );
}
