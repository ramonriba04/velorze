import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const ITEM_KEYS = [
  "email_new_match",
  "email_contact_request",
  "email_contact_accepted",
  "email_new_message",
  "email_project_published",
  "email_verification_result",
  "email_project_reported",
  "email_account_warning",
  "email_product_updates",
] as const;

type ItemKey = (typeof ITEM_KEYS)[number];
type Prefs = Record<ItemKey, boolean> & { emails_enabled: boolean };

const DEFAULTS: Prefs = {
  emails_enabled: true,
  email_new_match: true,
  email_contact_request: true,
  email_contact_accepted: true,
  email_new_message: true,
  email_project_published: true,
  email_verification_result: true,
  email_project_reported: true,
  email_account_warning: true,
  email_product_updates: false,
};

export function NotificationPreferencesCard() {
  const { t } = useTranslation();
  const { user } = useMyRole();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notification-prefs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return { ...DEFAULTS, ...(data ?? {}) } as Prefs;
    },
  });

  const update = async (patch: Partial<Prefs>) => {
    if (!user || !prefs) return;
    setSaving(true);
    const next = { ...prefs, ...patch };
    qc.setQueryData(["notification-prefs", user.id], next);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
      if (error) throw error;
      toast.success(t("notifPrefs.saved"));
    } catch (err: any) {
      qc.setQueryData(["notification-prefs", user.id], prefs);
      toast.error(err.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("notifPrefs.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("notifPrefs.sub")}</p>
      </div>

      {isLoading || !prefs ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <Label htmlFor="emails_enabled" className="text-sm font-medium">
                {t("notifPrefs.master")}
              </Label>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("notifPrefs.masterHint")}</p>
            </div>
            <Switch
              id="emails_enabled"
              className="shrink-0"
              checked={prefs.emails_enabled}
              disabled={saving}
              onCheckedChange={(v) => update({ emails_enabled: v })}
            />
          </div>

          <ul className="space-y-3">
            {ITEM_KEYS.map((key) => (
              <li key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <Label htmlFor={key} className="min-w-0 text-sm font-normal">
                  {t(`notifPrefs.items.${key}`)}
                </Label>
                <Switch
                  id={key}
                  className="shrink-0"
                  checked={prefs.emails_enabled && prefs[key]}
                  disabled={saving || !prefs.emails_enabled}
                  onCheckedChange={(v) => update({ [key]: v } as Partial<Prefs>)}
                />
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">{t("notifPrefs.pending")}</p>
        </>
      )}
    </Card>
  );
}
