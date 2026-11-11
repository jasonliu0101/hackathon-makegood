import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { IntakeForm } from "@/components/IntakeForm";
import { gmiModel } from "@/lib/gmi";

export const metadata: Metadata = { title: "New settlement — MakeGood" };

export default async function StartPage({ searchParams }: PageProps<"/start">) {
  const sp = await searchParams;
  const story = typeof sp.story === "string" ? sp.story : "";
  const scenario = typeof sp.scenario === "string" ? sp.scenario : undefined;
  const role = sp.role === "affected" ? "affected" : "responsible";
  return (
    <AppShell current="start">
      {/* key: a new ?scenario= from the landing page re-seeds the form */}
      <IntakeForm key={`${scenario ?? ""}|${story}|${role}`} initialScenario={scenario} initialStory={story} initialRole={role} ownModel={gmiModel()} />
    </AppShell>
  );
}
