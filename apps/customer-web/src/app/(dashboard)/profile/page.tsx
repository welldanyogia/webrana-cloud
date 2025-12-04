'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  User,
  Mail,
  Lock,
  Shield,
  Bell,
  Eye,
  EyeOff,
  Calendar,
  UserCircle,
  MessageCircle,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { PasswordStrength } from '@/components/ui/password-strength';
import { useUpdateProfile, useChangePassword } from '@/hooks/use-profile';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';


const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'Nama minimal 2 karakter')
    .max(50, 'Nama maksimal 50 karakter'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini harus diisi'),
    newPassword: z
      .string()
      .min(8, 'Password baru minimal 8 karakter')
      .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
      .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
      .regex(/[0-9]/, 'Password harus mengandung angka'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Password tidak sama',
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

/**
 * Get role label in Indonesian
 */
function getRoleLabel(role: string): string {
  const roleMap: Record<string, string> = {
    CUSTOMER: 'Pelanggan',
    ADMIN: 'Administrator',
  };
  return roleMap[role] || role;
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Mutations
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
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

  // Watch newPassword for strength indicator
  const newPassword = passwordForm.watch('newPassword');

  // Update form when user data loads
  useEffect(() => {
    if (user?.name) {
      profileForm.reset({ name: user.name });
    }
  }, [user, profileForm]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    changePasswordMutation.mutate(
      {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
      {
        onSuccess: () => {
          passwordForm.reset();
        },
      }
    );
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

      {/* Account Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--info-bg)] rounded-lg flex items-center justify-center">
              <UserCircle className="h-5 w-5 text-[var(--info)]" />
            </div>
            <div>
              <CardTitle>Informasi Akun</CardTitle>
              <CardDescription>
                Detail informasi akun Anda
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-4 bg-[var(--surface)] rounded-lg">
              <User className="h-5 w-5 text-[var(--text-muted)] mt-0.5" />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Nama</p>
                <p className="font-medium text-[var(--text-primary)]">
                  {user?.name || '-'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-[var(--surface)] rounded-lg">
              <Mail className="h-5 w-5 text-[var(--text-muted)] mt-0.5" />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Email</p>
                <p className="font-medium text-[var(--text-primary)]">
                  {user?.email || '-'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-[var(--surface)] rounded-lg">
              <Calendar className="h-5 w-5 text-[var(--text-muted)] mt-0.5" />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Tanggal Bergabung
                </p>
                <p className="font-medium text-[var(--text-primary)]">
                  {user?.createdAt ? formatDate(user.createdAt) : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-[var(--surface)] rounded-lg">
              <Shield className="h-5 w-5 text-[var(--text-muted)] mt-0.5" />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Role</p>
                <p className="font-medium text-[var(--text-primary)]">
                  {user?.role ? getRoleLabel(user.role) : '-'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--primary-light)] rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <CardTitle>Edit Profil</CardTitle>
              <CardDescription>Perbarui informasi dasar akun Anda</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={profileForm.handleSubmit(onProfileSubmit)}
            className="space-y-5"
          >
            <Input
              label="Nama Lengkap"
              leftIcon={<User className="h-5 w-5" />}
              error={profileForm.formState.errors.name?.message}
              helperText="Nama akan ditampilkan di profil dan invoice Anda"
              {...profileForm.register('name')}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                isLoading={updateProfileMutation.isPending}
              >
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
              <CardDescription>
                Pastikan password Anda kuat dan aman
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            className="space-y-5"
          >
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
                  aria-label={
                    showCurrentPassword ? 'Sembunyikan password' : 'Tampilkan password'
                  }
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              }
              error={passwordForm.formState.errors.currentPassword?.message}
              {...passwordForm.register('currentPassword')}
            />
            <div className="space-y-3">
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
                    aria-label={
                      showNewPassword ? 'Sembunyikan password' : 'Tampilkan password'
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                }
                error={passwordForm.formState.errors.newPassword?.message}
                {...passwordForm.register('newPassword')}
              />
              <PasswordStrength password={newPassword || ''} />
            </div>
            <Input
              label="Konfirmasi Password Baru"
              type={showConfirmPassword ? 'text' : 'password'}
              leftIcon={<Lock className="h-5 w-5" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="focus:outline-none hover:text-[var(--text-secondary)] transition-colors"
                  tabIndex={-1}
                  aria-label={
                    showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              }
              error={passwordForm.formState.errors.confirmPassword?.message}
              {...passwordForm.register('confirmPassword')}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                isLoading={changePasswordMutation.isPending}
              >
                Ubah Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Telegram Integration - Placeholder for v1.3 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle>Telegram</CardTitle>
              <CardDescription>
                Hubungkan akun Telegram untuk notifikasi realtime
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-lg">
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                Integrasi Telegram
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Dapatkan notifikasi status VPS langsung ke Telegram Anda
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Segera hadir di versi 1.3
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Hubungkan Telegram
            </Button>
          </div>
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
              <CardDescription>
                Pengaturan keamanan tambahan untuk akun Anda
              </CardDescription>
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
              <Button variant="outline" size="sm" disabled>
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
              <Button variant="outline" size="sm" disabled>
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
            <Checkbox label="Info produk baru dan penawaran khusus" />
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
              <p className="font-medium text-[var(--text-primary)]">Hapus Akun</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Semua data Anda akan dihapus secara permanen
              </p>
            </div>
            <Button variant="danger" size="sm" disabled>
              Hapus Akun
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
