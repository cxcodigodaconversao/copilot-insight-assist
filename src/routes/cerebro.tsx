import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { testarCerebro } from "@/lib/copiloto.functions";

export const Route = createFileRoute("/cerebro")({
  head: () => ({
    meta: [
      { title: "Cérebro CX — Copiloto CX" },
      {
        name: "description",
        content: "Edite ofertas, quebras de objeção, perfis DISC e regras do copiloto.",
      },
      { property: "og:title", content: "Cérebro CX — Copiloto CX" },
      { property: "og:description", content: "Ofertas, objeções, perfis DISC e regras." },
    ],
  }),
  component: Cerebro,
});

const CATEGORIAS = [
  "preco",
  "tempo",
  "confianca",
  "autoridade",
  "necessidade",
  "concorrente",
  "outra",
] as const;

function Cerebro() {
  const { papel, carregando } = useAuth();

  if (carregando) return <AppShell>Carregando…</AppShell>;
  if (papel !== "lider")
    return (
      <AppShell>
        <div className="card-cx p-10 text-center text-muted-foreground">
          Esta área é exclusiva da liderança.
        </div>
      </AppShell>
    );

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl">
        Cérebro <span className="text-primary">CX</span>
      </h1>
      <Tabs defaultValue="ofertas">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="ofertas">Ofertas</TabsTrigger>
          <TabsTrigger value="objecoes">Quebras de objeção</TabsTrigger>
          <TabsTrigger value="disc">Perfis DISC</TabsTrigger>
          <TabsTrigger value="regras">Regras do copiloto</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
          <TabsTrigger value="teste">Testar o cérebro</TabsTrigger>
        </TabsList>
        <TabsContent value="ofertas">
          <Ofertas />
        </TabsContent>
        <TabsContent value="objecoes">
          <Objecoes />
        </TabsContent>
        <TabsContent value="disc">
          <Disc />
        </TabsContent>
        <TabsContent value="regras">
          <Regras />
        </TabsContent>
        <TabsContent value="config">
          <Config />
        </TabsContent>
        <TabsContent value="teste">
          <Teste />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Ofertas() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["ofertas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ofertas").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  async function criar() {
    const { error } = await supabase.from("ofertas").insert({ nome: "Nova oferta" });
    if (error) {
      toast.error("Não foi possível criar a oferta.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["ofertas"] });
  }

  return (
    <div className="space-y-4">
      <Button onClick={criar}>
        <Plus className="size-4" /> Nova oferta
      </Button>
      {(data ?? []).map((o) => (
        <OfertaCard key={o.id} oferta={o} />
      ))}
    </div>
  );
}

type Oferta = {
  id: string;
  nome: string;
  descricao: string;
  preco_condicoes: string;
  garantia: string;
  diferenciais: string;
  publico_ideal: string;
  ativo: boolean;
};

function OfertaCard({ oferta }: { oferta: Oferta }) {
  const qc = useQueryClient();
  const [f, setF] = useState(oferta);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => setF(oferta), [oferta]);

  async function salvar() {
    setSalvando(true);
    const { id, ...resto } = f;
    const { error } = await supabase.from("ofertas").update(resto).eq("id", id);
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success("Oferta salva.");
    qc.invalidateQueries({ queryKey: ["ofertas"] });
  }

  async function excluir() {
    const { error } = await supabase.from("ofertas").delete().eq("id", f.id);
    if (error) {
      toast.error("Não foi possível excluir.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["ofertas"] });
  }

  return (
    <div className="card-cx space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Público ideal</Label>
          <Input
            value={f.publico_ideal}
            onChange={(e) => setF({ ...f, publico_ideal: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea
          rows={3}
          value={f.descricao}
          onChange={(e) => setF({ ...f, descricao: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Preço e condições</Label>
          <Textarea
            rows={2}
            value={f.preco_condicoes}
            onChange={(e) => setF({ ...f, preco_condicoes: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Garantia</Label>
          <Textarea
            rows={2}
            value={f.garantia}
            onChange={(e) => setF({ ...f, garantia: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Diferenciais</Label>
        <Textarea
          rows={3}
          value={f.diferenciais}
          onChange={(e) => setF({ ...f, diferenciais: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={salvar} disabled={salvando}>
          Salvar
        </Button>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={f.ativo}
            onChange={(e) => setF({ ...f, ativo: e.target.checked })}
          />
          Ativa
        </label>
        <Button variant="ghost" className="ml-auto text-destructive" onClick={excluir}>
          <Trash2 className="size-4" /> Excluir
        </Button>
      </div>
    </div>
  );
}

type Objecao = {
  id: string;
  oferta_id: string | null;
  categoria: string;
  gatilho: string;
  como_quebrar: string;
  pergunta_pronta: string;
  ativo: boolean;
  ordem: number;
};

function Objecoes() {
  const qc = useQueryClient();
  const { data: ofertas } = useQuery({
    queryKey: ["ofertas"],
    queryFn: async () => (await supabase.from("ofertas").select("id, nome").order("nome")).data,
  });
  const { data } = useQuery({
    queryKey: ["objecoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("objecoes")
        .select("*")
        .order("categoria")
        .order("ordem");
      if (error) throw error;
      return data as Objecao[];
    },
  });

  async function criar(categoria: string) {
    const { error } = await supabase.from("objecoes").insert({ categoria, ordem: 100 });
    if (error) {
      toast.error("Não foi possível criar.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["objecoes"] });
  }

  async function mover(obj: Objecao, delta: number) {
    const { error } = await supabase
      .from("objecoes")
      .update({ ordem: obj.ordem + delta })
      .eq("id", obj.id);
    if (error) {
      toast.error("Não foi possível reordenar.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["objecoes"] });
  }

  return (
    <div className="space-y-8">
      {CATEGORIAS.map((cat) => {
        const lista = (data ?? []).filter((o) => o.categoria === cat);
        return (
          <div key={cat}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-sm uppercase tracking-widest text-primary">{cat}</h2>
              <Button size="sm" variant="ghost" onClick={() => criar(cat)}>
                <Plus className="size-4" /> Adicionar
              </Button>
            </div>
            <div className="grid gap-3">
              {lista.map((o) => (
                <ObjecaoCard
                  key={o.id}
                  objecao={o}
                  ofertas={ofertas ?? []}
                  onMover={(d) => mover(o, d)}
                />
              ))}
              {lista.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma quebra cadastrada aqui.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ObjecaoCard({
  objecao,
  ofertas,
  onMover,
}: {
  objecao: Objecao;
  ofertas: Array<{ id: string; nome: string }>;
  onMover: (delta: number) => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState(objecao);
  useEffect(() => setF(objecao), [objecao]);

  async function salvar() {
    const { id, ...resto } = f;
    const { error } = await supabase.from("objecoes").update(resto).eq("id", id);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success("Quebra salva.");
    qc.invalidateQueries({ queryKey: ["objecoes"] });
  }

  async function duplicar() {
    const { id, ...resto } = f;
    void id;
    const { error } = await supabase.from("objecoes").insert({ ...resto, ordem: resto.ordem + 1 });
    if (error) {
      toast.error("Não foi possível duplicar.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["objecoes"] });
  }

  async function excluir() {
    const { error } = await supabase.from("objecoes").delete().eq("id", f.id);
    if (error) {
      toast.error("Não foi possível excluir.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["objecoes"] });
  }

  return (
    <div className="card-cx space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Vale para</Label>
          <select
            value={f.oferta_id ?? ""}
            onChange={(e) => setF({ ...f, oferta_id: e.target.value || null })}
            className="h-10 w-full rounded-md border border-input bg-input px-3 text-sm"
          >
            <option value="">Todas as ofertas</option>
            {ofertas.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <select
            value={f.categoria}
            onChange={(e) => setF({ ...f, categoria: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-input px-3 text-sm"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Gatilho (o que o cliente diz)</Label>
        <Textarea
          rows={2}
          value={f.gatilho}
          onChange={(e) => setF({ ...f, gatilho: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Como quebrar</Label>
        <Textarea
          rows={3}
          value={f.como_quebrar}
          onChange={(e) => setF({ ...f, como_quebrar: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Pergunta pronta</Label>
        <Textarea
          rows={2}
          value={f.pergunta_pronta}
          onChange={(e) => setF({ ...f, pergunta_pronta: e.target.value })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={salvar}>Salvar</Button>
        <Button variant="secondary" onClick={duplicar}>
          <Copy className="size-4" /> Duplicar
        </Button>
        <Button variant="outline" size="sm" onClick={() => onMover(-1)}>
          Subir
        </Button>
        <Button variant="outline" size="sm" onClick={() => onMover(1)}>
          Descer
        </Button>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={f.ativo}
            onChange={(e) => setF({ ...f, ativo: e.target.checked })}
          />
          Ativa
        </label>
        <Button variant="ghost" className="ml-auto text-destructive" onClick={excluir}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function Disc() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["perfis_disc"],
    queryFn: async () => (await supabase.from("perfis_disc").select("*").order("tipo")).data,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {(data ?? []).map((p) => (
        <DiscCard key={p.id} perfil={p} onSalvo={() => qc.invalidateQueries({ queryKey: ["perfis_disc"] })} />
      ))}
    </div>
  );
}

type Perfil = {
  id: string;
  tipo: string;
  como_identificar: string;
  como_conduzir: string;
  evitar: string;
};

function DiscCard({ perfil, onSalvo }: { perfil: Perfil; onSalvo: () => void }) {
  const [f, setF] = useState(perfil);
  useEffect(() => setF(perfil), [perfil]);

  async function salvar() {
    const { id, ...resto } = f;
    const { error } = await supabase.from("perfis_disc").update(resto).eq("id", id);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success(`Perfil ${f.tipo} salvo.`);
    onSalvo();
  }

  return (
    <div className="card-cx space-y-3 p-5">
      <h2 className="font-display text-2xl text-primary">{f.tipo}</h2>
      <div className="space-y-2">
        <Label>Como identificar</Label>
        <Textarea
          rows={3}
          value={f.como_identificar}
          onChange={(e) => setF({ ...f, como_identificar: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Como conduzir</Label>
        <Textarea
          rows={3}
          value={f.como_conduzir}
          onChange={(e) => setF({ ...f, como_conduzir: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Evitar</Label>
        <Textarea
          rows={2}
          value={f.evitar}
          onChange={(e) => setF({ ...f, evitar: e.target.value })}
        />
      </div>
      <Button onClick={salvar}>Salvar</Button>
    </div>
  );
}

function Regras() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["regras_copiloto"],
    queryFn: async () => (await supabase.from("regras_copiloto").select("*").order("chave")).data,
  });

  async function salvar(chave: string, valor: string) {
    const { error } = await supabase.from("regras_copiloto").update({ valor }).eq("chave", chave);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success("Regra salva.");
    qc.invalidateQueries({ queryKey: ["regras_copiloto"] });
  }

  return (
    <div className="space-y-4">
      {(data ?? []).map((r) => (
        <RegraCard
          key={r.chave}
          chave={r.chave}
          valorInicial={r.valor}
          ajuda={r.descricao_ajuda}
          onSalvar={salvar}
        />
      ))}
    </div>
  );
}

function RegraCard({
  chave,
  valorInicial,
  ajuda,
  onSalvar,
}: {
  chave: string;
  valorInicial: string;
  ajuda: string;
  onSalvar: (chave: string, valor: string) => void;
}) {
  const [valor, setValor] = useState(valorInicial);
  useEffect(() => setValor(valorInicial), [valorInicial]);
  return (
    <div className="card-cx space-y-3 p-5">
      <div>
        <Label className="text-primary">{chave}</Label>
        <p className="text-xs text-muted-foreground">{ajuda}</p>
      </div>
      <Textarea rows={7} value={valor} onChange={(e) => setValor(e.target.value)} />
      <Button onClick={() => onSalvar(chave, valor)}>Salvar</Button>
    </div>
  );
}

function Config() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["config_api"],
    queryFn: async () => (await supabase.from("config_api").select("*").order("chave")).data,
  });

  async function salvar(chave: string, valor: string) {
    const { error } = await supabase.from("config_api").update({ valor }).eq("chave", chave);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success("Configuração salva.");
    qc.invalidateQueries({ queryKey: ["config_api"] });
  }

  return (
    <div className="space-y-4">
      <div className="card-cx space-y-4 p-5">
        {(data ?? []).map((c) => (
          <ConfigLinha key={c.chave} chave={c.chave} valorInicial={c.valor} onSalvar={salvar} />
        ))}
      </div>
      <div className="card-cx p-5 text-sm">
        <h2 className="mb-2 text-sm uppercase tracking-widest text-muted-foreground">
          Chaves de acesso
        </h2>
        <p className="text-muted-foreground">
          As chaves da Anthropic e da Deepgram ficam guardadas em um cofre seguro do servidor. Elas
          nunca aparecem aqui nem no navegador. Se uma call falhar dizendo que a chave está
          faltando, avise a liderança para cadastrá-la.
        </p>
      </div>
    </div>
  );
}

function ConfigLinha({
  chave,
  valorInicial,
  onSalvar,
}: {
  chave: string;
  valorInicial: string;
  onSalvar: (chave: string, valor: string) => void;
}) {
  const [valor, setValor] = useState(valorInicial);
  useEffect(() => setValor(valorInicial), [valorInicial]);
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 space-y-2">
        <Label>{chave}</Label>
        <Input value={valor} onChange={(e) => setValor(e.target.value)} />
      </div>
      <Button variant="secondary" onClick={() => onSalvar(chave, valor)}>
        Salvar
      </Button>
    </div>
  );
}

function Teste() {
  const chamarTeste = useServerFn(testarCerebro);
  const [ofertaId, setOfertaId] = useState("");
  const [texto, setTexto] = useState("Achei caro, preciso pensar melhor.");
  const [saida, setSaida] = useState("");
  const [rodando, setRodando] = useState(false);

  const { data: ofertas } = useQuery({
    queryKey: ["ofertas"],
    queryFn: async () => (await supabase.from("ofertas").select("id, nome").order("nome")).data,
  });

  async function rodar() {
    setRodando(true);
    try {
      const r = await chamarTeste({ data: { ofertaId: ofertaId || null, fala: texto } });
      setSaida(JSON.stringify(r.resposta, null, 2));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O teste falhou.");
    } finally {
      setRodando(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card-cx space-y-4 p-5">
        <div className="space-y-2">
          <Label>Oferta</Label>
          <select
            value={ofertaId}
            onChange={(e) => setOfertaId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-input px-3 text-sm"
          >
            <option value="">Sem oferta</option>
            {(ofertas ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Fala do cliente</Label>
          <Textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        <Button onClick={rodar} disabled={rodando}>
          {rodando ? "Testando…" : "Testar"}
        </Button>
      </div>
      <div className="card-cx p-5">
        <Label>Resposta do copiloto</Label>
        <pre className="mt-3 max-h-[60vh] overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
          {saida || "Rode o teste para ver a resposta."}
        </pre>
      </div>
    </div>
  );
}
