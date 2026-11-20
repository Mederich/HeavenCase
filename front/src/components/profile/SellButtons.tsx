import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/api";
import { formatCredits } from "@/lib/cases";
import {
  sellItem,
  type InventoryEntry,
  type SaleResult,
} from "@/lib/inventory";
import { ButtonGroup } from "../ui/button-group";

interface SellDialogProps {
  /** Skin à vendre ; null ferme la modale. */
  entry: InventoryEntry | null;
  onClose: () => void;
  onSold: (sale: SaleResult) => void;
}

export function SellButtons({ entry, onClose, onSold }: SellDialogProps) {
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    if (!entry) return;
    setPending(true);
    try {
      const sale = await sellItem(entry.id);
      toast.success(`${sale.item_name} vendu : +${formatCredits(sale.amount)}`);
      onSold(sale);
      onClose();
    } catch (err) {
      toastError(err, "Vente impossible.");
    } finally {
      setPending(false);
    }
  };

  return (
    entry && (
      <ButtonGroup>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Annuler
        </Button>
        <Button onClick={confirm} disabled={pending}>
          Vendre: {formatCredits(entry.value)}
        </Button>
      </ButtonGroup>
    )
  );
}
