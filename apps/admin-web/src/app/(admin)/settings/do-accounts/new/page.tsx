'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

import { DoAccountForm } from '@/components/do-accounts';

export default function NewDoAccountPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link
          href="/settings/do-accounts"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] mb-2 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to DO Accounts
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
          Add DigitalOcean Account
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Connect a new DigitalOcean account for VPS provisioning
        </p>
      </div>

      {/* Form */}
      <DoAccountForm mode="create" />

      {/* Help Text */}
      <div className="bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]">
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">
          How to get your DigitalOcean API Token
        </h3>
        <ol className="text-sm text-[var(--text-muted)] space-y-1 list-decimal list-inside">
          <li>
            Log in to your{' '}
            <a
              href="https://cloud.digitalocean.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--primary)] hover:underline"
            >
              DigitalOcean account
            </a>
          </li>
          <li>Go to API → Tokens/Keys</li>
          <li>Click &quot;Generate New Token&quot;</li>
          <li>Give it a name and select &quot;Read & Write&quot; scope</li>
          <li>Copy the token and paste it above</li>
        </ol>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          <strong>Note:</strong> The token will be encrypted and stored
          securely. For security, it will never be displayed again after
          creation.
        </p>
      </div>
    </div>
  );
}
