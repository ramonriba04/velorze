import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { assignMyRole } from "@/lib/profiles.functions";
import { useServerFn } from "@tanstack/react-start";
import { Header, Footer } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Building2, TrendingUp } from "lucide-react";

const SearchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
  role: z.enum(["empresa", "inversor"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => SearchSchema.parse(s),
  head: () => ({ meta: [{ title: "Acceso — Capora" }] }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const assign = useServerFn(assignMyRole);
  const [mode, setMode] = useState<"login" | "signup">(search.mode ?? "login");
  const [role, setRole] = useState<"empresa" | "inversor">(search.role ?? "inversor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const afterAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          await assign({ data: { role } });
        } catch {
          // role may already exist or be assigned by /app
        }
      } else if (typeof window !== "undefined") {
        localStorage.setItem("capora_pending_role", role);
      }
    } catch (e) {
      console.error("afterAuth error", e);
    }
    navigate({ to: "/app" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (typeof window !== "undefined") {
          localStorage.setItem("capora_pending_role", role);
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { full_name: fullName, intended_role: role },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success(t("common.saved"));
          await afterAuth();
        } else {
          toast.success("Revisa tu correo para confirmar tu cuenta / Check your email to confirm your account");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app" });
      }
    } catch (err) {
      console.error("auth error", err);
      toast.error((err as Error).message || "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    try {
      // Stash intended role for first-login
      if (mode === "signup") localStorage.setItem("capora_pending_role", role);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/app`,
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        await afterAuth();
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="p-8">
            <h1 className="text-2xl font-bold">{mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{mode === "login" ? t("auth.loginSub") : t("auth.signupSub")}</p>

            {mode === "signup" && (
              <div className="mt-6">
                <Label className="text-xs">{t("auth.roleTitle")}</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("empresa")}
                    className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm transition ${role === "empresa" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                  >
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-medium">{t("auth.roleCompany")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("inversor")}
                    className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm transition ${role === "inversor" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                  >
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="font-medium">{t("auth.roleInvestor")}</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div>
                  <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                  <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
              )}
              <div>
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {mode === "login" ? t("auth.loginBtn") : t("auth.signupBtn")}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> {t("auth.or")} <div className="h-px flex-1 bg-border" />
            </div>
            <Button type="button" variant="outline" onClick={onGoogle} disabled={loading} className="w-full">
              {t("auth.google")}
            </Button>

            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              {mode === "login" ? t("auth.switchToSignup") : t("auth.switchToLogin")}
            </button>
            {mode === "login" && (
              <Link to="/auth/recuperar" className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground">
                {t("auth.forgotPassword")}
              </Link>
            )}
          </Card>
          <p className="mt-4 text-center text-xs text-muted-foreground">{t("disclaimer")}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
