'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { AuthLayout } from '@/components/layouts/auth-layout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useRegister } from '@/hooks/use-auth';
import { registerSchema, type RegisterFormData } from '@/lib/validations';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const password = watch('password');

  const onSubmit = (data: RegisterFormData) => {
    const { name, email, password } = data;
    registerMutation.mutate({ name, email, password });
  };

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password || '');
  const strengthLabels = ['Sangat Lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat'];
  const strengthColors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
  ];

  return (
    <AuthLayout
      title="Daftar Gratis"
      description="Buat akun Anda dan deploy VPS pertama dalam hitungan menit."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Nama Lengkap"
          type="text"
          placeholder="John Doe"
          leftIcon={<User className="h-5 w-5" />}
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Email"
          type="email"
          placeholder="nama@email.com"
          leftIcon={<Mail className="h-5 w-5" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Buat password"
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
          {password && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < passwordStrength
                        ? strengthColors[passwordStrength - 1]
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1.5">
                Kekuatan: {strengthLabels[passwordStrength - 1] || 'Sangat Lemah'}
              </p>
            </div>
          )}
        </div>

        <Input
          label="Konfirmasi Password"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Ulangi password"
          leftIcon={<Lock className="h-5 w-5" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="focus:outline-none hover:text-[var(--text-secondary)] transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          }
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Checkbox
          label={
            <span>
              Saya menyetujui{' '}
              <Link
                href="/terms"
                className="text-[var(--primary)] hover:text-[var(--primary-hover)]"
                target="_blank"
              >
                Syarat dan Ketentuan
              </Link>{' '}
              serta{' '}
              <Link
                href="/privacy"
                className="text-[var(--primary)] hover:text-[var(--primary-hover)]"
                target="_blank"
              >
                Kebijakan Privasi
              </Link>
            </span>
          }
          error={errors.acceptTerms?.message}
          {...register('acceptTerms')}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={registerMutation.isPending}
        >
          Daftar
        </Button>

        <p className="text-center text-sm text-[var(--text-secondary)]">
          Sudah punya akun?{' '}
          <Link
            href="/login"
            className="font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
          >
            Masuk
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
