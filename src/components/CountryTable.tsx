import Link from "next/link";
import type { ISICompositeCountry } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { formatScore } from "@/lib/presentation";

interface CountryTableProps {
  countries: ISICompositeCountry[];
}

export function CountryTable({ countries }: CountryTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-primary">
      <table className="min-w-full divide-y divide-border-primary">
        <thead className="bg-surface-tertiary">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-quaternary">
              Country
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-quaternary">
              ISI Composite
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-quaternary">
              Financial
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-quaternary">
              Energy
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-quaternary">
              Technology
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-quaternary">
              Defense
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-quaternary">
              Critical Inputs
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-text-quaternary">
              Logistics
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-text-quaternary">
              Classification
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-primary bg-surface-primary">
          {countries.map((c) => (
            <tr
              key={c.country}
              className="transition-colors hover:bg-surface-tertiary"
            >
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                <Link
                  href={`/country/${c.country}`}
                  className="text-navy-700 hover:text-navy-900 hover:underline dark:text-navy-400 dark:hover:text-navy-300"
                >
                  {c.country_name}
                </Link>
                <span className="ml-1.5 text-xs text-text-quaternary">
                  {c.country}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm font-semibold text-text-primary">
                {formatScore(c.isi_composite)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-text-tertiary">
                {formatScore(c.axis_1_financial)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-text-tertiary">
                {formatScore(c.axis_2_energy)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-text-tertiary">
                {formatScore(c.axis_3_technology)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-text-tertiary">
                {formatScore(c.axis_4_defense)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-text-tertiary">
                {formatScore(c.axis_5_critical_inputs)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm text-text-tertiary">
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
