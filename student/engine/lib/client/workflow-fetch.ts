export function workflowFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin/workspace")) {
    headers.set("x-game-workflow-access", "admin-workspace");
  }
  return fetch(input, { ...init, headers });
}
