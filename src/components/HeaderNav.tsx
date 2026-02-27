"use client";

import { usePathname } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
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
  const scrollRef = useRef<HTMLElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setCanScrollRight(!atEnd && el.scrollWidth > el.clientWidth);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="relative -mr-2 min-w-0 sm:mr-0">
      {/* Scroll fade hint — only visible when more content is scrollable */}
      <div
        className={`pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-navy-900 to-transparent transition-opacity duration-150 sm:hidden ${
          canScrollRight ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />
      <nav
        ref={scrollRef}
        className="flex items-center overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x scrollbar-none"
        aria-label="Main navigation"
      >
        {items.map(({ href, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`
                relative shrink-0 px-2.5 py-2 text-[13px] leading-none transition-colors sm:px-3 sm:py-1.5
                ${active
                  ? "font-medium text-white"
                  : "text-stone-400 hover:text-white"
                }
              `}
            >
              {label}
              {active && (
                <span className="absolute inset-x-2.5 -bottom-[7px] h-[2px] rounded-full bg-white sm:inset-x-3 sm:-bottom-[16px]" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
