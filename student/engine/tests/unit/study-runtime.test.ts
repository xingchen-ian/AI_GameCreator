import { afterEach, describe, expect, it } from "vitest";
import { getStudyRedirectUrl } from "@/lib/server/study-runtime";

const originalPublicAppUrl = process.env.PUBLIC_APP_URL;
const originalRuntimePath = process.env.STUDY_RUNTIME_PATH;

afterEach(() => {
  if (originalPublicAppUrl === undefined) delete process.env.PUBLIC_APP_URL;
  else process.env.PUBLIC_APP_URL = originalPublicAppUrl;
  if (originalRuntimePath === undefined) delete process.env.STUDY_RUNTIME_PATH;
  else process.env.STUDY_RUNTIME_PATH = originalRuntimePath;
});

describe("study redirect URLs", () => {
  it("uses the configured public origin instead of the tunnel's localhost upstream", () => {
    process.env.PUBLIC_APP_URL = "https://teacher-demo.example";

    expect(getStudyRedirectUrl("https://localhost:3000/join/token", "/").toString())
      .toBe("https://teacher-demo.example/");
  });

  it("falls back to the request origin when no public origin is available", () => {
    expect(getStudyRedirectUrl("http://localhost:3000/join/token", "/?accessError=invalid", null).toString())
      .toBe("http://localhost:3000/?accessError=invalid");
  });
});
