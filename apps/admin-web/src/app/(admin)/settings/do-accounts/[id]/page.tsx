'use client';

import {
  ChevronLeft,
  RefreshCw,
  Activity,
  Trash2,
  Star,
  Clock,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { DoAccountForm, DeleteAccountDialog, CapacityBar, HealthStatusBadge } from '@/components/do-accounts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getDoAccountById,
  syncDoAccount,
  healthCheckDoAccount,
  type DoAccount,
} from '@/lib/api/do-accounts';
import { cn } from '@/lib/utils';

export default function DoAccountDetailPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<DoAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchAccount = useCallback(async () => {
    try {
      const data = await getDoAccountById(accountId);
      setAccount(data);
    } catch (error) {
      console.error('Failed to load DO account:', error);
      toast.error('Failed to load DO account');
      router.push('/settings/do-accounts');
    } finally {
      setLoading(false);
    }
  }, [accountId, router]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  const handleSync = async () => {
    if (!account) return;
    setSyncing(true);
    try {
      const updated = await syncDoAccount(account.id);
      setAccount(updated);
      toast.success('Account synced successfully');
    } catch (error) {
      console.error('Failed to sync account:', error);
      toast.error('Failed to sync account');
    } finally {
      setSyncing(false);
    }
  };

  const handleHealthCheck = async () => {
    if (!account) return;
    setCheckingHealth(true);
    try {
      const result = await healthCheckDoAccount(account.id);
      // Update account with new health status
      setAccount((prev) =>
        prev
          ? {
              ...prev,
              healthStatus: result.status,
              lastHealthCheck: result.checkedAt,
            }
          : null
      );
      toast.success(`Health check complete: ${result.status}`);
    } catch (error) {
      console.error('Failed to check health:', error);
      toast.error('Failed to perform health check');
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleDeleted = () => {
    router.push('/settings/do-accounts');
    router.refresh();
  };

  const handleEditSuccess = (updatedAccount: DoAccount) => {
    setAccount(updatedAccount);
    setIsEditing(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!account) {
    return null;
  }

  if (isEditing) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <button
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-2 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Cancel Edit
          </button>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
            Edit DO Account
          </h1>
        </div>
        <DoAccountForm
          mode="edit"
          account={account}
          onSuccess={handleEditSuccess}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/settings/do-accounts"
            className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-2 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to DO Accounts
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
              {account.name}
            </h1>
            {account.isPrimary && (
              <Badge variant="warning" size="md">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Primary
              </Badge>
            )}
            {!account.isActive && (
              <Badge variant="secondary" size="md">
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {account.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleHealthCheck}
            disabled={checkingHealth}
            isLoading={checkingHealth}
          >
            <Activity className="h-4 w-4" />
            Health Check
          </Button>
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            isLoading={syncing}
          >
            <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
            Sync
          </Button>
        </div>
      </div>

      {/* Account Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Account Details</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Health & Capacity */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">
                Health Status
              </h4>
              <HealthStatusBadge status={account.healthStatus} size="md" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-[var(--text-muted)] mb-2">
                Droplet Capacity
              </h4>
              <CapacityBar
                used={account.activeDroplets}
                limit={account.dropletLimit}
                size="md"
              />
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-[var(--border)]">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[var(--surface)] rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Last Health Check
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {formatDate(account.lastHealthCheck)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[var(--surface)] rounded-lg flex items-center justify-center">
                <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Created
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {formatDate(account.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                Delete this account
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Once deleted, this account cannot be recovered. All associated
                configuration will be lost.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={account.isPrimary}
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </div>
          {account.isPrimary && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-3">
              Primary accounts cannot be deleted. Set another account as primary
              first.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteAccountDialog
        account={account}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
