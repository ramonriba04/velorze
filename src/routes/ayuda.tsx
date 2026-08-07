import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Header, Footer } from "@/components/layout/Header";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/ayuda")({
  head: () => ({
    meta: [
      { title: "Ayuda — Capora" },
      { name: "description", content: "Preguntas frecuentes sobre cómo usar Capora: matching, contactos, privacidad y cuenta." },
    ],
  }),
  component: HelpCenter,
});

function HelpCenter() {
  const { t } = useTranslation();
  const items = ["matching", "contact", "privacy", "account"] as const;
  return (
    <div className="min-h-dvh flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("help.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("help.sub")}</p>
        <Accordion type="single" collapsible className="mt-8">
          {items.map((k) => (
            <AccordionItem key={k} value={k}>
              <AccordionTrigger className="text-left">{t(`help.${k}.q`)}</AccordionTrigger>
              <AccordionContent className="whitespace-pre-wrap text-muted-foreground">
                {t(`help.${k}.a`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
      <Footer />
    </div>
  );
}
