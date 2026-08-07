import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Header, Footer } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/auth/recuperar")({
  head: () => ({ meta: [{ title: "Recuperar contraseña — Capora" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/restablecer`,
      });
      if (error) throw error;
      setSent(true);
      toast.success(t("recover.sent"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="p-8">
            <h1 className="text-2xl font-bold">{t("recover.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("recover.sub")}</p>
            {sent ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm">{t("recover.checkInbox")}</p>
                <Link to="/auth" className="block">
                  <Button variant="outline" className="w-full">{t("recover.backToLogin")}</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {t("recover.sendLink")}
                </Button>
                <Link to="/auth" className="block text-center text-sm text-muted-foreground hover:text-foreground">
                  {t("recover.backToLogin")}
                </Link>
              </form>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
