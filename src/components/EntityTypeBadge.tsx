import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

export type EntityType = "persona_fisica" | "startup" | "empresa" | "holding" | "otro";

const ICON: Record<EntityType, string> = {
  persona_fisica: "👤",
  startup: "🚀",
  empresa: "🏢",
  holding: "🏛️",
  otro: "🏷️",
};

export function EntityTypeBadge({
  type,
  className = "",
  size = "sm",
}: {
  type?: string | null;
  className?: string;
  size?: "sm" | "xs";
}) {
  const { t } = useTranslation();
  const key = (type ?? "empresa") as EntityType;
  const icon = ICON[key] ?? ICON.empresa;
  const label = t(`entityType.${key}`, { defaultValue: t("entityType.empresa") });
  return (
    <Badge
      variant="outline"
      className={`gap-1 font-normal ${size === "xs" ? "text-[10px] px-1.5 py-0" : "text-xs"} ${className}`}
    >
      <span aria-hidden>{icon}</span>
      {label}
    </Badge>
  );
}
