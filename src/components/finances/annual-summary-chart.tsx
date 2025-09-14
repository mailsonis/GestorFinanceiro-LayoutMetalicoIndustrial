
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent, type ChartConfig, ChartLegendContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useMemo, useCallback } from "react";
import { getTransactions } from "@/firebase/services/firestoreService";
import { useToast } from "@/hooks/use-toast";
import { parseISO } from 'date-fns';

const monthsOrder = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface ChartDataItem {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

const chartConfig = {
  income: {
    label: "Receitas",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Despesas",
    color: "hsl(var(--chart-2))",
  },
  balance: {
    label: "Saldo",
    color: "hsl(var(--info))", 
  }
} satisfies ChartConfig

interface AnnualSummaryChartProps {
  userId?: string; 
}

export function AnnualSummaryChart({ userId }: AnnualSummaryChartProps) {
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const fetchChartData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const transactions = await getTransactions(userId, undefined, currentYear); 
      
      const monthlyData = monthsOrder.reduce((acc, monthName) => {
        acc[monthName] = { income: 0, expenses: 0 };
        return acc;
      }, {} as Record<string, { income: number; expenses: number }>);

      transactions.forEach(t => {
        const transactionMonth = parseISO(t.date).getMonth(); 
        const monthName = monthsOrder[transactionMonth];
        if (monthName) { 
          if (t.type === 'income') {
            monthlyData[monthName].income += t.value;
          } else {
            monthlyData[monthName].expenses += t.value;
          }
        }
      });

      const formattedChartData = monthsOrder.map(monthName => ({
        month: monthName,
        income: monthlyData[monthName].income,
        expenses: monthlyData[monthName].expenses,
        balance: monthlyData[monthName].income - monthlyData[monthName].expenses,
      }));
      
      setChartData(formattedChartData);
    } catch (error) {
      console.error("Error fetching data for annual chart:", error);
      toast({ title: "Erro ao carregar resumo anual", variant: "destructive" });
       const mockDataOnError = monthsOrder.map(month => ({
        month, income: 0, expenses: 0, balance: 0
      }));
      setChartData(mockDataOnError);
    } finally {
      setLoading(false);
    }
  }, [userId, currentYear, toast]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  useEffect(() => {
    const handleFabTransactionAdded = () => {
      if (userId) { 
        fetchChartData();
      }
    };

    window.addEventListener('transactionAddedByFab', handleFabTransactionAdded);
    return () => {
      window.removeEventListener('transactionAddedByFab', handleFabTransactionAdded);
    };
  }, [userId, fetchChartData]); 


  if (loading || !userId) {
    return (
      <Card industrial>
        <CardHeader>
          <Skeleton className="h-6 w-1/3 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md mt-1" />
        </CardHeader>
        <CardContent className="pb-2">
          <Skeleton className="h-[180px] w-full aspect-video rounded-md" />
        </CardContent>
      </Card>
    );
  }
  
  if (chartData.length === 0 && !loading) {
    return (
       <Card industrial>
        <CardHeader>
          <CardTitle className="font-headline">Resumo Anual ({currentYear})</CardTitle>
          <CardDescription>Receitas, Despesas e Saldo por Mês</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-48 pt-2 pb-4">
          <p className="text-muted-foreground text-center">Sem dados para exibir o gráfico.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card industrial>
      <CardHeader>
        <CardTitle className="font-headline">Resumo Anual ({currentYear})</CardTitle>
        <CardDescription>Receitas, Despesas e Saldo por Mês</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="w-full"> 
          <ChartContainer config={chartConfig} className="min-h-[180px] w-full aspect-video">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  width={80} 
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--accent) / 0.3)" }}
                  content={<ChartTooltipContent 
                    formatter={(value, name, item) => {
                      const config = chartConfig[name as keyof typeof chartConfig];
                      const formattedValue = Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                      const labelText = config?.label || name;
                      const indicatorColor = item.color || (config?.color ? `var(--color-${name})` : 'hsl(var(--muted-foreground))');

                      return (
                        <div className="flex w-full items-center justify-between">
                          <div className="flex items-center">
                            <span
                              className="mr-2 h-2.5 w-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: indicatorColor }}
                            />
                            <span className="text-muted-foreground">{labelText}</span>
                          </div>
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {formattedValue}
                          </span>
                        </div>
                      );
                    }}
                  />}
                />
                <Legend content={<ChartLegendContent />} wrapperStyle={{fontSize: '12px'}} />
                <Bar dataKey="income" name="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="balance" name="balance" name="balance" fill="var(--color-balance)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
