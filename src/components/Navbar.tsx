import { Link } from "react-router-dom";
import { useUser } from "../hooks/useUser";
import { signOutUser } from "../services/authServices";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Moon,
  Sun,
  Maximize,
  Minimize,
  Home,
  Users,
  User,
  CreditCard,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useState, useEffect } from "react";

// Shadcn Components
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, email, avatarUrl, isAdmin, nomeUtente, school, platformAdmin, userSchools, switchSchool } = useUser();
  const { theme, setTheme } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Environment + branch for the badge (left of the fullscreen toggle)
  const envName: string =
    (import.meta.env.VITE_APP_ENV as string | undefined) ||
    (import.meta.env.DEV ? "development" : "production");
  const branch: string = __GIT_BRANCH__ || "unknown";
  const envBadgeClass =
    envName === "production"
      ? "bg-red-600 text-white"
      : envName === "test"
        ? "bg-amber-500 text-black"
        : "bg-emerald-600 text-white";

  // Check if fullscreen is supported and update state when it changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement
          .requestFullscreen()
          .catch((err) =>
            console.error(
              `Error attempting to enable fullscreen mode: ${err.message}`
            )
          );
      }
    } else {
      if (document.exitFullscreen) {
        document
          .exitFullscreen()
          .catch((err) =>
            console.error(
              `Error attempting to exit fullscreen mode: ${err.message}`
            )
          );
      }
    }
  };

  // Extract initials for avatar fallback
  const getInitials = (email: string) => {
    if (!email) return "U";
    const parts = email.split("@")[0].split(".");
    return parts.map((part) => part[0]?.toUpperCase() || "").join("");
  };

  return (
    <div className="container pt-6 space-y-6">
      <nav className="flex items-center justify-between p-4 bg-card rounded-lg border shadow-md">
        <div className="flex items-center gap-4">
          {school && (
            <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-3 py-1 rounded-full font-medium">
              {school.name}
            </Badge>
          )}

          {(isAdmin || platformAdmin) && (
            <div className="flex items-center gap-2 ml-4">
              {platformAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/platform-admin")}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1">
                    <path d="M2 13a5 5 0 0 0 5 5h1a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v4z"></path>
                    <path d="M22 13a5 5 0 0 1-5 5h-1a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v4z"></path>
                    <path d="M10 2h4v4h-4z"></path>
                    <path d="M2 8h20v2H2z"></path>
                  </svg>
                  Piattaforma
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/")}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                Lezioni
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard")}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                Scuola
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/users")}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Studenti
              </Button>
            </div>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-4">
            {/* Env + branch indicator */}
            <div className="flex items-center gap-1.5">
              <Badge className={`rounded-md text-xs font-semibold ${envBadgeClass}`}>
                {envName}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-md text-xs font-mono text-muted-foreground">
                {branch}
              </Badge>
            </div>

            {/* Fullscreen Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle fullscreen</span>
            </Button>

            {/* Dark Mode Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }>
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
            {platformAdmin && (
              <Badge
                variant={"outline"}
                className="dark:border-amber-700 dark:text-amber-100 border-amber-500 text-amber-700">
                Platform owner
              </Badge>
            )}
            {isAdmin ? (
              <Badge variant={"outline"}>
                Admin
              </Badge>
            ) : null}

            {/* School Switcher Dropdown */}
            {userSchools.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Scuola: {school?.name || "..."}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Cambia scuola</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {userSchools.map((s) => (
                    <DropdownMenuItem
                      key={s.school.id}
                      onClick={() => switchSchool(s.school.id)}
                      className={s.school.id === school?.id ? "font-bold" : ""}
                    >
                      {s.school.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-12 w-12 rounded-full p-0">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={avatarUrl || ""} alt={email || "User"} />
                    <AvatarFallback>
                      {getInitials(email || "")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                align="end"
                forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {nomeUtente}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    asChild>
                    <Link to="/">
                      <Home className="mr-2 h-4 w-4" />
                      <span>Lezioni</span>
                    </Link>
                  </DropdownMenuItem>

                  {isAdmin && (
                    <DropdownMenuItem
                      asChild>
                      <Link to="/users">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Studenti</span>
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    asChild>
                    <Link to="/account">
                      <User className="mr-2 h-4 w-4" />
                      <span>Account</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    asChild>
                    <Link to="/payments">
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>Pagamenti</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    asChild>
                    <Link to="/faq">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      <span>FAQs</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOutUser(navigate)}
                  className="text-red-500 focus:text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Esci</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </nav>
    </div>
  );
}
