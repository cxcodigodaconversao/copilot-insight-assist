import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type TabelaCadastro = "times" | "origens" | "funis" | "clientes" | "modalidades";

export const CADASTROS: Array<{ tabela: TabelaCadastro; titulo: string; ajuda: string }> = [
  { tabela: "times", titulo: "Times", ajuda: "Times comerciais responsáveis pelas calls." },
  { tabela: "origens", titulo: "Origens", ajuda: "De onde o lead veio." },
  { tabela: "funis", titulo: "Funis", ajuda: "Funis de captação." },
  { tabela: "clientes", titulo: "Clientes", ajuda: "Clientes/empresas donas da oferta." },
  { tabela: "modalidades", titulo: "Modalidades", ajuda: "online, presencial ou telefone." },
];

type Item = { id: string; nome: string; ativo: boolean; ordem: number };

export function useCadastro(tabela: TabelaCadastro, somenteAtivos = true) {
  return useQuery({
    queryKey: ["cadastro", tabela, somenteAtivos],
    queryFn: async () => {
      let q = supabase.from(tabela).select("id, nome, ativo, ordem");
      if (somenteAtivos) q = q.eq("ativo", true);
      const { data, error } = await q.order("ordem").order("nome");
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });
}

function ListaCadastro({
  tabela,
  titulo,
  ajuda,
}: {
  tabela: TabelaCadastro;
  titulo: string;
  ajuda: string;
}) {
  const qc = useQueryClient();
  const { data } = useCadastro(tabela, false);
  const [novo, setNovo] = useState("");

  function recarregar() {
    qc.invalidateQueries({ queryKey: ["cadastro", tabela] });
  }

  async function criar() {
    if (!novo.trim()) return;
    const ordem = (data ?? []).length + 1;
    const { error } = await supabase.from(tabela).insert({ nome: novo.trim(), ordem });
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    setNovo("");
    recarregar();
  }

  async function atualizar(id: string, campos: Partial<Item>) {
    const { error } = await supabase.from(tabela).update(campos).eq("id", id);
    if (error) toast.error("Não foi possível salvar.");
    else recarregar();
  }

  async function remover(id: string) {
    const { error } = await supabase.from(tabela).delete().eq("id", id);
    if (error) toast.error("Não foi possível remover.");
    else recarregar();
  }

  return (
    <div className="card-cx space-y-3 p-5">
      <div>
        <h3 className="text-lg">{titulo}</h3>
        <p className="text-xs text-muted-foreground">{ajuda}</p>
      </div>
      <div className="flex gap-2">
        <Input
          value={novo}
          placeholder={`Adicionar em ${titulo.toLowerCase()}…`}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              criar();
            }
          }}
        />
        <Button type="button" onClick={criar}>
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="space-y-2">
        {(data ?? []).map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <Input
              defaultValue={item.nome}
              onBlur={(e) => {
                if (e.target.value !== item.nome) atualizar(item.id, { nome: e.target.value });
              }}
            />
            <Input
              type="number"
              defaultValue={item.ordem}
              className="w-20"
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (v !== item.ordem) atualizar(item.id, { ordem: v });
              }}
            />
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={item.ativo}
                onChange={(e) => atualizar(item.id, { ativo: e.target.checked })}
              />
              ativo
            </label>
            <Button type="button" variant="ghost" size="icon" onClick={() => remover(item.id)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground">Nada cadastrado ainda.</p>}
      </div>
    </div>
  );
}

export function Cadastros() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {CADASTROS.map((c) => (
        <ListaCadastro key={c.tabela} {...c} />
      ))}
    </div>
  );
}
