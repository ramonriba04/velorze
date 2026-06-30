import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { assignMyRole, recordConsent } from "@/lib/profiles.functions";
import { useServerFn } from "@tanstack/react-start";
import { Header, Footer } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Building2, TrendingUp, MailCheck } from "lucide-react";
import { PasswordChecklist, isPasswordValid } from "@/components/auth/PasswordChecklist";
import { PasswordInput } from "@/components/auth/PasswordInput";

const SearchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
  role: z.enum(["empresa", "inversor"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => SearchSchema.parse(s),
  head: ({ match }) => {
    const isSignup = (match.search as { mode?: string })?.mode === "signup";
    return {
      meta: [
        { title: isSignup ? "Create account | Capora" : "Login | Capora" },
        { name: "description", content: "Access your Capora account to discover investment opportunities." },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const assign = useServerFn(assignMyRole);
  const consent = useServerFn(recordConsent);
  const [mode, setMode] = useState<"login" | "signup">(search.mode ?? "login");
  const [role, setRole] = useState<"empresa" | "inversor">(search.role ?? "inversor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [fullName, setFullName] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState<string | null>(null);
  const [loginUnverifiedEmail, setLoginUnverifiedEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) navigate({ to: "/app", replace: true });
    });
    return () => { cancelled = true; };
  }, [navigate]);

  const pwValid = isPasswordValid(password);
  const pwMatch = password.length > 0 && password === confirmPw;
  const signupReady = !!email && !!fullName && pwValid && pwMatch && acceptedLegal;


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

  const resendVerification = async (targetEmail: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: { emailRedirectTo: `${window.location.origin}/app` },
      });
      if (error) throw error;
      toast.success(t("auth.verify.resent"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!pwValid) {
          toast.error(t("auth.pw.requirements"));
          return;
        }
        if (!pwMatch) {
          toast.error(t("auth.pw.mismatch"));
          return;
        }
        if (!acceptedLegal) {
          toast.error(t("consent.required"));
          return;
        }
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
        // Record legal consent (best-effort; logged for audit)
        try {
          await consent({
            data: {
              terms_version: "2026-06-28",
              privacy_version: "2026-06-28",
              cookies_version: "2026-06-28",
              user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
            },
          });
        } catch (e) {
          console.warn("consent log failed", e);
        }
        if (data.session) {
          await afterAuth();
        } else {
          setNeedsVerification(email);
        }

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const msg = (error.message ?? "").toLowerCase();
          if (msg.includes("not confirmed") || msg.includes("email_not_confirmed")) {
            setLoginUnverifiedEmail(email);
            toast.error(t("auth.verify.loginBlocked"));
            return;
          }
          throw error;
        }
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

  if (needsVerification) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <Card className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MailCheck className="h-6 w-6 text-primary" />
              </div>
              <h1 className="mt-4 text-xl font-bold">{t("auth.verify.title")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("auth.verify.sent", { email: needsVerification })}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{t("auth.verify.checkSpam")}</p>
              <div className="mt-6 flex flex-col gap-2">
                <Button
                  onClick={() => resendVerification(needsVerification)}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {t("auth.verify.resend")}
                </Button>
                <Button
                  onClick={() => {
                    setNeedsVerification(null);
                    setPassword("");
                    setConfirmPw("");
                  }}
                  variant="ghost"
                  className="w-full"
                >
                  {t("auth.verify.changeEmail")}
                </Button>
              </div>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{t("auth.roleCompany")}</span>
                      <span className="text-xs text-muted-foreground font-normal leading-tight">{t("auth.roleCompanyDesc")}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("inversor")}
                    className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm transition ${role === "inversor" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                  >
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{t("auth.roleInvestor")}</span>
                      <span className="text-xs text-muted-foreground font-normal leading-tight">{t("auth.roleInvestorDesc")}</span>
                    </div>
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
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => { setEmail(e.target.value); setLoginUnverifiedEmail(null); }} />
              </div>
              <div>
                <Label htmlFor="password">{t("auth.password")}</Label>
                <PasswordInput
                  id="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {mode === "signup" && <PasswordChecklist value={password} />}
              </div>
              {mode === "signup" && (
                <div>
                  <Label htmlFor="confirmPw">{t("auth.confirmPassword")}</Label>
                  <PasswordInput
                    id="confirmPw"
                    autoComplete="new-password"
                    required
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                  />
                  {confirmPw.length > 0 && !pwMatch && (
                    <p className="mt-1 text-xs text-destructive">{t("auth.pw.mismatch")}</p>
                  )}
                </div>
              )}
              {loginUnverifiedEmail && mode === "login" && (
                <div className="rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
                  <p>{t("auth.verify.loginBlocked")}</p>
                  <button
                    type="button"
                    onClick={() => resendVerification(loginUnverifiedEmail)}
                    disabled={loading}
                    className="mt-1 font-medium underline"
                  >
                    {t("auth.verify.resend")}
                  </button>
                </div>
              )}
              {mode === "signup" && (
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={acceptedLegal}
                    onChange={(e) => setAcceptedLegal(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                    required
                  />
                  <span>
                    {t("consent.label.before")}{" "}
                    <Link to="/terminos" className="underline">{t("consent.label.terms")}</Link>
                    {t("consent.label.sep1")}
                    <Link to="/privacidad" className="underline">{t("consent.label.privacy")}</Link>
                    {t("consent.label.sep2")}
                    <Link to="/cookies" className="underline">{t("consent.label.cookies")}</Link>
                    {t("consent.label.after")}
                  </span>
                </label>
              )}
              <Button

                type="submit"
                disabled={loading || (mode === "signup" && !signupReady)}
                className="w-full"
              >
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
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setLoginUnverifiedEmail(null); }}
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
