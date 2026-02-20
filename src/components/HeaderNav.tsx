"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

interface NavItem {
  readonly href: string;
  readonly label: string;
}

interface HeaderNavProps {
  items: readonly NavItem[];
}

export function HeaderNav({ items }: HeaderNavProps) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="-mr-2 flex items-center overflow-x-auto scrollbar-none sm:mr-0" aria-label="Main navigation">
      {items.map(({ href, label }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`
              relative shrink-0 px-2.5 py-2 text-[13px] transition-colors sm:px-3 sm:py-1.5
              ${active
                ? "font-medium text-white"
                : "text-stone-400 hover:text-white"
              }
            `}
          >
            {label}
            {active && (
              <span className="absolute inset-x-2.5 -bottom-[13px] h-[2px] rounded-full bg-white sm:inset-x-3 sm:-bottom-[16px]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
