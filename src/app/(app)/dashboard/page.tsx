
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { LayoutDashboard, LogOut, Moon, Settings, Sun, DollarSign, Shapes, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthNavigation } from '@/components/finances/month-navigation';
import { SummaryCardsContainer } from '@/components/finances/summary-cards';
import { AnnualSummaryChart } from '@/components/finances/annual-summary-chart';
import { CategoryExpensesPieChart } from '@/components/finances/category-expenses-pie-chart';
import { CategoryIncomePieChart } from '@/components/finances/category-income-pie-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  addTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  addCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  type StoredTransaction,
  type StoredCategory,
  deleteFutureInstallments,
} from '@/firebase/services/firestoreService';
import { TransactionList, type Transaction as DisplayTransaction } from '@/components/finances/transaction-list';
import { AddTransactionModal, type TransactionFormData } from '@/components/finances/add-transaction-modal';
import { ManageCategoriesModal } from '@/components/finances/manage-categories-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { DeleteInstallmentDialog } from '@/components/finances/delete-installment-dialog';


const mapStoredToDisplayTransaction = (st: StoredTransaction): DisplayTransaction => ({
  id: st.id,
  description: st.description,
  value: st.value,
  date: st.date, 
  type: st.type,
  categoryId: st.categoryId,
});


interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  currentBalance: number;
}

function AdminSettingsDropdownContent({
  currentSystemName,
  setCurrentSystemName,
  allowRegistrations,
  setAllowRegistrations,
  contactWhatsapp,
  setContactWhatsapp,
  handleSaveChangesAdminSettings,
}: {
  currentSystemName: string;
  setCurrentSystemName: (value: string) => void;
  allowRegistrations: boolean;
  setAllowRegistrations: (value: boolean) => void;
  contactWhatsapp: string;
  setContactWhatsapp: (value: string) => void;
  handleSaveChangesAdminSettings: () => void;
}) {
  return (
    <DropdownMenuContent align="end" className="w-64">
      <DropdownMenuLabel>Configurações de Admin</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <div className="px-2 py-2 space-y-2">
        <div className="space-y-1">
          <Label htmlFor="dashboard-admin-system-name" className="text-sm font-normal">Nome do App</Label>
          <Input 
            id="dashboard-admin-system-name" 
            value={currentSystemName} 
            onChange={(e) => setCurrentSystemName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dashboard-admin-whatsapp" className="text-sm font-normal">Nº de Contato (Whatsapp)</Label>
          <Input 
            id="dashboard-admin-whatsapp" 
            value={contactWhatsapp} 
            onChange={(e) => setContactWhatsapp(e.target.value)}
            placeholder="Ex: 5584999999999"
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <Label htmlFor="dashboard-admin-reg-toggle" className="text-sm font-normal">Permitir Novos Cadastros</Label>
          <Switch 
            id="dashboard-admin-reg-toggle" 
            checked={allowRegistrations} 
            onCheckedChange={setAllowRegistrations}
            className="dark:border-white/30"
          />
        </div>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Button onClick={handleSaveChangesAdminSettings} className="w-full">Salvar Configurações</Button>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

export default function DashboardPage() {
  const { user, signOut, appSettings, isAdmin, updateAppSettings: updateAuthAppSettings } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme(); 
  
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  
  const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
  const [categories, setCategories] = useState<StoredCategory[]>([]);
  const [summaryData, setSummaryData] = useState<DashboardData | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const [currentSystemName, setCurrentSystemName] = useState(appSettings.systemName);
  const [allowRegistrations, setAllowRegistrations] = useState(appSettings.allowNewRegistrations);
  const [contactWhatsapp, setContactWhatsapp] = useState(appSettings.contactWhatsapp);

  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<DisplayTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<DisplayTransaction | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isTransactionListVisible, setIsTransactionListVisible] = useState(true);
  const [isInstallmentDeleteModalOpen, setIsInstallmentDeleteModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (appSettings) {
      setCurrentSystemName(appSettings.systemName);
      setAllowRegistrations(appSettings.allowNewRegistrations);
      setContactWhatsapp(appSettings.contactWhatsapp);
    }
  }, [appSettings]);
  
  const fetchDashboardData = useCallback(async (month: string, yearNum: number, day: Date | null) => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [fetchedTransactions, fetchedCategories] = await Promise.all([
        getTransactions(user.uid, month, yearNum, undefined, day),
        getCategories(user.uid)
      ]);

      setTransactions(fetchedTransactions.map(mapStoredToDisplayTransaction));
      setCategories(fetchedCategories);

      // Summary should still reflect the whole month, not just the day
      if (!day) {
        let totalIncome = 0;
        let totalExpenses = 0;
        fetchedTransactions.forEach(t => {
          if (t.type === 'income') totalIncome += t.value;
          else totalExpenses += t.value;
        });
        const currentBalance = totalIncome - totalExpenses;
        setSummaryData({ totalIncome, totalExpenses, currentBalance });
      } else {
        // When a day is selected, fetch the monthly data for the summary cards
         const monthlyTransactions = await getTransactions(user.uid, month, yearNum, undefined, null);
         let totalIncome = 0;
         let totalExpenses = 0;
         monthlyTransactions.forEach(t => {
           if (t.type === 'income') totalIncome += t.value;
           else totalExpenses += t.value;
         });
         const currentBalance = totalIncome - totalExpenses;
         setSummaryData({ totalIncome, totalExpenses, currentBalance });
      }

    } catch (error) {
      console.error(`Error fetching dashboard data for ${month}/${yearNum}:`, error);
      toast({ title: "Erro ao buscar dados do dashboard", variant: "destructive" });
      setSummaryData({ totalIncome: 0, totalExpenses: 0, currentBalance: 0 });
      setTransactions([]);
      setCategories([]);
    } finally {
      setLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && mounted && selectedMonth && selectedYear) {
      fetchDashboardData(selectedMonth, selectedYear, selectedDay);
    }
  }, [user, mounted, selectedMonth, selectedYear, selectedDay, fetchDashboardData]);

  const handleMonthChange = (month: string, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setSelectedDay(null); // Clear day filter when month changes
  };

  const handleDayChange = (day: Date) => {
    setSelectedDay(day);
  };
  
  const clearDayFilter = () => {
    setSelectedDay(null);
  };
  
  const [initialMonthSet, setInitialMonthSet] = useState(false);
  useEffect(() => {
    if(!initialMonthSet && mounted) {
      const currentDate = new Date();
      const currentMonthName = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][currentDate.getMonth()];
      setSelectedMonth(currentMonthName);
      setSelectedYear(currentDate.getFullYear());
      setInitialMonthSet(true);
    }
  }, [initialMonthSet, mounted]);

  useEffect(() => {
    const handleFabTransactionAdded = () => {
      if (user && selectedMonth && selectedYear) {
        fetchDashboardData(selectedMonth, selectedYear, selectedDay);
      }
    };
    window.addEventListener('transactionAddedByFab', handleFabTransactionAdded);
    return () => {
      window.removeEventListener('transactionAddedByFab', handleFabTransactionAdded);
    };
  }, [user, selectedMonth, selectedYear, selectedDay, fetchDashboardData]);

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  const handleSaveChangesAdminSettings = async () => {
    try {
      await updateAuthAppSettings({
        systemName: currentSystemName,
        allowNewRegistrations: allowRegistrations,
        contactWhatsapp: contactWhatsapp,
      });
      toast({ title: "Configurações Salvas", description: "As configurações de administrador foram atualizadas." });
    } catch (error) {
      console.error("Error saving admin settings:", error);
      toast({ title: "Erro ao Salvar", description: "Não foi possível salvar as configurações.", variant: "destructive" });
    }
  };

  const handleManageCategories = () => setIsCategoriesModalOpen(true);

  const handleAddCategory = async (newCategoryData: Omit<StoredCategory, 'id'|'userId'>) => {
    if (!user) return;
    try {
      await addCategory(user.uid, newCategoryData);
      const updatedCategories = await getCategories(user.uid);
      setCategories(updatedCategories);
      toast({ title: "Categoria Adicionada", description: `${newCategoryData.name} foi adicionada com sucesso.` });
    } catch (error) {
      console.error("Error adding category:", error);
      toast({ title: "Erro ao Adicionar Categoria", variant: "destructive" });
    }
  };

  const handleUpdateCategory = async (updatedCategoryData: StoredCategory) => {
    if (!user) return;
    try {
      await updateCategory(user.uid, updatedCategoryData.id, { name: updatedCategoryData.name, color: updatedCategoryData.color });
      const updatedCategories = await getCategories(user.uid);
      setCategories(updatedCategories);
      toast({ title: "Categoria Atualizada", description: `${updatedCategoryData.name} foi atualizada.` });
    } catch (error) {
      console.error("Error updating category:", error);
      toast({ title: "Erro ao Atualizar Categoria", variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user) return;
    try {
      await deleteCategory(user.uid, categoryId);
      const updatedCategories = await getCategories(user.uid);
      setCategories(updatedCategories);
      if (selectedMonth && selectedYear) {
        await fetchDashboardData(selectedMonth, selectedYear, selectedDay);
      }
      toast({ title: "Categoria Excluída" });
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({ title: "Erro ao Excluir Categoria", variant: "destructive" });
    }
  };
  
  const handleAddTransaction = async (data: TransactionFormData) => {
    if (!user) return;
    try {
      await addTransaction(user.uid, data);
      if (selectedMonth && selectedYear) {
        await fetchDashboardData(selectedMonth, selectedYear, selectedDay);
      }
      setIsAddTransactionModalOpen(false);
      const toastDescription = data.isInstallment
        ? `Sua compra parcelada foi registrada.`
        : data.isFixedIncome
        ? `Sua receita recorrente foi registrada.`
        : `${data.description} adicionada com sucesso.`;
      toast({ title: "Movimentação Adicionada", description: toastDescription });
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast({ title: "Erro ao Adicionar Movimentação", variant: "destructive" });
    }
  };

  const handleOpenEditModal = (transaction: DisplayTransaction) => {
    setEditingTransaction(transaction);
    setIsAddTransactionModalOpen(true);
  };
  
  const handleUpdateTransaction = async (id: string, data: TransactionFormData) => {
    if (!user) return;
    try {
      await updateTransaction(user.uid, id, data);
      if (selectedMonth && selectedYear) {
        await fetchDashboardData(selectedMonth, selectedYear, selectedDay);
      }
      setEditingTransaction(null);
      setIsAddTransactionModalOpen(false);
      toast({ title: "Movimentação Atualizada" });
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast({ title: "Erro ao Atualizar Movimentação", variant: "destructive" });
    }
  };

  const handleOpenDeleteConfirm = (transaction: DisplayTransaction) => {
    setTransactionToDelete(transaction);
    const isInstallment = /\(\d+\/\d+\)$/.test(transaction.description);

    if (isInstallment) {
      setIsInstallmentDeleteModalOpen(true);
    } else {
      setIsDeleteConfirmOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!user || !transactionToDelete) return;
    try {
      await deleteTransaction(user.uid, transactionToDelete.id);
      if (selectedMonth && selectedYear) {
        await fetchDashboardData(selectedMonth, selectedYear, selectedDay);
      }
      toast({ title: "Movimentação Excluída" });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({ title: "Erro ao Excluir Movimentação", variant: "destructive" });
    } finally {
      setTransactionToDelete(null);
      setIsDeleteConfirmOpen(false);
    }
  };

  const handleConfirmDeleteInstallments = async (deleteType: 'single' | 'future') => {
    if (!user || !transactionToDelete) return;

    try {
        if (deleteType === 'single') {
            await deleteTransaction(user.uid, transactionToDelete.id);
            toast({ title: "Parcela Excluída" });
        } else {
            await deleteFutureInstallments(user.uid, transactionToDelete);
            toast({ title: "Parcelas futuras excluídas com sucesso" });
        }
        if (selectedMonth && selectedYear) {
            await fetchDashboardData(selectedMonth, selectedYear, selectedDay);
        }
    } catch (error) {
        console.error("Error deleting installment transaction:", error);
        toast({ title: "Erro ao Excluir Parcela(s)", variant: "destructive" });
    } finally {
        setTransactionToDelete(null);
        setIsInstallmentDeleteModalOpen(false);
    }
};

  const handleCancelDelete = () => {
    setTransactionToDelete(null);
    setIsDeleteConfirmOpen(false);
    setIsInstallmentDeleteModalOpen(false);
  };

  const manageCategoriesButtonMobile = (
    <Button 
      variant="outline"
      size="sm"
      onClick={handleManageCategories} 
      className="h-12 px-3 whitespace-nowrap shadow-md border-primary flex-grow"
      aria-label="Gerenciar Categorias"
      disabled={loadingData}
    >
      <Shapes className="h-5 w-5 mr-1.5 flex-shrink-0" />
      Categorias
    </Button>
  );

  return (
    <>
    <div className="container mx-auto space-y-6">
      
      {/* Mobile Month Navigation - Moved to top for mobile */}
      <div className="md:hidden">
        <MonthNavigation 
            onMonthChange={handleMonthChange}
            onDayChange={handleDayChange}
            currentSelectedMonth={selectedMonth}
            currentSelectedYear={selectedYear}
            currentSelectedDay={selectedDay}
            centerMobileContent={manageCategoriesButtonMobile}
            showMobileGlobalControls={true} 
        />
      </div>

      {/* Desktop Page Title and Controls */}
      <div className="hidden md:flex md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline text-foreground dark:text-foreground md:text-left">Dashboard</h1>
        <div className="flex items-center gap-2">
            <MonthNavigation 
              onMonthChange={handleMonthChange} 
              onDayChange={handleDayChange}
              currentSelectedMonth={selectedMonth}
              currentSelectedYear={selectedYear}
              currentSelectedDay={selectedDay}
              showMobileGlobalControls={false}
            />
            {mounted && (
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                aria-label={resolvedTheme === 'dark' ? "Ativar modo claro" : "Ativar modo escuro"}
                className="h-9 w-9 shadow-md border-primary"
              >
                {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}
            {isAdmin && mounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Configurações do sistema" className="h-9 w-9 shadow-md border-primary">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <AdminSettingsDropdownContent
                  currentSystemName={currentSystemName}
                  setCurrentSystemName={setCurrentSystemName}
                  allowRegistrations={allowRegistrations}
                  setAllowRegistrations={setAllowRegistrations}
                  contactWhatsapp={contactWhatsapp}
                  setContactWhatsapp={setContactWhatsapp}
                  handleSaveChangesAdminSettings={handleSaveChangesAdminSettings}
                />
              </DropdownMenu>
            )}
            {user && (
            <Button variant="outline" size="icon" onClick={signOut} className="h-9 w-9 shadow-md border-primary text-muted-foreground hover:text-destructive hover:bg-destructive/10" aria-label="Sair">
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="mb-6">
        {loadingData || !summaryData ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-[125px] w-full rounded-lg" />
            <Skeleton className="h-[125px] w-full rounded-lg" />
            <Skeleton className="h-[125px] w-full rounded-lg" />
          </div>
        ) : (
          <SummaryCardsContainer 
            totalIncome={summaryData.totalIncome}
            totalExpenses={summaryData.totalExpenses}
            currentBalance={summaryData.currentBalance}
          />
        )}
      </div>

      {/* Transaction List and Category Management */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                 <h2 className="text-xl md:text-3xl font-headline text-foreground dark:text-foreground">
                  {selectedDay 
                    ? `Movimentações de ${format(selectedDay, "dd/MM/yyyy", { locale: ptBR })}` 
                    : "Movimentações do Mês"}
                </h2>
                 {selectedDay && (
                  <Button variant="ghost" size="icon" onClick={clearDayFilter} className="h-8 w-8" aria-label="Limpar filtro de dia">
                    <X className="h-5 w-5 text-destructive" />
                  </Button>
                 )}
                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsTransactionListVisible(!isTransactionListVisible)}
                    aria-label={isTransactionListVisible ? "Ocultar movimentações" : "Mostrar movimentações"}
                    className="h-8 w-8"
                >
                    <ChevronDown className={cn("h-5 w-5 transition-transform", isTransactionListVisible && "rotate-180")} />
                </Button>
            </div>
             <Button 
                variant="outline" 
                className="shadow-md rounded-lg hidden md:flex border-primary" 
                onClick={handleManageCategories}
                disabled={loadingData}
            >
                <Shapes className="mr-2 h-4 w-4" />
                Gerenciar Categorias
            </Button>
        </div>
         {isTransactionListVisible && (loadingData ? (
             <Skeleton className="h-64 w-full rounded-lg" />
         ) : (
             <TransactionList
                transactions={transactions}
                categories={categories}
                onEdit={handleOpenEditModal}
                onDelete={handleOpenDeleteConfirm}
                isPrinting={false}
            />
         ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {selectedMonth && selectedYear && user?.uid && (
          <CategoryIncomePieChart
            userId={user.uid}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        )}
        {selectedMonth && selectedYear && user?.uid && (
          <CategoryExpensesPieChart 
            userId={user.uid} 
            selectedMonth={selectedMonth} 
            selectedYear={selectedYear} 
          />
        )}
      </div>
      <div className="mb-6">
        <AnnualSummaryChart userId={user?.uid} />
      </div>

    </div>

    {/* Modals */}
    {(isAddTransactionModalOpen || editingTransaction) && (
      <AddTransactionModal
        isOpen={isAddTransactionModalOpen}
        onClose={() => {
          setIsAddTransactionModalOpen(false);
          setEditingTransaction(null); 
        }}
        categories={categories}
        onAddTransaction={handleAddTransaction}
        editingTransaction={editingTransaction}
        onUpdateTransaction={handleUpdateTransaction}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
        onRefreshCategories={async () => { 
            if(user) {
              const updatedCategories = await getCategories(user.uid);
              setCategories(updatedCategories);
            }
        }}
      />
    )}

    {isCategoriesModalOpen && (
      <ManageCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
      />
    )}

    <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir esta movimentação? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelDelete}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    
    <DeleteInstallmentDialog
        isOpen={isInstallmentDeleteModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDeleteInstallments}
        transactionDescription={transactionToDelete?.description ?? ''}
    />
    </>
  );
}

    
