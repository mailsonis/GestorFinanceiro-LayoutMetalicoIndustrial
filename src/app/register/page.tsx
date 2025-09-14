
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, DollarSign } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email("Email inválido."),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, user, loading, appSettings, isAdmin, refreshAppSettings } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    refreshAppSettings().finally(() => setPageLoading(false));
  }, [refreshAppSettings]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (!loading && !pageLoading) {
      if (user) {
        router.push('/dashboard');
      } else if (!appSettings.allowNewRegistrations && !isAdmin) {
        // If registrations are off and user is not admin, redirect.
        // Admins might still want to access this page for setup, though unlikely.
        toast({ title: "Cadastro desabilitado", description: "Novos cadastros estão temporariamente desabilitados.", variant: "destructive" });
        router.push('/login');
      }
    }
  }, [user, loading, pageLoading, appSettings.allowNewRegistrations, isAdmin, router, toast]);


  const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
    if (!appSettings.allowNewRegistrations && !isAdmin) {
       toast({ title: "Cadastro desabilitado", description: "Novos cadastros estão temporariamente desabilitados.", variant: "destructive" });
       router.push('/login');
       return;
    }
    try {
      await signUp(data.email, data.password);
      toast({ title: "Cadastro realizado com sucesso!", description: "Você será redirecionado para o dashboard." });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Registration error:", error);
      const errorMessage = error.code === 'auth/email-already-in-use'
        ? 'Este email já está em uso.'
        : error.message || 'Não foi possível criar a conta.';
      toast({
        title: "Erro no Cadastro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
  
  if (loading || pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Carregando...</p>
      </div>
    );
  }

  if (user || (!appSettings.allowNewRegistrations && !isAdmin)) {
    // This state should be brief due to redirect, but it's a fallback.
    return null; 
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-1 mb-4">
            <DollarSign className="h-10 w-10 text-primary" />
            <CardTitle className="text-3xl font-headline text-primary">{appSettings.systemName}</CardTitle>
          </div>
          <CardDescription>Crie sua conta para começar a gerenciar suas finanças.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register("email")}
                className={errors.email ? "border-destructive" : ""}
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Crie uma senha forte"
                  {...register("password")}
                  className={errors.password ? "border-destructive" : ""}
                  autoComplete="new-password"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                </Button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirme a Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repita sua senha"
                  {...register("confirmPassword")}
                  className={errors.confirmPassword ? "border-destructive" : ""}
                  autoComplete="new-password"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Esconder senha" : "Mostrar senha"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                </Button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
              {isSubmitting ? "Criando conta..." : "Criar Conta"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 pt-4">
          <p className="text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Button variant="link" asChild className="p-0 h-auto text-primary hover:underline">
              <Link href="/login">Faça login aqui</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
