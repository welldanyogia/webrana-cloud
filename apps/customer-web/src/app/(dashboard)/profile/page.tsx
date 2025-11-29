'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Lock, Shield, Bell, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini harus diisi'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Password tidak sama',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsSaving(true);
    // Simulate API call - TODO: Implement actual API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsChangingPassword(true);
    // Simulate API call - TODO: Implement actual API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsChangingPassword(false);
    passwordForm.reset();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Profil Saya
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Kelola informasi akun dan preferensi Anda
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--primary-light)] rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <CardTitle>Informasi Profil</CardTitle>
              <CardDescription>Perbarui informasi dasar akun Anda</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-5">
            <Input
              label="Nama Lengkap"
              leftIcon={<User className="h-5 w-5" />}
              error={profileForm.formState.errors.name?.message}
              {...profileForm.register('name')}
            />
            <Input
              label="Email"
              type="email"
              leftIcon={<Mail className="h-5 w-5" />}
              error={profileForm.formState.errors.email?.message}
              helperText="Email digunakan untuk login dan notifikasi"
              {...profileForm.register('email')}
            />
            <div className="flex justify-end">
              <Button type="submit" isLoading={isSaving}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--warning-bg)] rounded-lg flex items-center justify-center">
              <Lock className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <div>
              <CardTitle>Ubah Password</CardTitle>
              <CardDescription>Pastikan password Anda kuat dan aman</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5">
            <Input
              label="Password Saat Ini"
              type={showCurrentPassword ? 'text' : 'password'}
              leftIcon={<Lock className="h-5 w-5" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="focus:outline-none hover:text-[var(--text-secondary)] transition-colors"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              }
              error={passwordForm.formState.errors.currentPassword?.message}
              {...passwordForm.register('currentPassword')}
            />
            <Input
              label="Password Baru"
              type={showNewPassword ? 'text' : 'password'}
              leftIcon={<Lock className="h-5 w-5" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="focus:outline-none hover:text-[var(--text-secondary)] transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              }
              error={passwordForm.formState.errors.newPassword?.message}
              {...passwordForm.register('newPassword')}
            />
            <Input
              label="Konfirmasi Password Baru"
              type="password"
              leftIcon={<Lock className="h-5 w-5" />}
              error={passwordForm.formState.errors.confirmPassword?.message}
              {...passwordForm.register('confirmPassword')}
            />
            <div className="flex justify-end">
              <Button type="submit" isLoading={isChangingPassword}>
                Ubah Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--success-bg)] rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-[var(--success)]" />
            </div>
            <div>
              <CardTitle>Keamanan</CardTitle>
              <CardDescription>Pengaturan keamanan tambahan untuk akun Anda</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start justify-between p-4 bg-[var(--surface)] rounded-lg">
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  Autentikasi Dua Faktor (2FA)
                </p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Tambahkan lapisan keamanan ekstra untuk akun Anda
                </p>
              </div>
              <Button variant="outline" size="sm">
                Aktifkan
              </Button>
            </div>
            <div className="flex items-start justify-between p-4 bg-[var(--surface)] rounded-lg">
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  Sesi Login Aktif
                </p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Kelola perangkat yang sedang login ke akun Anda
                </p>
              </div>
              <Button variant="outline" size="sm">
                Lihat Semua
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--info-bg)] rounded-lg flex items-center justify-center">
              <Bell className="h-5 w-5 text-[var(--info)]" />
            </div>
            <div>
              <CardTitle>Notifikasi</CardTitle>
              <CardDescription>Atur preferensi notifikasi Anda</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Checkbox
              label="Notifikasi status VPS (aktif, berhenti, error)"
              defaultChecked
            />
            <Checkbox
              label="Pengingat tagihan dan pembayaran"
              defaultChecked
            />
            <Checkbox
              label="Info produk baru dan penawaran khusus"
            />
            <Checkbox
              label="Tips keamanan dan maintenance server"
              defaultChecked
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Zona Berbahaya</CardTitle>
          <CardDescription>
            Tindakan di bawah ini bersifat permanen dan tidak dapat dibatalkan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                Hapus Akun
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Semua data Anda akan dihapus secara permanen
              </p>
            </div>
            <Button variant="danger" size="sm">
              Hapus Akun
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
