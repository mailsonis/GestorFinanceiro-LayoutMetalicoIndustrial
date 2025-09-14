
"use client";

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido."),
});

type ForgotPasswordFormInputs = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const { sendPasswordReset } = useAuth();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormInputs>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit: SubmitHandler<ForgotPasswordFormInputs> = async (data) => {
    try {
      await sendPasswordReset(data.email);
      toast({
        title: "Link Enviado!",
        description: "Se o seu email estiver cadastrado, você receberá um link para redefinir a senha.",
      });
      reset();
      onClose();
    } catch (error: any) {
      // Generic error handling in case the send email function fails
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o link de redefinição. Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };
  
  const handleDialogClose = () => {
    reset();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Redefinir Senha</DialogTitle>
          <DialogDescription>
            Digite seu email para receber um link de redefinição de senha.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="seu@email.com"
              {...register("email")}
              className={cn(errors.email && "border-destructive")}
              disabled={isSubmitting}
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <DialogFooter className="pt-4">
             <DialogClose asChild>
                <Button type="button" variant="outline" onClick={handleDialogClose} disabled={isSubmitting}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar Link de Redefinição"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
