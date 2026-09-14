import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Papel = "lider" | "closer" | "sdr";

type AuthState = {
  session: Session | null;
  user: User | null;
  nome: string;
  papel: Papel | null;
  carregando: boolean;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  nome: "",
  papel: null,
  carregando: true,
  sair: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [nome, setNome] = useState("");
  const [papel, setPapel] = useState<Papel | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (!s) {
        setPapel(null);
        setNome("");
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCarregando(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let cancelado = false;
    (async () => {
      const [{ data: perfil }, { data: papeis }] = await Promise.all([
        supabase.from("profiles").select("nome").eq("id", session.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", session.user.id),
      ]);
      if (cancelado) return;
      setNome(perfil?.nome ?? "");
      const lista = (papeis ?? []).map((p) => p.role as Papel);
      setPapel(lista.includes("lider") ? "lider" : (lista[0] ?? "closer"));
    })();
    return () => {
      cancelado = true;
    };
  }, [session?.user?.id, session?.user]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        nome,
        papel,
        carregando,
        sair: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
