import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Header, Footer } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/legal")({
  head: () => ({ meta: [{ title: "Aviso legal — Velorze" }] }),
  component: Legal,
});

function Legal() {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-12">
        <Card className="p-8">
          <h1 className="text-3xl font-bold">{t("legal.title")}</h1>
          <p className="mt-4 text-muted-foreground whitespace-pre-wrap">{t("legal.body")}</p>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
