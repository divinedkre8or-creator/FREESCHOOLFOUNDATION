import { z } from "zod";

const publicSupabaseConfigSchema = z.object({
  url: z.string().url(),
  publishableKey: z.string().min(20),
});

export type PublicSupabaseConfig = z.infer<typeof publicSupabaseConfigSchema>;

export function parsePublicSupabaseConfig(input: {
  url: string | undefined;
  publishableKey: string | undefined;
}): PublicSupabaseConfig {
  return publicSupabaseConfigSchema.parse(input);
}

export function getBrowserSupabaseConfig(): PublicSupabaseConfig {
  return parsePublicSupabaseConfig({
    url: import.meta.env["VITE_SUPABASE_URL"],
    publishableKey: import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
  });
}

export function getServerSupabaseConfig(): PublicSupabaseConfig {
  return parsePublicSupabaseConfig({
    url: process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"],
    publishableKey:
      process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
  });
}
