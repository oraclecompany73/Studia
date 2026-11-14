import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin/owner: load lesson notes + PDF text for AI quiz prompt grounding. */
export const getQuizMaterialSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { materialId: string }) => {
    const materialId = typeof input?.materialId === "string" ? input.materialId.trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(materialId)) throw new Error("Invalid material.");
    return { materialId };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Admins only");
    const { loadQuizMaterialSource } = await import("./quiz-material.server");
    return loadQuizMaterialSource(data.materialId);
  });
