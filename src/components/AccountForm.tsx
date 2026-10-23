"use client";
import { useState, useEffect } from "react";
import { useUser } from "../hooks/useUser";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import Dialog components
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

// License Thumbnail Component
function LicenseThumbnail({
  licenseUrl,
  children,
}: {
  licenseUrl: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center justify-center w-full h-36 bg-slate-200 rounded-md overflow-hidden">
      {licenseUrl ? (
        <>
          <Dialog>
            <DialogTrigger asChild>
              <div className="w-full h-full relative group cursor-pointer">
                <img
                  src={licenseUrl}
                  alt="Driving License"
                  className="w-full h-full object-contain"
                />
                <div className="absolute bottom-2 right-2 bg-white/80 p-1.5 rounded-full opacity-70 group-hover:opacity-100 transition-opacity">
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
                    className="text-slate-700">
                    <path d="m15 3 6 6m-6-6v6h6"></path>
                    <path d="M10 21H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
                    <path d="M21 13v8"></path>
                    <path d="M18 16h6"></path>
                  </svg>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex items-center justify-center">
              <img
                src={licenseUrl}
                alt="Driving License"
                className="max-w-full max-h-[70vh] object-contain"
              />
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <rect width="18" height="12" x="3" y="6" rx="2" />
            <path d="M3 10h18" />
            <path d="M7 15h.01" />
            <path d="M11 15h2" />
          </svg>
          <span className="mt-2">Nessuna licenza</span>
        </div>
      )}
      {children}
    </div>
  );
}

export default function AccountForm() {
  const {
    user,
    nomeUtente,
    setNomeUtente,
    totalHours,
    updateProfile,
    showConfirmAlert,
    setShowConfirmAlert,
    avatarUrl,
    uploadImage,
    licenseUrl,
  } = useUser();

  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0]?.toUpperCase() || "")
      .join("");
  };

  // Handle avatar upload with loading state
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadingAvatar(true);
    try {
      await uploadImage(e);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle license upload with loading state
  const handleLicenseUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setUploadingLicense(true);
    try {
      await uploadImage(e, "license");
    } finally {
      setUploadingLicense(false);
    }
  };

  // Auto dismiss success alert after 3 seconds
  useEffect(() => {
    let timerId: number;
    if (showConfirmAlert) {
      timerId = window.setTimeout(() => {
        setShowConfirmAlert(false);
      }, 5000);
    }
    return () => {
      if (timerId) window.clearTimeout(timerId);
    };
  }, [showConfirmAlert, setShowConfirmAlert]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Benvenuto
        </h1>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="edit-mode"
          checked={isEditMode}
          onCheckedChange={setIsEditMode}
        />
        <Label htmlFor="edit-mode">
          Modifica profilo
        </Label>
      </div>
      {/* Confirmation alert */}
      {showConfirmAlert && (
        <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-4 text-green-700 dark:text-green-400 flex justify-between items-center border border-green-200 dark:border-green-900">
          <p>Profilo aggiornato con successo!</p>
          <Button
            variant="outline"
            size="sm"
            className="dark:text-green-900 dark:border-green-700"
            onClick={() => setShowConfirmAlert(false)}>
            Chiudi
          </Button>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Avatar Card */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Il tuo profilo
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </CardTitle>
            <CardDescription>
              La tua patente di guida
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center flex-grow">
            <Avatar className="h-36 w-36 mb-4">
              <AvatarImage src={avatarUrl || ""} />
              <AvatarFallback>
                {getInitials(nomeUtente || "")}
              </AvatarFallback>
            </Avatar>
          </CardContent>
          <CardFooter className="mt-auto">
            {isEditMode && (
              <div className="mt-4 w-full">
                <Label htmlFor="avatar">
                  Cambia avatar
                </Label>
                <div className="mt-1 relative">
                  <div className="relative rounded-md border border-slate-200 bg-transparent">
                    <Input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      className={`
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-l-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-slate-50 file:text-slate-700
                        hover:file:bg-slate-100
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${uploadingAvatar ? "opacity-50" : ""}
                      `}
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar || !isEditMode}
                    />
                  </div>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardFooter>
        </Card>

        {/* License Card */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Patente di Guida
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground">
                <rect width="18" height="12" x="3" y="6" rx="2" />
                <path d="M3 10h18" />
                <path d="M7 15h.01" />
                <path d="M11 15h2" />
              </svg>
            </CardTitle>
            <CardDescription>
              La tua patente di guida
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center flex-grow">
            <LicenseThumbnail licenseUrl={licenseUrl}>
              {uploadingLicense && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              )}
            </LicenseThumbnail>
          </CardContent>
          {isEditMode && (
            <CardFooter className="mt-auto">
              <div className="mt-4 w-full">
                <Label htmlFor="license">
                  Carica patente
                </Label>
                <div className="mt-1 relative">
                  <div className="relative rounded-md border border-slate-200 bg-transparent">
                    <Input
                      id="license"
                      type="file"
                      accept="image/*"
                      className={`
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-l-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-slate-50 file:text-slate-700
                        hover:file:bg-slate-100
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${uploadingLicense ? "opacity-50" : ""}
                      `}
                      onChange={handleLicenseUpload}
                      disabled={uploadingLicense || !isEditMode}
                    />
                  </div>
                </div>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* User Data Card */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Dati utente
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex-grow">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email
              </Label>
              <Input
                id="email"
                type="text"
                value={user?.email || ""}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome_utente">
                Nome Completo
              </Label>
              <Input
                id="nome_utente"
                type="text"
                value={nomeUtente || ""}
                disabled={!isEditMode}
                onChange={(e) => setNomeUtente(e.target.value)}
                className="disabled:opacity-50"
              />
            </div>
          </CardContent>
          {isEditMode && (
            <CardFooter className="mt-auto">
              <Button
                className="w-full"
                onClick={() =>
                  updateProfile({
                    nome_utente: nomeUtente as any,
                    email: user?.email,
                  })
                }
                disabled={loading}>
                {loading ? "Salvando..." : "Salva Profilo"}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
