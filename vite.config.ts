// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Load ALL .env* variables (not just VITE_*) into process.env so that
// server functions (createServerFn) can read secrets like RESEND_API_KEY,
// SUPABASE_SERVICE_ROLE_KEY, etc. that Vite intentionally keeps out of
// the client bundle.
const mode = process.env["NODE_ENV"] || "development";
const env = loadEnv(mode, process.cwd(), "");
for (const key in env) {
  if (!process.env[key]) {
    process.env[key] = env[key];
  }
}

export default defineConfig({
  // Production deployment target. Vercel runs TanStack Start server functions
  // through Nitro, including the private Resend delivery handler.
  nitro: { preset: "vercel" },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
