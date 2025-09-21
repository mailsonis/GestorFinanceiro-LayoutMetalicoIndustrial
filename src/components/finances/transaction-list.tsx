
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StoredCategory } from '@/firebase/services/firestoreService';
import { useIsMobile } from '@/hooks/use-mobile';
import { parseISO } from 'date-fns';

export interface Transaction {
  id: string;
  description: string;
  value: number;
  date: string; 
  type: 'income' | 'expense';
  categoryId: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  categories: StoredCategory[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  isPrinting?: boolean;
}

const formatDate = (dateString: string, isMobileView: boolean) => {
  try {
    const date = parseISO(dateString);
    if (isMobileView) {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (error) {
    return "Data inválida";
  }
};

export function TransactionList({ transactions, categories, onEdit, onDelete, isPrinting = false }: TransactionListProps) {
  const isMobile = useIsMobile();

  if (transactions.length === 0) {
    return (
      <Card industrial>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p className="text-lg">Nenhuma movimentação encontrada para este período.</p>
          <p>Adicione uma nova movimentação para começar.</p>
        </CardContent>
      </Card>
    );
  }
  
  const renderCategory = (category: StoredCategory | undefined, isMobileView: boolean) => {
    const categoryName = category ? category.name : 'Desconhecida';
    const categoryColor = category ? category.color : 'hsl(var(--muted-foreground))';

    if (isPrinting) {
       return (
        <span style={{ color: categoryColor, borderColor: categoryColor, borderWidth: 1, padding: '2px 6px', borderRadius: '9999px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
          {categoryName}
        </span>
      );
    }
    
    if(isMobileView) {
      return (
        <div className="text-xs text-muted-foreground md:hidden flex items-center">
            <span
              style={{ backgroundColor: categoryColor }}
              className="inline-block w-2 h-2 rounded-full mr-1.5 shrink-0"
              aria-hidden="true"
            ></span>
            <span className="truncate">{categoryName}</span>
        </div>
      )
    }

    return (
       <Badge 
          variant="outline"
          style={{ 
            borderColor: categoryColor,
            color: categoryColor,
            backgroundColor: 'transparent'
          }}
        >
          {categoryName}
        </Badge>
    );
  };


  return (
    <Card industrial>
      <CardHeader className="md:hidden"> {/* Title hidden on desktop */}
        <CardTitle className="font-headline">Lista de Movimentações</CardTitle>
      </CardHeader>
      <CardContent className={cn(isMobile ? "pt-0" : "pt-6")}> {/* Adjust top padding for content if header is hidden */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => {
                const category = categories.find(cat => cat.id === transaction.categoryId);
                
                return (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="font-medium">{transaction.description}</div>
                       {renderCategory(category, true)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        {renderCategory(category, false)}
                    </TableCell>
                    <TableCell>{formatDate(transaction.date, isMobile)}</TableCell>
                    <TableCell 
                      className={cn(
                        "text-right font-semibold",
                        transaction.type === 'income' ? 'text-green-400' : 'text-destructive'
                      )}
                    >
                      <span className="whitespace-nowrap">
                        {transaction.type === 'income' ? '+' : '-'} 
                        {transaction.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </TableCell>
                      <TableCell className="text-right">
                        {isMobile ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Ações da movimentação" className="h-12 w-12">
                                <MoreHorizontal className="h-6 w-6" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => onEdit(transaction)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => onDelete(transaction)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <div className="flex items-center justify-end gap-0.5">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => onEdit(transaction)} 
                              aria-label="Editar movimentação"
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => onDelete(transaction)} 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8" 
                              aria-label="Excluir movimentação"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

    