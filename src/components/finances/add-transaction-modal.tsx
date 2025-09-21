
"use client";

import { useState, useEffect, type ReactNode } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from 'date-fns/locale/pt-BR';
import type { StoredCategory } from '@/firebase/services/firestoreService';
import type { Transaction as DisplayTransaction } from './transaction-list';
import { ManageCategoriesModal } from './manage-categories-modal'; // Import category management modal

const transactionFormSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória.").max(100, "Descrição muito longa."),
  value: z.coerce.number().positive("Valor deve ser um número positivo."),
  type: z.enum(['income', 'expense'], { required_error: "Tipo é obrigatório." }),
  categoryId: z.string().min(1, "Categoria é obrigatória."),
  date: z.date({ required_error: "Data é obrigatória." }),
  isInstallment: z.boolean().optional(),
  installments: z.coerce.number().int().min(2, "Mínimo de 2 parcelas.").optional(),
  isFixedIncome: z.boolean().optional(),
  fixedIncomeMonths: z.coerce.number().int().min(2, "Mínimo de 2 meses.").optional(),
}).superRefine((data, ctx) => {
  if (data.isInstallment && (data.installments === undefined || data.installments < 2)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Número de parcelas é obrigatório (mínimo de 2).",
      path: ["installments"],
    });
  }
  if (data.isFixedIncome && (data.fixedIncomeMonths === undefined || data.fixedIncomeMonths < 2)) {
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Número de meses é obrigatório (mínimo de 2).",
      path: ["fixedIncomeMonths"],
    });
  }
});


export type TransactionFormData = z.infer<typeof transactionFormSchema>;

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: StoredCategory[];
  onAddTransaction: (data: TransactionFormData) => Promise<void>;
  editingTransaction?: DisplayTransaction | null;
  onUpdateTransaction?: (id: string, data: TransactionFormData) => Promise<void>;
  onAddCategory: (category: Omit<StoredCategory, 'id' | 'userId'>) => Promise<void>;
  onUpdateCategory: (category: StoredCategory) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onRefreshCategories: () => Promise<void>; 
}

const ADD_NEW_CATEGORY_VALUE = 'add-new-category';

export function AddTransactionModal({
  isOpen,
  onClose,
  categories,
  onAddTransaction,
  editingTransaction,
  onUpdateTransaction,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onRefreshCategories,
}: AddTransactionModalProps) {
  const [isSubmittingInternal, setIsSubmittingInternal] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      description: '',
      value: undefined,
      type: 'expense',
      categoryId: '',
      date: new Date(),
      isInstallment: false,
      installments: undefined,
      isFixedIncome: false,
      fixedIncomeMonths: undefined,
    },
  });

  const isInstallment = watch("isInstallment");
  const isFixedIncome = watch("isFixedIncome");
  const transactionType = watch("type");

  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        setValue("description", editingTransaction.description);
        setValue("value", editingTransaction.value);
        setValue("type", editingTransaction.type);
        setValue("categoryId", editingTransaction.categoryId);
        setValue("date", editingTransaction.date ? parseISO(editingTransaction.date) : new Date());
        setValue("isInstallment", false); 
        setValue("isFixedIncome", false);
      } else {
        reset({
          description: '',
          value: undefined,
          type: 'expense',
          categoryId: '',
          date: new Date(),
          isInstallment: false,
          installments: undefined,
          isFixedIncome: false,
          fixedIncomeMonths: undefined,
        });
      }
    }
  }, [isOpen, editingTransaction, reset, setValue]);

  const onSubmit: SubmitHandler<TransactionFormData> = async (data) => {
    setIsSubmittingInternal(true);
    try {
      if (editingTransaction && onUpdateTransaction) {
        await onUpdateTransaction(editingTransaction.id, data);
      } else {
        await onAddTransaction(data);
      }
      reset(); 
      onClose(); 
    } catch (error) {
      console.error("Error saving transaction:", error);
    } finally {
      setIsSubmittingInternal(false);
    }
  };

  const handleDialogClose = () => {
    if (!isSubmittingInternal) {
        reset({
          description: '',
          value: undefined,
          type: 'expense',
          categoryId: '',
          date: new Date(),
          isInstallment: false,
          installments: undefined,
          isFixedIncome: false,
          fixedIncomeMonths: undefined,
        });
    }
    onClose();
  }
  
  const handleCategoryChange = (value: string) => {
    if (value === ADD_NEW_CATEGORY_VALUE) {
      setIsCategoriesModalOpen(true);
      setValue('categoryId', '');
    } else {
      setValue('categoryId', value);
    }
  }

  const handleCategoriesModalClose = async () => {
    setIsCategoriesModalOpen(false);
    await onRefreshCategories(); // Refresh the category list in the parent
  };


  const modalTitle = editingTransaction ? "Editar Movimentação" : "Adicionar Nova Movimentação";
  const buttonText = editingTransaction ? "Salvar Alterações" : "Adicionar Movimentação";

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{modalTitle}</DialogTitle>
          <DialogDescription>
            {editingTransaction ? "Atualize os detalhes da sua movimentação." : "Preencha os detalhes da sua movimentação abaixo."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              {...register("description")}
              placeholder="Ex: Compras no supermercado"
              className={cn(errors.description && "border-destructive")}
              disabled={isSubmittingInternal}
            />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div>
             <Label htmlFor="value">{isInstallment ? "Valor da Parcela (R$)" : isFixedIncome ? "Valor Mensal (R$)" : "Valor (R$)"}</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              {...register("value")}
              placeholder="0.00"
              className={cn(errors.value && "border-destructive")}
              disabled={isSubmittingInternal}
            />
            {errors.value && <p className="text-xs text-destructive mt-1">{errors.value.message}</p>}
          </div>

          <div>
            <Label>Tipo de Movimentação</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value} 
                  defaultValue={field.value}
                  className="flex space-x-4 mt-1"
                  disabled={isSubmittingInternal}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="income" id="income" disabled={isSubmittingInternal} />
                    <Label htmlFor="income" className="font-normal cursor-pointer">Receita</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expense" id="expense" disabled={isSubmittingInternal} />
                    <Label htmlFor="expense" className="font-normal cursor-pointer">Despesa</Label>
                  </div>
                </RadioGroup>
              )}
            />
            {errors.type && <p className="text-xs text-destructive mt-1">{errors.type.message}</p>}
          </div>
          
           {transactionType === 'expense' && (
              <div className="items-top flex space-x-2 pt-2">
                <Controller
                  name="isInstallment"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="isInstallment"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmittingInternal || !!editingTransaction}
                    />
                  )}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="isInstallment"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    É uma compra parcelada?
                  </label>
                  <p className="text-xs text-muted-foreground">
                    As parcelas serão criadas nos meses seguintes.
                  </p>
                </div>
              </div>
            )}

          {isInstallment && (
            <div>
              <Label htmlFor="installments">Número de Parcelas</Label>
              <Input
                id="installments"
                type="number"
                {...register("installments")}
                placeholder="Ex: 12"
                className={cn(errors.installments && "border-destructive")}
                disabled={isSubmittingInternal}
              />
              {errors.installments && <p className="text-xs text-destructive mt-1">{errors.installments.message}</p>}
            </div>
          )}

           {transactionType === 'income' && (
            <div className="items-top flex space-x-2 pt-2">
              <Controller
                name="isFixedIncome"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="isFixedIncome"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmittingInternal || !!editingTransaction}
                  />
                )}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="isFixedIncome"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  É uma receita fixa mensal?
                </label>
                <p className="text-xs text-muted-foreground">
                  A receita será repetida para os próximos meses.
                </p>
              </div>
            </div>
          )}

          {isFixedIncome && (
            <div>
              <Label htmlFor="fixedIncomeMonths">Repetir por quantos meses?</Label>
              <Input
                id="fixedIncomeMonths"
                type="number"
                {...register("fixedIncomeMonths")}
                placeholder="Ex: 12"
                className={cn(errors.fixedIncomeMonths && "border-destructive")}
                disabled={isSubmittingInternal}
              />
              {errors.fixedIncomeMonths && <p className="text-xs text-destructive mt-1">{errors.fixedIncomeMonths.message}</p>}
            </div>
          )}


          <div>
            <Label htmlFor="category">Categoria</Label>
             <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={handleCategoryChange} value={field.value} disabled={isSubmittingInternal}>
                  <SelectTrigger id="category" className={cn(errors.categoryId && "border-destructive")}>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-cat" disabled>Nenhuma categoria disponível</SelectItem>
                    )}
                    <SelectSeparator />
                    <SelectItem value={ADD_NEW_CATEGORY_VALUE} className="text-primary hover:bg-primary/10 focus:bg-primary/10">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" />
                        <span>Criar nova categoria...</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && <p className="text-xs text-destructive mt-1">{errors.categoryId.message}</p>}
          </div>
          
          <div>
            <Label htmlFor="date-picker-button">{isInstallment ? "Data da 1ª Parcela" : isFixedIncome ? "Data da 1ª Receita" : "Data"}</Label>
             <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-picker-button"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                        errors.date && "border-destructive"
                      )}
                      disabled={isSubmittingInternal}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value && field.value instanceof Date ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value instanceof Date ? field.value : undefined}
                      onSelect={(date) => { if (date) field.onChange(date); }}
                      initialFocus
                      locale={ptBR}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
          </div>

          <DialogFooter className="pt-4">
             <DialogClose asChild>
                <Button type="button" variant="outline" onClick={handleDialogClose} disabled={isSubmittingInternal} className="mt-2 sm:mt-0">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmittingInternal} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSubmittingInternal ? (editingTransaction ? "Salvando..." : "Adicionando...") : buttonText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {isCategoriesModalOpen && (
        <ManageCategoriesModal
          isOpen={isCategoriesModalOpen}
          onClose={handleCategoriesModalClose}
          categories={categories}
          onAddCategory={onAddCategory}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
        />
      )}
    </>
  );
}
