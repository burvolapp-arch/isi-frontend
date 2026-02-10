import Link from "next/link";
import type { ISICompositeCountry } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

interface CountryTableProps {
  countries: ISICompositeCountry[];
}

export function CountryTable({ countries }: CountryTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Country
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              ISI Composite
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Financial
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Energy
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Technology
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Defense
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Critical Inputs
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Logistics
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Classification
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
          {countries.map((c) => (
            <tr
              key={c.country}
              className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                <Link
                  href={`/country/${c.country}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {c.country_name}
                </Link>
                <span className="ml-1.5 text-xs text-zinc-400">
                  {c.country}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm font-semibold">
                {formatScore(c.isi_composite)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-zinc-600 dark:text-zinc-400">
                {formatScore(c.axis_1_financial)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-zinc-600 dark:text-zinc-400">
                {formatScore(c.axis_2_energy)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-zinc-600 dark:text-zinc-400">
                {formatScore(c.axis_3_technology)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-zinc-600 dark:text-zinc-400">
                {formatScore(c.axis_4_defense)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-zinc-600 dark:text-zinc-400">
                {formatScore(c.axis_5_critical_inputs)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-zinc-600 dark:text-zinc-400">
                {formatScore(c.axis_6_logistics)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-center">
                <StatusBadge classification={c.classification} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatScore(score: number | null): string {
  if (score === null || score === undefined) return "—";
  return score.toFixed(4);
}
