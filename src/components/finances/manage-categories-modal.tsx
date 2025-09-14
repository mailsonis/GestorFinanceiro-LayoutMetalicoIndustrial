
"use client";

import { useState, useEffect, useRef } from 'react';
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
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, Edit, PlusCircle, Palette } from "lucide-react";
import { cn } from '@/lib/utils';
import type { StoredCategory } from '@/firebase/services/firestoreService';
import { useIsMobile } from '@/hooks/use-mobile';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

export type Category = StoredCategory;

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAddCategory: (category: Omit<Category, 'id' | 'userId'>) => Promise<void>;
  onUpdateCategory: (category: Category) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
}

const categoryFormSchema = z.object({
  name: z.string().min(1, "Nome da categoria é obrigatório.").max(50, "Nome da categoria muito longo."),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida. Use formato hexadecimal (ex: #RRGGBB).").default("#CCCCCC"),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

export function ManageCategoriesModal({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}: ManageCategoriesModalProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmittingInternal, setIsSubmittingInternal] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const categoryNameInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", color: "#CCCCCC" },
  });

  useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        setValue("name", editingCategory.name);
        setValue("color", editingCategory.color);
        setTimeout(() => categoryNameInputRef.current?.focus(), 0); 
      } else {
        reset({ name: "", color: "#CCCCCC" });
      }
    }
  }, [editingCategory, isOpen, setValue, reset, categoryNameInputRef]); 

  const onSubmit: SubmitHandler<CategoryFormData> = async (data) => {
    setIsSubmittingInternal(true);
    try {
      if (editingCategory) {
        await onUpdateCategory({ ...editingCategory, ...data });
      } else {
        await onAddCategory(data);
      }
      setEditingCategory(null);
      reset();
    } catch (error) {
      console.error("Error saving category:", error);
    } finally {
      setIsSubmittingInternal(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
  };

  const openDeleteDialog = (category: Category) => {
    setCategoryToDelete(category);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    
    setIsSubmittingInternal(true);
    try {
      await onDeleteCategory(categoryToDelete.id);
      if (editingCategory?.id === categoryToDelete.id) {
        setEditingCategory(null);
        reset();
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    } finally {
      setIsSubmittingInternal(false);
      setCategoryToDelete(null);
      setIsConfirmDialogOpen(false);
    }
  };


  const handleCancelEdit = () => {
    setEditingCategory(null);
    reset();
  };

  const handleDialogClose = () => {
    onClose();
    setEditingCategory(null);
    reset();
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { handleDialogClose(); } }}>
      <DialogContent 
        className="max-h-[90vh] flex flex-col p-0 sm:max-w-lg"
        showCloseButton={!isMobile}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0 md:pt-10">
          <DialogTitle className="text-2xl font-headline">Gerenciar Categorias</DialogTitle>
          <DialogDescription>
            Crie, edite ou exclua suas categorias de transação.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow min-h-0 overflow-y-auto p-6 space-y-6">
            {/* Add/Edit Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="category-name" className="text-md font-semibold text-foreground">
                  {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                </Label>
                
                <div className="space-y-1">
                  <Input
                    id="category-name"
                    ref={categoryNameInputRef} 
                    {...register("name")}
                    placeholder="Ex: Alimentação"
                    className={cn(errors.name && "border-destructive")}
                    disabled={isSubmittingInternal}
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>

                <div className="flex items-end gap-3 pt-1">
                  <div className="space-y-1">
                    <div className="relative w-10 h-10">
                      <Input
                        id="category-color"
                        type="color"
                        {...register("color")}
                        className={cn("w-full h-full p-0.5 appearance-none border rounded-md cursor-pointer", errors.color && "border-destructive")}
                        title="Selecionar cor"
                        disabled={isSubmittingInternal}
                      />
                      <Palette className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    </div>
                    {errors.color && <p className="text-xs text-destructive mt-1 w-20 truncate">{errors.color.message}</p>}
                  </div>
                  
                  {editingCategory ? (
                    <>
                      <Button type="submit" size="sm" disabled={isSubmittingInternal} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        {isSubmittingInternal ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit} disabled={isSubmittingInternal}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button type="submit" size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmittingInternal}>
                      <PlusCircle className="mr-2 h-4 w-4" /> {isSubmittingInternal ? "Adicionando..." : "Adicionar Categoria"}
                    </Button>
                  )}
                </div>
              </div>
            </form>

            {/* List of categories */}
            <div>
              <h3 className="text-md font-semibold font-headline pb-3">Categorias Existentes</h3>
              {categories.length === 0 ? (
                <div className="flex items-center justify-center rounded-md bg-muted/50 p-8 h-32">
                  <p className="text-sm text-center text-muted-foreground">Nenhuma categoria cadastrada ainda. <br /> Adicione uma nova categoria acima.</p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {categories.map((cat) => (
                    <li
                      key={cat.id}
                      className="flex items-center justify-between p-2.5 rounded-md border bg-card shadow-sm"
                      style={{ borderLeftWidth: '4px', borderLeftStyle: 'solid', borderLeftColor: cat.color }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate" title={cat.name}>{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(cat)} 
                          aria-label="Editar categoria" 
                          className="h-8 w-8" 
                          disabled={isSubmittingInternal}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openDeleteDialog(cat)} 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8" 
                          aria-label="Excluir categoria" 
                          disabled={isSubmittingInternal}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
        </div>
        
        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
          {isMobile && (
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={handleDialogClose} disabled={isSubmittingInternal} className="w-full">
                Fechar
              </Button>
            </DialogClose>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

     <DeleteConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir a categoria "${categoryToDelete?.name}"? Esta ação não pode ser desfeita e pode afetar transações existentes.`}
        isDeleting={isSubmittingInternal}
    />
    </>
  );
}
