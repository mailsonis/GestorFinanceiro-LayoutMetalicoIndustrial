
"use client";

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Moon, Settings, Sun, LogOut, ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react'; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '../ui/calendar';
import { ptBR } from 'date-fns/locale/pt-BR';
import { addMonths, subMonths, startOfMonth } from 'date-fns';


const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface MonthNavigationProps {
  onMonthChange: (month: string, year: number) => void;
  currentSelectedMonth?: string;
  currentSelectedYear?: number;
  centerMobileContent?: ReactNode; 
  showMobileGlobalControls?: boolean; // Controls visibility of theme/admin/logout on mobile
}

export function MonthNavigation({ 
  onMonthChange, 
  currentSelectedMonth,
  currentSelectedYear,
  centerMobileContent,
  showMobileGlobalControls = true, 
}: MonthNavigationProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user, signOut, isAdmin, appSettings, updateAppSettings: updateAuthAppSettings } = useAuth();
  const { toast } = useToast();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [currentSystemName, setCurrentSystemName] = useState(appSettings.systemName);
  const [allowRegistrations, setAllowRegistrations] = useState(appSettings.allowNewRegistrations);
  const [contactWhatsapp, setContactWhatsapp] = useState(appSettings.contactWhatsapp);

  useEffect(() => {
    if (appSettings) {
      setCurrentSystemName(appSettings.systemName);
      setAllowRegistrations(appSettings.allowNewRegistrations);
      setContactWhatsapp(appSettings.contactWhatsapp);
    }
  }, [appSettings]);

  const handleSaveChangesAdminSettingsMobile = async () => {
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

  useEffect(() => {
    setMounted(true);
    const initialDate = (currentSelectedMonth && currentSelectedYear)
      ? new Date(currentSelectedYear, months.indexOf(currentSelectedMonth))
      : new Date();
    setSelectedDate(initialDate);
  }, []); 

  useEffect(() => {
    if(currentSelectedMonth && currentSelectedYear) {
      const newDate = new Date(currentSelectedYear, months.indexOf(currentSelectedMonth));
      if(newDate.getTime() !== selectedDate.getTime()){
        setSelectedDate(newDate);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSelectedMonth, currentSelectedYear]);

  useEffect(() => {
    if (mounted) {
      const monthName = months[selectedDate.getMonth()];
      const year = selectedDate.getFullYear();
      onMonthChange(monthName, year);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, mounted]); 


  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };
  
  const handleDateSelect = (date: Date | undefined) => {
    if(date){
      setSelectedDate(startOfMonth(date)); // Always set to the start of the month
      setIsCalendarOpen(false); // Close popover on selection
    }
  };
   
  const handleMonthSelect = (date: Date) => {
    setSelectedDate(startOfMonth(date)); // Also ensure month change sets to the start
  };
  
  const handlePreviousMonth = () => {
    setSelectedDate(prev => subMonths(prev, 1));
  };
  
  const handleNextMonth = () => {
    setSelectedDate(prev => addMonths(prev, 1));
  };
  
  const adminSettingsDropdownContentMobile = () => (
    <DropdownMenuContent align="end" className="w-64">
      <DropdownMenuLabel>Configurações Admin</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <div className="px-2 py-2 space-y-2">
        <div className="space-y-1">
          <Label htmlFor="monthnav-admin-system-name-mobile" className="text-sm font-normal">Nome do App</Label>
          <Input 
            id="monthnav-admin-system-name-mobile" 
            value={currentSystemName} 
            onChange={(e) => setCurrentSystemName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="monthnav-admin-whatsapp-mobile" className="text-sm font-normal">Nº de Contato (Whatsapp)</Label>
          <Input 
            id="monthnav-admin-whatsapp-mobile" 
            value={contactWhatsapp} 
            onChange={(e) => setContactWhatsapp(e.target.value)}
            placeholder="Ex: 5584999999999"
          />
        </div>
        <div className="flex items-center justify-between pt-1">
          <Label htmlFor="monthnav-admin-reg-toggle-mobile" className="text-sm font-normal">Permitir Novos Cadastros</Label>
          <Switch 
            id="monthnav-admin-reg-toggle-mobile" 
            checked={allowRegistrations} 
            onCheckedChange={setAllowRegistrations}
          />
        </div>
      </div>
       <DropdownMenuSeparator />
       <DropdownMenuItem asChild>
         <Button onClick={handleSaveChangesAdminSettingsMobile} className="w-full">Salvar Configurações</Button>
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const mobileGlobalControlsGroup = (
    <div className="flex items-center gap-1 flex-shrink-0">
       {mounted && (
         <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label={resolvedTheme === 'dark' ? "Ativar modo claro" : "Ativar modo escuro"}
            className="h-12 w-12 shadow-md border-primary"
          >
            {resolvedTheme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </Button>
        )}
      {isAdmin && mounted && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Configurações do sistema" className="h-12 w-12 shadow-md border-primary">
              <Settings className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          {adminSettingsDropdownContentMobile()}
        </DropdownMenu>
      )}
      {user && mounted && (
        <Button
          variant="outline"
          size="icon"
          onClick={signOut}
          aria-label="Sair"
          className="h-12 w-12 shadow-md border-primary"
        >
          <LogOut className="h-6 w-6" />
        </Button>
      )}
    </div>
  );

  const desktopMonthNavigationControls = (
    <div className={cn(
        "flex items-center justify-center rounded-md border border-primary shadow-md h-9"
    )}>
        <Button variant="ghost" size="icon" onClick={handlePreviousMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Mês anterior</span>
        </Button>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="font-semibold text-center text-foreground truncate min-w-[140px] text-sm h-8"
            >
              {months[selectedDate.getMonth()]} de {selectedDate.getFullYear()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              locale={ptBR}
              selected={selectedDate}
              onSelect={handleDateSelect}
              defaultMonth={selectedDate}
              onMonthChange={handleMonthSelect} 
              initialFocus
              captionLayout="dropdown-buttons"
              fromYear={new Date().getFullYear() - 10}
              toYear={new Date().getFullYear() + 10}
            />
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Próximo mês</span>
        </Button>
    </div>
);
  
  const mobileCalendarSelector = (
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
           <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 shadow-md border-primary"
            >
              <CalendarIcon className="h-5 w-5" />
               <span className="sr-only">Selecionar Mês</span>
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            locale={ptBR}
            selected={selectedDate}
            onSelect={handleDateSelect}
            defaultMonth={selectedDate}
            onMonthChange={handleMonthSelect}
            initialFocus
            captionLayout="dropdown-buttons"
            fromYear={new Date().getFullYear() - 10}
            toYear={new Date().getFullYear() + 10}
          />
        </PopoverContent>
      </Popover>
  );


  if (!mounted) {
    const skeletonButtonWidth = isMobile ? "w-12 h-12" : "w-[200px] h-9";
    const skeletonContainerClasses = isMobile ? "mb-4 flex items-center justify-between gap-2" : "flex items-center gap-2";
    
    return (
      <div className={skeletonContainerClasses}>
        <Skeleton className={cn("rounded-md bg-muted", skeletonButtonWidth)} /> 
        {isMobile && (
          <div className="flex items-center gap-1 flex-grow">
            {centerMobileContent && <Skeleton className="h-12 flex-grow rounded-md bg-muted" />}
          </div>
        )}
        {isMobile && showMobileGlobalControls && (
          <div className="flex items-center gap-1">
            <Skeleton className="h-12 w-12 rounded-md bg-muted" /> {/* Theme */}
            {isAdmin && <Skeleton className="h-12 w-12 rounded-md bg-muted" />} {/* Admin */}
            {user && <Skeleton className="h-12 w-12 rounded-md bg-muted" />} {/* Logout */}
          </div>
        )}
      </div>
    );
  }
  
  // Mobile View
  if (isMobile) {
    return (
      <div className="mb-4"> 
        <div className="flex items-center justify-between gap-2">
          {mobileCalendarSelector}
          <div className="flex items-center gap-1 flex-grow justify-center">
            {centerMobileContent}
          </div>
          <div className="flex items-center gap-1">
            {showMobileGlobalControls && mobileGlobalControlsGroup}
          </div>
        </div>
      </div>
    );
  }

  // Desktop View
  return desktopMonthNavigationControls;
}
