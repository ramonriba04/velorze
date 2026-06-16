import { Building2, User } from "lucide-react";

type Props = {
  src?: string | null;
  name?: string | null;
  size?: number;
  kind?: "user" | "company";
  className?: string;
};

function initials(name?: string | null) {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function EntityAvatar({ src, name, size = 40, kind = "user", className = "" }: Props) {
  const radius = kind === "user" ? "rounded-full" : "rounded-md";
  const style = { width: size, height: size };
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        style={style}
        className={`${radius} object-cover border border-border bg-muted ${className}`}
        loading="lazy"
      />
    );
  }
  const init = initials(name);
  return (
    <div
      style={style}
      className={`${radius} bg-muted text-muted-foreground border border-border flex items-center justify-center font-medium ${className}`}
    >
      {init || (kind === "company" ? <Building2 className="h-1/2 w-1/2" /> : <User className="h-1/2 w-1/2" />)}
    </div>
  );
}
