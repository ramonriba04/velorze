import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkles, Shield, MessageSquare, Building2, Wallet } from "lucide-react";
import { Header, Footer } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Capora — Marketplace inteligente de inversión" },
      { name: "description", content: "Conecta empresas con inversores privados y corporativos mediante matching inteligente." },
      { property: "og:title", content: "Capora" },
      { property: "og:description", content: "Marketplace inteligente que conecta empresas con inversores." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" /> Smart investment matching
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
                {t("landing.heroTitle").split(" ").slice(0, -2).join(" ")}{" "}
                <span className="gradient-text">{t("landing.heroTitle").split(" ").slice(-2).join(" ")}</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">{t("landing.heroSubtitle")}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/auth" search={{ mode: "signup", role: "inversor" }}>
                  <Button size="lg" className="shadow-elegant gap-2">
                    {t("landing.ctaInvestor")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth" search={{ mode: "signup", role: "empresa" }}>
                  <Button size="lg" variant="outline" className="gap-2">
                    {t("landing.ctaCompany")}
                  </Button>
                </Link>
              </div>
              <p className="mt-5 text-xs text-muted-foreground">{t("landing.trust")}</p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold">{t("landing.howTitle")}</h2>
            <p className="mt-2 text-muted-foreground">{t("landing.howSub")}</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { icon: Building2, t: "step1Title", d: "step1Desc" },
              { icon: Sparkles, t: "step2Title", d: "step2Desc" },
              { icon: MessageSquare, t: "step3Title", d: "step3Desc" },
            ].map((s, i) => (
              <Card key={i} className="p-6 border-border/60">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{t(`landing.${s.t}`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(`landing.${s.d}`)}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="bg-muted/30 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-center">{t("landing.featuresTitle")}</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                { icon: Sparkles, t: "feature1Title", d: "feature1Desc" },
                { icon: MessageSquare, t: "feature2Title", d: "feature2Desc" },
                { icon: Shield, t: "feature3Title", d: "feature3Desc" },
              ].map((f, i) => (
                <div key={i} className="flex flex-col">
                  <f.icon className="h-6 w-6 text-primary" />
                  <h3 className="mt-3 font-semibold">{t(`landing.${f.t}`)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`landing.${f.d}`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <Wallet className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-3xl font-bold">{t("landing.finalCta")}</h2>
          <p className="mt-2 text-muted-foreground">{t("landing.finalCtaDesc")}</p>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg" className="mt-6 shadow-elegant">{t("landing.ctaPrimary")}</Button>
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
