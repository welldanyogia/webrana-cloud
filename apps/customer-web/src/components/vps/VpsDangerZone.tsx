'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VpsDeleteModal } from './VpsDeleteModal';
import { VpsRebuildModal } from './VpsRebuildModal';
import type { VpsOrderStatus } from '@/services/vps.service';

interface VpsDangerZoneProps {
  vpsId: string;
  planName: string;
  status: VpsOrderStatus;
  currentImageId: string;
  onDelete?: (id: string) => void;
  onRebuild?: (id: string, imageId: string) => void;
  isDeleting?: boolean;
  isRebuilding?: boolean;
  className?: string;
}

export function VpsDangerZone({
  vpsId,
  planName,
  status,
  currentImageId,
  onDelete,
  onRebuild,
  isDeleting,
  isRebuilding,
  className,
}: VpsDangerZoneProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRebuildModal, setShowRebuildModal] = useState(false);

  // Determine which actions are available
  const canDelete = ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'SUSPENDED', 'FAILED'].includes(status);
  const canRebuild = ['ACTIVE', 'EXPIRING_SOON'].includes(status);

  const handleDelete = () => {
    onDelete?.(vpsId);
    setShowDeleteModal(false);
  };

  const handleRebuild = (imageId: string) => {
    onRebuild?.(vpsId, imageId);
    setShowRebuildModal(false);
  };

  if (!canDelete && !canRebuild) {
    return null;
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle
            size="sm"
            className="flex items-center gap-2 text-red-500"
          >
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Tindakan berikut bersifat permanen dan tidak dapat dibatalkan
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Rebuild VPS */}
          {canRebuild && (
            <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Rebuild VPS
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Install ulang OS. Semua data akan dihapus.
                </p>
              </div>
              <Button
                variant="warning"
                size="sm"
                onClick={() => setShowRebuildModal(true)}
                disabled={isRebuilding}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                {isRebuilding ? 'Rebuilding...' : 'Rebuild'}
              </Button>
            </div>
          )}

          {/* Delete VPS */}
          {canDelete && (
            <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Hapus VPS
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Hapus VPS secara permanen. Tidak ada refund.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                disabled={isDeleting}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                {isDeleting ? 'Menghapus...' : 'Hapus'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Modal */}
      <VpsDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        planName={planName}
        isLoading={isDeleting}
      />

      {/* Rebuild Modal */}
      <VpsRebuildModal
        isOpen={showRebuildModal}
        onClose={() => setShowRebuildModal(false)}
        onConfirm={handleRebuild}
        currentImageId={currentImageId}
        isLoading={isRebuilding}
      />
    </>
  );
}
