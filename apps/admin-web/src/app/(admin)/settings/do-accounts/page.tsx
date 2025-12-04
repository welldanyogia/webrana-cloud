'use client';

import { Plus, RefreshCw, Settings, Star, Cloud } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import {
  CapacityBar,
  HealthStatusBadge,
  DoAccountStatsCards,
} from '@/components/do-accounts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonTable } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getDoAccounts,
  getDoAccountStats,
  syncAllDoAccounts,
  type DoAccount,
  type DoAccountStats,
} from '@/lib/api/do-accounts';
import { cn } from '@/lib/utils';

export default function DoAccountsPage() {
  const [accounts, setAccounts] = useState<DoAccount[]>([]);
  const [stats, setStats] = useState<DoAccountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [accountsData, statsData] = await Promise.all([
        getDoAccounts(),
        getDoAccountStats(),
      ]);
      setAccounts(accountsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load DO accounts:', error);
      toast.error('Failed to load DO accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const result = await syncAllDoAccounts();
      toast.success(`Synced ${result.synced} account(s) successfully`);
      await fetchData();
    } catch (error) {
      console.error('Failed to sync accounts:', error);
      toast.error('Failed to sync accounts');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
            DigitalOcean Accounts
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Manage your DigitalOcean provider accounts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSyncAll}
            disabled={syncing || loading}
            isLoading={syncing}
          >
            <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
            Sync All
          </Button>
          <Link href="/settings/do-accounts/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <DoAccountStatsCards stats={stats} isLoading={loading} />

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Accounts
          </CardTitle>
        </CardHeader>
        <CardContent noPadding>
          {loading ? (
            <div className="p-6">
              <SkeletonTable rows={5} />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-12 h-12 bg-[var(--surface)] rounded-full flex items-center justify-center mx-auto mb-4">
                <Cloud className="h-6 w-6 text-[var(--text-muted)]" />
              </div>
              <p className="text-[var(--text-primary)] font-medium mb-1">
                No Accounts Found
              </p>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Add your first DigitalOcean account to start provisioning VPS
                instances.
              </p>
              <Link href="/settings/do-accounts/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  Add Account
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow
                      key={account.id}
                      className={cn(!account.isActive && 'opacity-60')}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {account.isPrimary && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                          <span className="font-medium text-[var(--text-primary)]">
                            {account.name}
                          </span>
                          {!account.isActive && (
                            <Badge variant="secondary" size="sm">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[var(--text-muted)]">
                          {account.email}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <CapacityBar
                          used={account.activeDroplets}
                          limit={account.dropletLimit}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell>
                        <HealthStatusBadge
                          status={account.healthStatus}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/settings/do-accounts/${account.id}`}>
                          <Button variant="ghost" size="icon">
                            <Settings className="h-4 w-4" />
                            <span className="sr-only">Manage account</span>
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
