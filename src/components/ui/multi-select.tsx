import * as React from "react";
import { Check, ChevronsUpDown, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dedupNormalized, normalizeCustom } from "@/lib/taxonomy";

export type MultiSelectOption = { value: string; label: string };

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowOther?: boolean;
  otherLabel?: string;
  customLabel?: string;
  /** Optional label resolver for custom values (defaults to identity). */
  renderLabel?: (value: string) => string;
  className?: string;
  maxItems?: number;
}

/**
 * Multi-select with badge chips + searchable popover.
 * - Supports an "Other" option that reveals a custom-value input.
 * - Custom values are normalized (trim, max 50 chars, dedup case-insensitive).
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Selecciona...",
  searchPlaceholder = "Buscar...",
  emptyText = "Sin resultados",
  allowOther = false,
  otherLabel = "Otro",
  customLabel = "Añadir personalizado",
  renderLabel,
  className,
  maxItems,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [showCustom, setShowCustom] = React.useState(false);
  const [custom, setCustom] = React.useState("");

  const optionValues = React.useMemo(() => new Set(options.map((o) => o.value)), [options]);
  const labelFor = (v: string) => {
    const opt = options.find((o) => o.value === v);
    return opt?.label ?? (renderLabel ? renderLabel(v) : v);
  };

  const toggle = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      if (maxItems && value.length >= maxItems) return;
      onChange([...value, v]);
    }
  };

  const remove = (v: string) => onChange(value.filter((x) => x !== v));

  const addCustom = () => {
    const norm = normalizeCustom(custom);
    if (!norm) return;
    const next = dedupNormalized([...value, norm]);
    onChange(next);
    setCustom("");
    setShowCustom(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-muted-foreground">
              {value.length === 0 ? placeholder : `${value.length} seleccionados`}
            </span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => {
                  const selected = value.includes(opt.value);
                  return (
                    <CommandItem
                      key={opt.value}
                      value={opt.label}
                      onSelect={() => toggle(opt.value)}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                      {opt.label}
                    </CommandItem>
                  );
                })}
                {allowOther && (
                  <CommandItem
                    value={otherLabel}
                    onSelect={() => {
                      setShowCustom(true);
                      setOpen(false);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {otherLabel}
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {allowOther && showCustom && (
        <div className="flex gap-2">
          <Input
            autoFocus
            maxLength={50}
            placeholder={customLabel}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <Button type="button" size="sm" onClick={addCustom}>
            +
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { setShowCustom(false); setCustom(""); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => {
            const isCustom = !optionValues.has(v);
            return (
              <Badge key={v} variant={isCustom ? "outline" : "secondary"} className="gap-1 pr-1">
                {labelFor(v)}
                <button
                  type="button"
                  onClick={() => remove(v)}
                  className="rounded-sm hover:bg-muted/50 p-0.5"
                  aria-label={`Remove ${labelFor(v)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SingleSearchSelectProps {
  options: MultiSelectOption[];
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowOther?: boolean;
  otherLabel?: string;
  className?: string;
}

/**
 * Searchable single-select with optional custom "Other" value.
 */
export function SingleSearchSelect({
  options,
  value,
  onChange,
  placeholder = "Selecciona...",
  searchPlaceholder = "Buscar...",
  emptyText = "Sin resultados",
  allowOther = false,
  otherLabel = "Otro",
  className,
}: SingleSearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [showCustom, setShowCustom] = React.useState(false);
  const [custom, setCustom] = React.useState("");

  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  const commit = () => {
    const norm = normalizeCustom(custom);
    if (!norm) return;
    onChange(norm);
    setCustom("");
    setShowCustom(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value ? labelFor(value) : placeholder}
            </span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                    {opt.label}
                  </CommandItem>
                ))}
                {allowOther && (
                  <CommandItem
                    value={otherLabel}
                    onSelect={() => {
                      setShowCustom(true);
                      setOpen(false);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {otherLabel}
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {allowOther && showCustom && (
        <div className="flex gap-2">
          <Input
            autoFocus
            maxLength={50}
            placeholder={otherLabel}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
          />
          <Button type="button" size="sm" onClick={commit}>OK</Button>
        </div>
      )}
    </div>
  );
}
