import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Header, Footer } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/terminos")({
  head: () => ({ meta: [
    { title: "Términos y condiciones — Capora" },
    { name: "description", content: "Términos de uso de la plataforma Capora." },
  ] }),
  component: Page,
});

function Page() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-12">
        <Card className="p-8">
          <h1 className="text-3xl font-bold">{t("terms.title")}</h1>
          <div className="mt-4 text-muted-foreground whitespace-pre-wrap leading-relaxed">{t("terms.body")}</div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
