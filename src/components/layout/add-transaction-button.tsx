
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddTransactionModal, type TransactionFormData } from '@/components/finances/add-transaction-modal';
import type { StoredCategory } from '@/firebase/services/firestoreService';
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { addTransaction, getCategories, addCategory, updateCategory, deleteCategory } from "@/firebase/services/firestoreService";


export function AddTransactionButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categories, setCategories] = useState<StoredCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  const fetchUserCategories = useCallback(async () => {
    if (!user) {
      setCategories([]);
      setLoadingCategories(false);
      return;
    }
    setLoadingCategories(true);
    try {
      const userCategories = await getCategories(user.uid);
      setCategories(userCategories);
    } catch (error) {
      console.error("Error fetching categories for FAB modal:", error);
      toast({ title: "Erro ao buscar categorias", variant: "destructive" });
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (isModalOpen) {
      fetchUserCategories();
    }
  }, [isModalOpen, fetchUserCategories]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleAddTransactionViaFab = async (data: TransactionFormData) => {
    if (!user) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      return;
    }
    
    try {
      await addTransaction(user.uid, data);
      const toastDescription = data.isInstallment
        ? "Sua compra parcelada foi registrada com sucesso."
        : data.isFixedIncome
        ? "Sua receita recorrente foi registrada com sucesso."
        : "Sua movimentação foi salva com sucesso.";
      toast({ title: "Movimentação Adicionada", description: toastDescription });
      
      window.dispatchEvent(new CustomEvent('transactionAddedByFab'));
      setIsModalOpen(false);
    } catch (error) {
      console.error("FAB - Error adding transaction:", error);
      toast({ title: "Erro ao Adicionar Movimentação", variant: "destructive" });
    }
  };

  // Category handlers to pass to the modal
  const handleAddCategory = async (newCategoryData: Omit<StoredCategory, 'id' | 'userId'>) => {
    if (!user) return;
    try {
      await addCategory(user.uid, newCategoryData);
      toast({ title: "Categoria Adicionada" });
      await fetchUserCategories();
    } catch (error) {
      toast({ title: "Erro ao adicionar categoria", variant: "destructive" });
    }
  };

  const handleUpdateCategory = async (updatedCategory: StoredCategory) => {
    if (!user) return;
    try {
      await updateCategory(user.uid, updatedCategory.id, { name: updatedCategory.name, color: updatedCategory.color });
      toast({ title: "Categoria Atualizada" });
      await fetchUserCategories();
    } catch (error) {
      toast({ title: "Erro ao atualizar categoria", variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user) return;
    try {
      await deleteCategory(user.uid, categoryId);
      toast({ title: "Categoria Excluída" });
      await fetchUserCategories();
    } catch (error) {
      toast({ title: "Erro ao excluir categoria", variant: "destructive" });
    }
  };
  
  if (!mounted) {
    return null;
  }

  return (
    <>
      <Button
        variant="default"
        className="fixed bottom-6 right-4 md:bottom-6 md:right-6 h-16 w-16 rounded-full shadow-lg bg-accent hover:bg-accent/90 text-accent-foreground print:hidden z-50 border-4 border-accent/80 shadow-accent/50 transition-all duration-200 hover:shadow-accent/80 active:translate-y-px"
        onClick={handleOpenModal}
        aria-label="Adicionar Nova Movimentação"
        disabled={!user}
      >
        <Plus className="h-8 w-8" />
      </Button>
      
      {isModalOpen && !loadingCategories && (
         <AddTransactionModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          categories={categories}
          onAddTransaction={handleAddTransactionViaFab}
          editingTransaction={null}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onRefreshCategories={fetchUserCategories}
        />
      )}
      {isModalOpen && loadingCategories && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center">
            <p className="text-white">Carregando categorias...</p>
        </div>
      )}
    </>
  );
}
