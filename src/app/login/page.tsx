
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
import { ForgotPasswordModal } from '@/components/auth/forgot-password-modal';

const loginSchema = z.object({
  email: z.string().email("Email inválido."),
  password: z.string().min(1, "Senha é obrigatória."),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading, appSettings, refreshAppSettings } = useAuth(); // Added appSettings and refresh
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [pageLoading, setPageLoading] = useState(true); // For app settings loading
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    refreshAppSettings().finally(() => setPageLoading(false));
  }, [refreshAppSettings]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    try {
      await signIn(data.email, data.password);
      toast({ title: "Login bem-sucedido!", description: "Redirecionando para o dashboard." });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage = error.code === 'auth/invalid-credential' 
        ? 'Email ou senha inválidos.'
        : error.message || 'Falha no login. Verifique suas credenciais.';
      toast({
        title: "Erro no Login",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
  
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);
  
  if (loading || pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Carregando...</p>
      </div>
    );
  }
  // Do not render the form if user is already logged in and redirect is in progress
  if (user) return null;


  return (
    <>
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-primary/10 via-background to-background p-4">
        <main className="flex flex-grow items-center justify-center">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center items-center gap-1 mb-4">
                <DollarSign className="h-10 w-10 text-primary" />
                <CardTitle className="text-3xl font-headline text-primary">{appSettings.systemName}</CardTitle>
              </div>
              <CardDescription>Acesse sua conta para gerenciar suas finanças pessoais.</CardDescription>
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
                      placeholder="Sua senha"
                      {...register("password")}
                      className={errors.password ? "border-destructive" : ""}
                      autoComplete="current-password"
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
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
                  {isSubmitting ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col items-center space-y-4 pt-4">
              <Button 
                variant="link" 
                onClick={() => setIsForgotPasswordModalOpen(true)}
                className="p-0 h-auto text-sm text-info hover:text-info/90 hover:no-underline font-normal"
              >
                Esqueceu a senha?
              </Button>
              {appSettings.allowNewRegistrations ? (
                <p className="text-sm text-muted-foreground">
                  Não tem uma conta?{' '}
                  <Button variant="link" asChild className="p-0 h-auto text-primary hover:underline">
                    <Link href="/register">Cadastre-se aqui</Link>
                  </Button>
                </p>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  <p>
                    Ainda não tem cadastro?
                    Contate o admin para adquirir o seu!
                  </p>
                  <Button variant="link" asChild className="mt-1 p-0 h-auto text-primary hover:underline">
                    <a href={`https://wa.me/${appSettings.contactWhatsapp}`} target="_blank" rel="noopener noreferrer">
                      Whatsapp
                    </a>
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        </main>
        <footer className="w-full flex-shrink-0 text-center text-xs text-muted-foreground py-4">
          {currentYear && `© ${currentYear} Idealizado Por Mailson R.G. Desenvolvido Com IA`}
        </footer>
      </div>
      <ForgotPasswordModal 
        isOpen={isForgotPasswordModalOpen} 
        onClose={() => setIsForgotPasswordModalOpen(false)}
      />
    </>
  );
}
