import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReportCardView } from "@/components/reports/report-card-view";
import type { ReportSnapshot } from "@/types/report";

export const dynamic = "force-dynamic";

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 16) {
    notFound();
  }

  const adminSupabase = createAdminClient();
  const { data: report } = await adminSupabase
    .from("report_cards")
    .select("snapshot_data")
    .eq("access_token", token)
    .maybeSingle();

  if (!report?.snapshot_data) {
    notFound();
  }

  const snapshot = report.snapshot_data as ReportSnapshot;

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-6 sm:px-6 print:bg-white print:p-0">
      <ReportCardView snapshot={snapshot} showPrintButton />
    </main>
  );
}