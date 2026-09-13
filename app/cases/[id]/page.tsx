import CaseWorkspace from "@/components/cases/CaseWorkspace";
export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  return <CaseWorkspace caseId={(await params).id} />;
}
