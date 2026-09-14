import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ConviteInput = z.object({
  email: z.string().email(),
  nome: z.string().min(1),
  role: z.enum(["lider", "closer", "sdr"]),
  redirectTo: z.string().url().optional(),
});

/** Convida um membro da equipe por e-mail. Somente o administrador pode chamar. */
export const convidarMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ConviteInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: ehAdm, error: erroPapel } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "adm",
    });
    if (erroPapel) throw new Error("Não foi possível verificar suas permissões.");
    if (!ehAdm) throw new Error("Apenas o administrador pode convidar pessoas.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { nome: data.nome, role: data.role },
      ...(data.redirectTo ? { redirectTo: data.redirectTo } : {}),
    });
    if (error) throw new Error(error.message);

    await context.supabase.from("convites").insert({
      email: data.email,
      nome: data.nome,
      role: data.role,
      status: "enviado",
      convidado_por: context.userId,
    });

    return { ok: true };
  });
