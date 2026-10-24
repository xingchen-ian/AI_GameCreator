import { AdminResearch } from "@/components/access/admin-research";
import { hasAdminSession } from "@/lib/server/access-session";

export const dynamic = "force-dynamic";

export default async function ResearchAdminPage() {
  return <AdminResearch initialAuthenticated={await hasAdminSession()} />;
}
