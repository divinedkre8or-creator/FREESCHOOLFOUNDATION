import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let documentId: string | undefined;
  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) throw new Error("authentication_required");
    const { data: userData, error: userError } = await service.auth.getUser(token);
    if (userError || !userData.user) throw new Error("authentication_required");

    ({ documentId } = (await request.json()) as { documentId?: string });
    if (!documentId) throw new Error("document_required");

    const { data: document, error: documentError } = await service
      .from("application_documents")
      .select("id,storage_path,display_name,applications!inner(applicant_id)")
      .eq("id", documentId)
      .single();
    if (documentError || !document?.storage_path) throw new Error("document_not_found");
    const application = document.applications as unknown as { applicant_id: string };
    if (application.applicant_id !== userData.user.id) throw new Error("document_forbidden");

    const { data: file, error: downloadError } = await service.storage
      .from("application-documents")
      .download(document.storage_path);
    if (downloadError || !file) throw new Error("download_failed");

    const scanKey = Deno.env.get("CLOUDMERSIVE_API_KEY");
    if (!scanKey) throw new Error("scanner_not_configured");
    const form = new FormData();
    form.append("inputFile", file, document.display_name ?? "document");
    const scanResponse = await fetch("https://api.cloudmersive.com/virus/scan/file/advanced", {
      method: "POST",
      headers: {
        Apikey: scanKey,
        allowExecutables: "false",
        allowInvalidFiles: "false",
        allowScripts: "false",
        allowPasswordProtectedFiles: "false",
        allowMacros: "false",
        restrictFileTypes: ".PDF,.JPG,.JPEG,.PNG",
      },
      body: form,
    });
    if (!scanResponse.ok) throw new Error("scanner_unavailable");
    const result = (await scanResponse.json()) as { Successful?: boolean; CleanResult?: boolean };
    const clean = result.Successful === true && result.CleanResult === true;

    await service
      .from("application_documents")
      .update({ scan_status: clean ? "clean" : "rejected" })
      .eq("id", documentId);
    if (!clean) await service.storage.from("application-documents").remove([document.storage_path]);

    return Response.json({ clean }, { headers: corsHeaders });
  } catch (error) {
    if (documentId)
      await service
        .from("application_documents")
        .update({ scan_status: "failed" })
        .eq("id", documentId);
    const message = error instanceof Error ? error.message : "scan_failed";
    const status = message.includes("authentication") || message.includes("forbidden") ? 403 : 400;
    return Response.json({ error: message }, { status, headers: corsHeaders });
  }
});
