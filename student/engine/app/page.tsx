import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAppUser } from "@/app/app-auth";
import { ParticipantAccess } from "@/components/access/participant-access";
import { WorkflowApp } from "@/components/workflow/workflow-app";

export const dynamic = "force-dynamic";

function isLocalHost(value: string) {
  try {
    return ["localhost", "127.0.0.1", "::1"].includes(new URL(`http://${value}`).hostname);
  } catch {
    return false;
  }
}

export default async function Home(props: { searchParams: Promise<{ accessError?: string }> }) {
  const user = await getAppUser();
  if (!user) {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim()
      || requestHeaders.get("host")
      || "";
    if (isLocalHost(host)) redirect("/admin/workspace");
    const searchParams = await props.searchParams;
    return <ParticipantAccess invalidLink={searchParams.accessError === "invalid"} />;
  }
  return <WorkflowApp displayName={user.displayName} participantMode={user.accessMode === "participant"} />;
}
