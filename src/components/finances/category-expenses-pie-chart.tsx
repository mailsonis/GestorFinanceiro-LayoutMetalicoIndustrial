
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState, useMemo, useCallback } from "react";
import { getTransactions, getCategories, type StoredTransaction, type StoredCategory } from "@/firebase/services/firestoreService";
import { useToast } from "@/hooks/use-toast";

interface CategoryExpenseData {
  name: string;
  value: number; // Total expense for this category
  percentage: number;
  fill: string; // Color for the pie slice
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = (props: any) => {
  const { cx, cy, midAngle, outerRadius, percent, fill } = props;
  const lineExtension = 15; 
  const textOffset = 5;

  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);

  const sx = cx + (outerRadius) * cos;
  const sy = cy + (outerRadius) * sin;
  const ex = cx + (outerRadius + lineExtension) * cos;
  const ey = cy + (outerRadius + lineExtension) * sin;
  
  const textAnchor = cos >= 0 ? 'start' : 'end';

  if (percent === 0) return null; // Don't render label for 0%

  return (
    <g>
      <path d={`M${sx},${sy}L${ex},${ey}`} stroke="hsl(var(--muted-foreground))" fill="none" strokeWidth={1}/>
      <circle cx={sx} cy={sy} r={1.5} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * textOffset}
        y={ey}
        textAnchor={textAnchor}
        fill="hsl(var(--foreground))"
        dominantBaseline="central"
        fontSize="11px"
        fontWeight="medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    </g>
  );
};

const CustomTooltipContent = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2.5 shadow-md">
        <div className="flex items-center mb-1">
            <span
              className="mr-2 h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: data.fill }}
            />
            <p className="text-sm font-semibold text-foreground">{data.name}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Gasto: {data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
        <p className="text-xs text-muted-foreground">
          Percentual: {(data.percentage * 100).toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};


interface CategoryExpensesPieChartProps {
  userId?: string;
  selectedMonth: string;
  selectedYear: number;
}

export function CategoryExpensesPieChart({ userId, selectedMonth, selectedYear }: CategoryExpensesPieChartProps) {
  const [chartData, setChartData] = useState<CategoryExpenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const monthYearDescription = useMemo(() => {
    if (selectedMonth && selectedYear) {
      return `para ${selectedMonth} de ${selectedYear}`;
    }
    return "";
  }, [selectedMonth, selectedYear]);

  const processChartData = useCallback((transactions: StoredTransaction[], categories: StoredCategory[]) => {
      const expenseTransactions = transactions.filter(t => t.type === 'expense');
      const totalExpensesMonth = expenseTransactions.reduce((sum, t) => sum + t.value, 0);

      if (totalExpensesMonth === 0) {
        setChartData([]);
        setLoading(false);
        return;
      }

      const expensesByCategory: Record<string, { total: number; name: string; color: string }> = {};

      expenseTransactions.forEach(t => {
        const category = categories.find(c => c.id === t.categoryId);
        if (category) {
          if (!expensesByCategory[category.id]) {
            expensesByCategory[category.id] = { total: 0, name: category.name, color: category.color };
          }
          expensesByCategory[category.id].total += t.value;
        }
      });

      const formattedChartData = Object.values(expensesByCategory)
        .map(catData => ({
          name: catData.name,
          value: catData.total,
          percentage: totalExpensesMonth > 0 ? catData.total / totalExpensesMonth : 0,
          fill: catData.color || '#CCCCCC', // Default color if category color is missing
        }))
        .sort((a, b) => b.value - a.value); // Sort by value descending

      setChartData(formattedChartData);
      setLoading(false);
  }, []);


  const fetchChartData = useCallback(async () => {
    if (!userId || !selectedMonth || !selectedYear) {
      setChartData([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const [transactions, categories] = await Promise.all([
        getTransactions(userId, selectedMonth, selectedYear),
        getCategories(userId)
      ]);
      processChartData(transactions, categories);

    } catch (error) {
      console.error("Error fetching data for pie chart:", error);
      toast({ title: "Erro ao carregar gráfico de categorias", variant: "destructive" });
      setChartData([]);
      setLoading(false);
    }
  }, [userId, selectedMonth, selectedYear, toast, processChartData]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  useEffect(() => {
    const handleFabTransactionAdded = () => {
      fetchChartData();
    };
    window.addEventListener('transactionAddedByFab', handleFabTransactionAdded);
    return () => {
      window.removeEventListener('transactionAddedByFab', handleFabTransactionAdded);
    };
  }, [fetchChartData]);

  if (loading) {
    return (
      <Card industrial>
        <CardHeader>
          <Skeleton className="h-6 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md mt-1" />
        </CardHeader>
        <CardContent className="flex justify-center items-center pt-2 pb-4">
          <Skeleton className="h-48 w-48 rounded-full aspect-square" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
       <Card industrial>
        <CardHeader>
          <CardTitle className="font-headline">Distribuição de Despesas</CardTitle>
          <CardDescription>Nenhuma despesa registrada {monthYearDescription}.</CardDescription>
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
        <CardTitle className="font-headline">Despesas por Categoria</CardTitle>
        <CardDescription>Percentual de gastos {monthYearDescription}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false} // We are drawing custom lines in renderCustomizedLabel
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              stroke="hsl(var(--background))" // Border color for slices, matching background gives a nice separation
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltipContent />} cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}/>
            <Legend 
              iconSize={10} 
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              formatter={(value, entry) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
