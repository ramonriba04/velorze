import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Header, Footer } from "@/components/layout/Header";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  ),
});
