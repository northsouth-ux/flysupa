import RegisterForm from "../../components/RegisterForm.tsx";
import { Card, CardContent } from "@/components/ui/card";

export default function Register() {
  const inviteStr = sessionStorage.getItem("invite");
  const invite = inviteStr ? JSON.parse(inviteStr) : null;

  return (
    <>
      {invite && (
        <div className="flex justify-center pt-4">
          <Card className="max-w-md w-full border-green-500 dark:border-green-700">
            <CardContent className="pt-4 text-center text-sm text-green-700 dark:text-green-300">
              Sei stato invitato come <strong>{invite.role}</strong>. Registrati per unirti all'autoscuola.
            </CardContent>
          </Card>
        </div>
      )}
      <RegisterForm />
    </>
  );
}
