"use client";

import { useScrollRevealAll } from "@/hooks/useScrollReveal";

/**
 * Drop-in client component that activates scroll-triggered reveals
 * for all `.fade-in` elements on the page. Place anywhere in the tree.
 *
 * Usage (in a Server Component):
 *   <ScrollRevealActivator />
 *   <section className="fade-in">...</section>
 */
export function ScrollRevealActivator() {
  useScrollRevealAll();
  return null;
}
