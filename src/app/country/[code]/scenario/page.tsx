import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ code: string }>;
}

/**
 * Legacy route — simulation is now integrated into the country page.
 * Redirect to the country page which includes the Simulation Laboratory tab.
 */
export default async function ScenarioRedirect({ params }: PageProps) {
  const { code } = await params;
  redirect(`/country/${code.toLowerCase()}#simulation`);
}
