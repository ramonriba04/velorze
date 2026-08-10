import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Header, Footer } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/contacto")({
  head: () => ({ meta: [
    { title: "Contacto — Velorze" },
    { name: "description", content: "Ponte en contacto con el equipo de Velorze." },
  ] }),
  component: Page,
});

function Page() {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-12">
        <Card className="p-8">
          <h1 className="text-3xl font-bold">{t("contact.title")}</h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">{t("contact.body")}</p>
          <a href="mailto:help@velorze.com" className="mt-6 inline-flex items-center gap-2 text-primary hover:underline">
            <Mail className="h-4 w-4" /> help@velorze.com
          </a>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
