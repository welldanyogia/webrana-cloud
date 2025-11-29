'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForgotPassword } from '@/hooks/use-auth';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from '@/lib/validations';

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const forgotPassword = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPassword.mutate(data, {
      onSuccess: () => {
        setSubmittedEmail(data.email);
        setIsSubmitted(true);
      },
    });
  };

  if (isSubmitted) {
    return (
      <AuthLayout
        title="Cek Email Anda"
        description="Kami telah mengirimkan instruksi reset password."
      >
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-[var(--success)]" />
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Kami telah mengirimkan email ke{' '}
            <span className="font-medium text-[var(--text-primary)]">{submittedEmail}</span>{' '}
            dengan link untuk reset password Anda.
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Tidak menerima email? Periksa folder spam atau{' '}
            <button
              onClick={() => setIsSubmitted(false)}
              className="text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium transition-colors"
            >
              kirim ulang
            </button>
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Lupa Password?"
      description="Masukkan email Anda dan kami akan kirimkan link untuk reset password."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email"
          type="email"
          placeholder="nama@email.com"
          leftIcon={<Mail className="h-5 w-5" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={forgotPassword.isPending}
        >
          Kirim Instruksi Reset
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
