import { describe, expect, it } from "vitest";
import { parsePublicSupabaseConfig } from "./config";

describe("parsePublicSupabaseConfig", () => {
  it("accepts a valid project URL and publishable key", () => {
    expect(
      parsePublicSupabaseConfig({
        url: "https://project.supabase.co",
        publishableKey: "publishable-key-with-safe-length",
      }),
    ).toEqual({
      url: "https://project.supabase.co",
      publishableKey: "publishable-key-with-safe-length",
    });
  });

  it("rejects missing or malformed public configuration", () => {
    expect(() =>
      parsePublicSupabaseConfig({ url: "not-a-url", publishableKey: "short" }),
    ).toThrow();
  });
});
