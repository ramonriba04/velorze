import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
  ctaParams?: Record<string, string>;
  onCta?: () => void;
  secondaryLabel?: string;
  secondaryTo?: string;
  onSecondary?: () => void;
  className?: string;
  compact?: boolean;
};

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaTo,
  ctaParams,
  onCta,
  secondaryLabel,
  secondaryTo,
  onSecondary,
  className,
  compact,
}: Props) {
  return (
    <Card className={cn("text-center border-dashed", compact ? "p-6" : "p-10", className)}>
      {icon && <div className="mx-auto text-muted-foreground [&>svg]:mx-auto [&>svg]:h-10 [&>svg]:w-10">{icon}</div>}
      <h3 className="mt-3 font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{description}</p>}
      {(ctaLabel || secondaryLabel) && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {ctaLabel && (ctaTo ? (
            <Link to={ctaTo as any} params={ctaParams as any}><Button size="sm">{ctaLabel}</Button></Link>
          ) : (
            <Button size="sm" onClick={onCta}>{ctaLabel}</Button>
          ))}
          {secondaryLabel && (secondaryTo ? (
            <Link to={secondaryTo as any}><Button size="sm" variant="outline">{secondaryLabel}</Button></Link>
          ) : (
            <Button size="sm" variant="outline" onClick={onSecondary}>{secondaryLabel}</Button>
          ))}
        </div>
      )}
    </Card>
  );
}
