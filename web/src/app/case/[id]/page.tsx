import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CaseRoom, type Viewer } from "@/components/CaseRoom";
import { getCase } from "@/lib/store";
import { paymentsMode } from "@/lib/payments";

export const metadata: Metadata = { title: "Case — MakeGood" };

export default async function CasePage({ params, searchParams }: PageProps<"/case/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const c = await getCase(id);
  if (!c) notFound();
  const as: Viewer = sp.as === "affected" || sp.as === "reviewer" || sp.as === "notary" ? sp.as : "responsible";
  return (
    <AppShell>
      <CaseRoom initial={c} initialViewer={as} payments={paymentsMode()} />
    </AppShell>
  );
}
