import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Sparkles,
  Shield,
  MessageSquare,
  Building2,
  Target,
  Search,
  UserCheck,
  Lock,
  CircleDollarSign,
  Scale,
  Wallet,
  CheckCircle2,
  Compass,
  Heart,
  Send,
} from "lucide-react";
import { Header, Footer } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Capora — Intelligent investment marketplace" },
      { name: "description", content: "Connect projects with the right investors through intelligent compatibility matching." },
      { property: "og:title", content: "Capora — Intelligent investment marketplace" },
      { property: "og:description", content: "Connect projects with the right investors through intelligent compatibility matching." },
      { property: "og:url", content: "https://capora-ai-connect.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://capora-ai-connect.lovable.app/" }],
  }),
  component: Landing,
});

function SectionTitle({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">{eyebrow}</p>
      ) : null}
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h2>
      {sub ? <p className="mt-3 text-base text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function HeroMock({ t }: { t: (k: string) => string }) {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/10 via-transparent to-primary/5 blur-2xl" />
      <Card className="overflow-hidden border-border/70 bg-card/90 shadow-[0_30px_60px_-30px_oklch(0.32_0.13_265_/_0.35)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">{t("landing.mockProjectsTitle")}</p>
          <div className="h-6 w-6 rounded-full bg-muted" />
        </div>
        <div className="grid gap-4 p-5">
          {[
            { name: t("landing.sampleP1"), sector: t("landing.sectorEnergy"), score: 94 },
            { name: t("landing.sampleP2"), sector: t("landing.sectorFintech"), score: 87 },
            { name: t("landing.sampleP3"), sector: t("landing.sectorHealth"), score: 78 },
          ].map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.sector}</p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                <Sparkles className="h-3 w-3" /> {p.score}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-primary/[0.04] px-4 py-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <MessageSquare className="h-4 w-4" />
            </div>
            <p className="truncate text-sm text-foreground">{t("landing.mockMessage")}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Landing() {
  const { t } = useTranslation();

  const features = [
    { icon: Target, t: "feature1Title", d: "feature1Desc" },
    { icon: Lock, t: "feature2Title", d: "feature2Desc" },
    { icon: Search, t: "feature3Title", d: "feature3Desc" },
    { icon: Send, t: "feature4Title", d: "feature4Desc" },
    { icon: UserCheck, t: "feature5Title", d: "feature5Desc" },
  ];

  const samples = [
    { title: "sampleP1", sector: "sectorEnergy", country: "countryES", score: 94 },
    { title: "sampleP2", sector: "sectorFintech", country: "countryMX", score: 87 },
    { title: "sampleP3", sector: "sectorHealth", country: "countryCO", score: 78 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,oklch(0.32_0.13_265_/_0.08),transparent_70%)]" />
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-28">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.05] px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" /> {t("landing.badge")}
              </span>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {t("landing.heroTitle")}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                {t("landing.heroSubtitle")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/auth" search={{ mode: "signup", role: "inversor" }}>
                  <Button size="lg" className="gap-2">
                    {t("landing.ctaExplore")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth" search={{ mode: "signup", role: "empresa" }}>
                  <Button size="lg" variant="outline" className="gap-2">
                    {t("landing.ctaPublish")}
                  </Button>
                </Link>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">{t("landing.trust")}</p>
            </div>
            <HeroMock t={t} />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="border-t border-border/60 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionTitle eyebrow="01" title={t("landing.howTitle")} sub={t("landing.howSub")} />
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                { icon: Building2, t: "step1Title", d: "step1Desc" },
                { icon: Target, t: "step2Title", d: "step2Desc" },
                { icon: MessageSquare, t: "step3Title", d: "step3Desc" },
              ].map((s, i) => (
                <Card
                  key={i}
                  className="border-border/60 bg-card p-7 shadow-[0_1px_2px_oklch(0.32_0.13_265_/_0.04)] transition-shadow hover:shadow-[0_10px_30px_-15px_oklch(0.32_0.13_265_/_0.18)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{t(`landing.${s.t}`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`landing.${s.d}`)}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* SPLIT: COMPANIES / INVESTORS */}
        <section className="border-t border-border/60 bg-muted/40 py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-2">
            {[
              {
                icon: Building2,
                title: "forCompaniesTitle",
                bullets: ["forCompaniesB1", "forCompaniesB2", "forCompaniesB3"],
                cta: "ctaCompanies",
                role: "empresa" as const,
              },
              {
                icon: Compass,
                title: "forInvestorsTitle",
                bullets: ["forInvestorsB1", "forInvestorsB2", "forInvestorsB3"],
                cta: "ctaInvestors",
                role: "inversor" as const,
              },
            ].map((c) => (
              <Card key={c.title} className="border-border/60 bg-card p-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <c.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
                  {t(`landing.${c.title}`)}
                </h3>
                {c.title === "forCompaniesTitle" && (
                  <p className="mt-2 text-sm text-muted-foreground">{t("landing.forCompaniesSub")}</p>
                )}
                <ul className="mt-5 space-y-3">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm text-foreground/80">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2} />
                      <span>{t(`landing.${b}`)}</span>
                    </li>
                  ))}
                </ul>
                {c.title === "forCompaniesTitle" && (
                  <p className="mt-4 text-xs text-muted-foreground">{t("landing.forCompaniesHelper")}</p>
                )}
                <Link to="/auth" search={{ mode: "signup", role: c.role }} className="mt-7 inline-block">
                  <Button className="gap-2">
                    {t(`landing.${c.cta}`)} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="border-t border-border/60 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionTitle eyebrow="02" title={t("landing.featuresTitle")} />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <Card
                  key={i}
                  className="group border-border/60 bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-foreground">{t(`landing.${f.t}`)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(`landing.${f.d}`)}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* SHOWCASE */}
        <section className="border-t border-border/60 bg-muted/40 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionTitle eyebrow="03" title={t("landing.showcaseTitle")} sub={t("landing.showcaseSub")} />
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {samples.map((s) => (
                <Card key={s.title} className="overflow-hidden border-border/60 bg-card p-0">
                  <div className="relative h-40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
                    <div className="absolute inset-0 grid place-items-center text-primary/30">
                      <Building2 className="h-14 w-14" strokeWidth={1.25} />
                    </div>
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                      <Sparkles className="h-3 w-3" /> {s.score}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t(`landing.${s.sector}`)} · {t(`landing.${s.country}`)}
                    </p>
                    <h3 className="mt-1.5 text-base font-semibold text-foreground">{t(`landing.${s.title}`)}</h3>
                    <Link to="/auth" search={{ mode: "signup" }} className="mt-4 inline-block">
                      <Button variant="outline" size="sm" className="gap-2">
                        {t("landing.showcaseView")} <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section className="border-t border-border/60 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <SectionTitle title={t("landing.trustTitle")} sub={t("landing.trustSub")} />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: CircleDollarSign, k: "trust1" },
                { icon: Scale, k: "trust2" },
                { icon: Wallet, k: "trust3" },
                { icon: Shield, k: "trust4" },
              ].map((it) => (
                <div
                  key={it.k}
                  className="flex flex-col items-center rounded-xl border border-border/60 bg-card p-6 text-center"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <it.icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <p className="mt-4 text-sm font-medium text-foreground">{t(`landing.${it.k}`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PLANS PREVIEW */}
        <section className="border-t border-border/60 bg-muted/40 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <SectionTitle eyebrow="04" title={t("landing.plansTitle")} sub={t("landing.plansSub")} />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { name: "planFree", current: true },
                { name: "planPro", current: false },
                { name: "planBusiness", current: false },
              ].map((p) => (
                <Card key={p.name} className="border-border/60 bg-card p-6 text-center">
                  <p className="text-lg font-semibold text-foreground">{t(`landing.${p.name}`)}</p>
                  <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
                    {p.current ? t("landing.planFree") : t("landing.comingSoon")}
                  </p>
                  <Link to="/planes" className="mt-5 inline-block">
                    <Button variant="outline" size="sm" disabled={!p.current}>
                      {p.current ? t("landing.planFree") : t("landing.comingSoon")}
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border/60 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <SectionTitle title={t("landing.faqTitle")} />
            <Accordion type="single" collapsible className="mt-10">
              {[1, 2, 3, 4, 5].map((i) => (
                <AccordionItem key={i} value={`q${i}`} className="border-border/60">
                  <AccordionTrigger className="text-left text-base font-medium">
                    {t(`landing.faq${i}Q`)}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {t(`landing.faq${i}A`)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="border-t border-border/60 bg-[color:var(--foreground)] py-20 text-[color:var(--background)] sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <Heart className="mx-auto h-8 w-8 opacity-60" strokeWidth={1.5} />
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("landing.finalCta")}
            </h2>
            <p className="mt-3 text-base opacity-75">{t("landing.finalCtaDesc")}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-[color:var(--primary-glow)]">
                  {t("landing.ctaGetStarted")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth" search={{ mode: "signup", role: "inversor" }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-white/30 bg-transparent text-[color:var(--background)] hover:bg-white/10 hover:text-[color:var(--background)]"
                >
                  {t("landing.ctaInvestors")}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
