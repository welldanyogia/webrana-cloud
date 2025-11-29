'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Calendar, ShoppingCart, CreditCard, ChevronRight } from 'lucide-react';
import { useAdminUserDetail, useUserOrders } from '@/hooks/use-admin-users';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatCurrency,
  formatDateTime,
  formatDateShort,
  getOrderStatusLabel,
  getOrderStatusVariant,
} from '@/lib/utils';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const { data: user, isLoading: userLoading } = useAdminUserDetail(userId);
  const { data: orders, isLoading: ordersLoading } = useUserOrders(userId);

  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-primary)] font-medium mb-2">
          Pengguna Tidak Ditemukan
        </p>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Pengguna dengan ID ini tidak ada
        </p>
        <Link href="/users">
          <Button variant="outline">Kembali ke Daftar Pengguna</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-white text-xl font-semibold">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
                {user.name}
              </h1>
              <Badge
                variant={
                  user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
                    ? 'primary'
                    : 'secondary'
                }
              >
                {user.role}
              </Badge>
            </div>
            <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle size="sm">Informasi Pengguna</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--primary-muted)] flex items-center justify-center">
                    <Mail className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Email</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--success-bg)] flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-[var(--success)]" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Total Pesanan</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {user.ordersCount} pesanan
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--warning-bg)] flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-[var(--warning)]" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Total Belanja</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {formatCurrency(user.totalSpent)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--info-bg)] flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-[var(--info)]" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Bergabung</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {formatDateTime(user.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle size="sm">Status Akun</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge
                variant={user.isActive ? 'success' : 'danger'}
                dot
              >
                {user.isActive ? 'Aktif' : 'Tidak Aktif'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* User Orders */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pesanan</CardTitle>
            </CardHeader>
            <CardContent noPadding>
              {ordersLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              ) : orders && orders.length > 0 ? (
                <div className="divide-y divide-[var(--border)]">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="flex items-center justify-between px-6 py-4 hover:bg-[var(--hover-bg)] transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[var(--text-primary)] truncate">
                            Order #{order.id.slice(0, 8)}
                          </p>
                          <Badge variant={getOrderStatusVariant(order.status)} size="sm">
                            {getOrderStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-[var(--text-muted)] mt-0.5">
                          {formatDateShort(order.createdAt)} • {formatCurrency(order.totalAmount)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-6">
                  <div className="w-12 h-12 bg-[var(--surface)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="h-6 w-6 text-[var(--text-muted)]" />
                  </div>
                  <p className="text-[var(--text-primary)] font-medium mb-1">
                    Belum Ada Pesanan
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Pengguna ini belum memiliki pesanan
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
