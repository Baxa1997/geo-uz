import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/helpers/utils";

/** One sidebar row: grey pill when active; icon only (with the label for screen readers) when collapsed. */
export function NavLink({
  href,
  label,
  icon,
  active,
  collapsed,
  badge,
  onNavigate,
  className,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  collapsed: boolean;
  badge?: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm transition-colors [&_svg]:size-[18px]",
        active
          ? "bg-black/[0.06] font-medium text-foreground"
          : "text-foreground/70 hover:bg-black/[0.04] hover:text-foreground",
        collapsed && "justify-center px-0",
        className,
      )}
    >
      {icon}
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && badge && <span className="shrink-0 text-[0.65rem] text-foreground/60">{badge}</span>}
    </Link>
  );
}
