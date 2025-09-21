
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteInstallmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteType: 'single' | 'future') => void;
  transactionDescription: string;
}

export function DeleteInstallmentDialog({
  isOpen,
  onClose,
  onConfirm,
  transactionDescription
}: DeleteInstallmentDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Parcela</DialogTitle>
          <DialogDescription>
            A transação "{transactionDescription}" é uma parcela. O que você gostaria de fazer?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
          <Button
            variant="destructive"
            onClick={() => onConfirm('future')}
          >
            Excluir Esta e as Futuras
          </Button>
           <Button
            variant="outline"
            onClick={() => onConfirm('single')}
          >
            Excluir Somente Esta Parcela
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    