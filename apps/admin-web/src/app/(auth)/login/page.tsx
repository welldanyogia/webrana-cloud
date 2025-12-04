'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthLayout } from '@/components/layouts/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLogin } from '@/hooks/use-auth';
import { loginSchema, type LoginFormData } from '@/lib/validations';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginFormData) => {
    login.mutate(data);
  };

  return (
    <AuthLayout
      title="Masuk ke Admin Panel"
      description="Akses dashboard admin WeBrana Cloud."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email"
          type="email"
          placeholder="admin@webrana.cloud"
          leftIcon={<Mail className="h-5 w-5" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Masukkan password"
            leftIcon={<Lock className="h-5 w-5" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus:outline-none hover:text-[var(--text-secondary)] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={login.isPending}
        >
          Masuk
        </Button>

        <p className="text-center text-sm text-[var(--text-muted)]">
          Hanya admin yang memiliki akses ke panel ini.
        </p>
      </form>
    </AuthLayout>
  );
}
