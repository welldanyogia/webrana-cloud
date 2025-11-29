'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useResetPassword } from '@/hooks/use-auth';
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from '@/lib/validations';

export default function ResetPasswordPage() {
  const params = useParams();
  const token = params.token as string;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const resetPassword = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    resetPassword.mutate(
      {
        token,
        password: data.password,
      },
      {
        onSuccess: () => {
          setIsSubmitted(true);
        },
      }
    );
  };

  if (isSubmitted) {
    return (
      <AuthLayout
        title="Password Berhasil Direset"
        description="Password Anda telah berhasil diubah."
      >
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-[var(--success)]" />
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Password Anda telah berhasil direset. Silakan login dengan password baru Anda.
          </p>
          <Link href="/login">
            <Button className="w-full" size="lg">
              Masuk ke Akun
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Buat Password Baru"
      description="Masukkan password baru untuk akun Anda."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Password Baru"
          type={showPassword ? 'text' : 'password'}
          placeholder="Masukkan password baru"
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

        <Input
          label="Konfirmasi Password Baru"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Ulangi password baru"
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

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={resetPassword.isPending}
        >
          Reset Password
        </Button>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
