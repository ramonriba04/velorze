import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Header, Footer } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/auth/PasswordInput"; // #12
import { PasswordChecklist, isPasswordValid } from "@/components/auth/PasswordChecklist"; // #1 #13

export const Route = createFileRoute("/auth/restablecer")({
  head: () => ({ meta: [{ title: "Restablecer contraseña — Velorze" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    // #4 — subscribe first so we never miss the PASSWORD_RECOVERY event that fires
    // when Supabase finishes processing the hash token (may happen after getSession resolves).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setInvalid(false);
      }
      // If the SDK processed the token and emitted SIGNED_OUT, the token was invalid/expired.
      if (event === "SIGNED_OUT") {
        setInvalid(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      } else {
        // #4 — only mark invalid when the URL carries no recovery token at all.
        // If it does, we wait for the PASSWORD_RECOVERY event above.
        const hash = window.location.hash;
        if (!hash.includes("type=recovery")) setInvalid(true);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // #1 — enforce the same rules as signup (≥8 chars, upper, lower, digit)
    if (!isPasswordValid(password)) return toast.error(t("auth.pw.requirements"));
    if (password !== confirm) return toast.error(t("reset.mismatch"));
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(t("reset.success"));
      navigate({ to: "/app" });
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
            <h1 className="text-2xl font-bold">{t("reset.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("reset.sub")}</p>
            {invalid ? (
              <p className="mt-6 text-sm text-destructive">{t("reset.invalid")}</p>
            ) : !ready ? (
              // #11 — explain why the button is disabled instead of silently disabling it
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("reset.validating")}</span>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="pw">{t("reset.newPassword")}</Label>
                  {/* #12 — show/hide toggle for consistency with signup */}
                  <PasswordInput
                    id="pw"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {/* #13 — show password rules so users know what's required */}
                  <PasswordChecklist value={password} />
                </div>
                <div>
                  <Label htmlFor="pw2">{t("reset.confirmPassword")}</Label>
                  <PasswordInput
                    id="pw2"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                  {confirm.length > 0 && confirm !== password && (
                    <p className="mt-1 text-xs text-destructive">{t("auth.pw.mismatch")}</p>
                  )}
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {t("reset.update")}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
