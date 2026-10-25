"use client";

// A top-bar link that marks the current page (aria-current), so the location
// is clear to everyone, including screen reader users.
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const current = path === href || (href !== "/app" && path.startsWith(href + "/"));
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`inline-flex h-9 items-center rounded-md px-2.5 text-sm transition-colors duration-150 ${
        current ? "bg-fill font-medium text-ink" : "text-muted hover:bg-fill hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
