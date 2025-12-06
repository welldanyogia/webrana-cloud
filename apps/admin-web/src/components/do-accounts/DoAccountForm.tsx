'use client';

import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  createDoAccount,
  updateDoAccount,
  type DoAccount,
  type CreateDoAccountDto,
  type UpdateDoAccountDto,
} from '@/lib/api/do-accounts';

interface DoAccountFormProps {
  account?: DoAccount;
  mode: 'create' | 'edit';
  onSuccess?: (account: DoAccount) => void;
}

/**
 * Form component for creating or editing DO accounts
 */
export function DoAccountForm({ account, mode, onSuccess }: DoAccountFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [formData, setFormData] = useState({
    name: account?.name ?? '',
    email: account?.email ?? '',
    accessToken: '',
    isPrimary: account?.isPrimary ?? false,
    isActive: account?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (mode === 'create' && !formData.accessToken.trim()) {
      newErrors.accessToken = 'Access token is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let result: DoAccount;

      if (mode === 'create') {
        const createData: CreateDoAccountDto = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          accessToken: formData.accessToken.trim(),
          isPrimary: formData.isPrimary,
        };
        result = await createDoAccount(createData);
        toast.success('DO account created successfully');
      } else {
        const updateData: UpdateDoAccountDto = {
          name: formData.name.trim(),
          isActive: formData.isActive,
          isPrimary: formData.isPrimary,
        };
        result = await updateDoAccount(account?.id ?? '', updateData);
        toast.success('DO account updated successfully');
      }

      if (onSuccess) {
        onSuccess(result);
      } else {
        router.push('/settings/do-accounts');
        router.refresh();
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred';
      toast.error(`Failed to ${mode} account: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === 'create' ? 'Add DigitalOcean Account' : 'Edit DO Account'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            id="name"
            label="Account Name"
            placeholder="e.g., Production Account"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            required
          />

          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="e.g., do-account@webrana.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            required
            disabled={mode === 'edit'}
            helperText={mode === 'edit' ? 'Email cannot be changed after creation' : undefined}
          />

          {mode === 'create' && (
            <div className="relative">
              <Input
                id="accessToken"
                label="Access Token"
                type={showToken ? 'text' : 'password'}
                placeholder="Enter DigitalOcean API token"
                value={formData.accessToken}
                onChange={(e) => handleChange('accessToken', e.target.value)}
                error={errors.accessToken}
                required
                helperText="The access token will be encrypted and never displayed again"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                    aria-label={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Checkbox
              id="isPrimary"
              name="isPrimary"
              checked={formData.isPrimary}
              onChange={(e) => handleChange('isPrimary', e.target.checked)}
              label="Set as primary account (used by default for new orders)"
            />

            {mode === 'edit' && (
              <Checkbox
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                label="Account is active (can be used for provisioning)"
              />
            )}
          </div>
        </CardContent>
        <CardFooter align="end" className="gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === 'create' ? 'Creating...' : 'Saving...'}
              </>
            ) : mode === 'create' ? (
              'Create Account'
            ) : (
              'Save Changes'
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
