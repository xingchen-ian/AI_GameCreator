import { redirect } from "next/navigation";
import { WorkflowApp } from "@/components/workflow/workflow-app";
import { hasAdminSession } from "@/lib/server/access-session";

export const dynamic = "force-dynamic";

export default async function AdminWorkspacePage() {
  if (!await hasAdminSession()) redirect("/admin/research");
  const displayName = process.env.APP_USER_NAME?.trim()
    || process.env.APP_USER_EMAIL?.trim()
    || "研究管理者";
  return <WorkflowApp displayName={displayName} adminWorkspace />;
}
