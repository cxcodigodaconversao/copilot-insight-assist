import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  callId: string;
  nomeLead?: string | null;
  rotulo?: string;
  comTexto?: boolean;
  onExcluida?: () => void;
};

/** Botão de excluir uma call/ligação — visível apenas para o administrador. */
export function ExcluirCall({ callId, nomeLead, rotulo = "registro", comTexto, onExcluida }: Props) {
  const { ehAdm } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  if (!ehAdm) return null;

  async function excluir() {
    setExcluindo(true);
    const { error } = await supabase.from("calls").delete().eq("id", callId);
    setExcluindo(false);
    if (error) {
      toast.error(`Não foi possível excluir: ${error.message}`);
      return;
    }
    setAberto(false);
    toast.success("Registro excluído.");
    onExcluida?.();
  }

  return (
    <>
      <Button
        variant="ghost"
        size={comTexto ? "default" : "icon"}
        aria-label="Excluir"
        title="Excluir"
        className="text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAberto(true);
        }}
      >
        <Trash2 className="size-4" />
        {comTexto && "Excluir"}
      </Button>

      <AlertDialog open={aberto} onOpenChange={setAberto}>
        <AlertDialogContent
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {rotulo}?</AlertDialogTitle>
            <AlertDialogDescription>
              {nomeLead ? `Lead: ${nomeLead}. ` : ""}A transcrição e as análises deste registro
              também serão apagadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={excluindo}
              onClick={(e) => {
                e.preventDefault();
                void excluir();
              }}
            >
              {excluindo ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
