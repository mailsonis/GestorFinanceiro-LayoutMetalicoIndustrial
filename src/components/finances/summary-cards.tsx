
import { Card, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  colorClass: string;
  iconBgClass: string;
  isCurrency?: boolean;
}

function SummaryCard({ title, value, subtitle, icon: Icon, colorClass, iconBgClass, isCurrency = true }: SummaryCardProps) {
  const formattedValue = isCurrency 
    ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : value.toString();

  const glowStyle = {
    textShadow: `
      0 0 8px currentColor
    `,
  };

  return (
    <Card industrial className="p-4 flex flex-col h-full shadow-lg">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", iconBgClass)}>
          <Icon className={cn("h-6 w-6", colorClass)} />
        </div>
        <CardTitle className="text-sm font-semibold text-muted-foreground tracking-wider">{title}</CardTitle>
      </div>
      <div className='flex-grow flex flex-col justify-center items-center'>
        <p className={cn("text-3xl font-bold tracking-tight", colorClass)} style={glowStyle}>{formattedValue}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </Card>
  );
}

interface SummaryCardsContainerProps {
  totalIncome: number;
  totalExpenses: number;
  currentBalance: number;
}

export function SummaryCardsContainer({ totalIncome, totalExpenses, currentBalance }: SummaryCardsContainerProps) {
  const balanceSubtitle = currentBalance >= 0 ? "Saldo positivo" : "Saldo negativo";
  const balanceColorClass = currentBalance >= 0 ? "text-primary" : "text-destructive";
  const balanceIconBgClass = currentBalance >= 0 ? "bg-primary/10" : "bg-destructive/10";


  return (
    <div className="grid gap-4 md:grid-cols-3">
      <SummaryCard 
        title="RECEITAS" 
        value={totalIncome} 
        subtitle="Total de entradas"
        icon={TrendingUp} 
        colorClass="text-green-600 dark:text-green-400" 
        iconBgClass="bg-green-600/10 dark:bg-green-400/10"
      />
      <SummaryCard 
        title="DESPESAS" 
        value={totalExpenses}
        subtitle="Total de saídas"
        icon={TrendingDown} 
        colorClass="text-destructive" 
        iconBgClass="bg-destructive/10"
      />
      <SummaryCard 
        title="SALDO" 
        value={currentBalance} 
        subtitle={balanceSubtitle}
        icon={Wallet} 
        colorClass={balanceColorClass}
        iconBgClass={balanceIconBgClass}
      />
    </div>
  );
}
