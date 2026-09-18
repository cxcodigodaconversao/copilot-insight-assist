import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Papel = z.enum(["adm", "lider", "closer", "sdr"]);

const ConviteInput = z.object({
  email: z.string().email(),
  nome: z.string().min(1),
  role: Papel,
  redirectTo: z.string().url().optional(),
});

type ContextoAdm = {
  userId: string;
  supabase: {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "adm" },
    ) => PromiseLike<{ data: unknown; error: unknown }>;
  };
};

async function exigirAdm(context: ContextoAdm) {
  const { data: ehAdm, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "adm",
  });
  if (error) throw new Error("Não foi possível verificar suas permissões.");
  if (!ehAdm) throw new Error("Apenas o administrador pode fazer isso.");
}

/** Convida um membro da equipe por e-mail. Somente o administrador pode chamar. */
export const convidarMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ConviteInput.parse(d))
  .handler(async ({ data, context }) => {
    await exigirAdm(context);

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

/** Cria um usuário já com senha definida pelo administrador. */
export const criarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        nome: z.string().min(1),
        email: z.string().email(),
        senha: z.string().min(6),
        role: Papel,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await exigirAdm(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        throw new Error("Este e-mail já está cadastrado.");
      }
      throw new Error(error.message);
    }

    const userId = criado.user!.id;

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, nome: data.nome, email: data.email, ativo: true });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });

    return { ok: true, id: userId };
  });

/** Troca o papel de uma pessoa. */
export const alterarPapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), role: Papel }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirAdm(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Define uma nova senha para a pessoa. */
export const definirSenha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), senha: z.string().min(6) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await exigirAdm(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.senha,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Ativa ou desativa o acesso da pessoa. */
export const alternarAtivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), ativo: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await exigirAdm(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ ativo: data.ativo })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Remove o acesso da pessoa. */
export const excluirUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirAdm(context);
    if (data.userId === context.userId) throw new Error("Você não pode excluir o próprio acesso.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
