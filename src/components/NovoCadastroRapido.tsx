import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { criarCadastro, type TabelaCadastro } from "@/components/Cadastros";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Botão "+" ao lado de um select: cria o item na hora e já o seleciona. */
export function NovoCadastroRapido({
  tabela,
  titulo,
  onCriado,
}: {
  tabela: TabelaCadastro | "ofertas";
  titulo: string;
  onCriado: (item: { id: string; nome: string }) => void;
}) {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      const item = await criarCadastro(tabela, nome.trim());
      if (tabela === "ofertas") {
        qc.invalidateQueries({ queryKey: ["ofertas-ativas"] });
        qc.invalidateQueries({ queryKey: ["ofertas-todas"] });
      } else {
        qc.invalidateQueries({ queryKey: ["cadastro", tabela] });
      }
      onCriado(item);
      setNome("");
      setAberto(false);
    } catch {
      toast.error("Não foi possível cadastrar. Peça ao líder para criar este item.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Cadastrar ${titulo.toLowerCase()}`}
        onClick={() => setAberto(true)}
      >
        <Plus className="size-4" />
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar {titulo.toLowerCase()}</DialogTitle>
            <DialogDescription>
              O item é salvo no cadastro e já fica selecionado nesta call.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={nome}
            placeholder="Nome"
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                salvar();
              }
            }}
          />
          <DialogFooter>
            <Button type="button" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
