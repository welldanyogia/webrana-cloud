'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cpu,
  HardDrive,
  Wifi,
  Server,
  Tag,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlans, useImages, useValidateCoupon } from '@/hooks/use-catalog';
import { useCreateOrder } from '@/hooks/use-orders';
import type { VpsPlan, OsImage, DurationUnit, CouponValidationResponse } from '@/types';

const STEPS = [
  { id: 1, name: 'Paket', description: 'Pilih paket VPS' },
  { id: 2, name: 'Sistem Operasi', description: 'Pilih OS' },
  { id: 3, name: 'Konfigurasi', description: 'Hostname' },
  { id: 4, name: 'Kupon', description: 'Opsional' },
  { id: 5, name: 'Review', description: 'Konfirmasi pesanan' },
];

function formatRam(ramMb: number): string {
  if (ramMb >= 1024) {
    return `${ramMb / 1024} GB`;
  }
  return `${ramMb} MB`;
}

function formatBandwidth(bandwidthGb: number): string {
  if (bandwidthGb >= 1000) {
    return `${bandwidthGb / 1000} TB`;
  }
  return `${bandwidthGb} GB`;
}

function getPlanPrice(plan: VpsPlan | undefined, billingCycle: DurationUnit): number {
  if (!plan) return 0;
  const pricing = plan.pricing?.find((p) => p.duration === billingCycle);
  return pricing?.price ?? 0;
}

function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: typeof STEPS;
}) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li
            key={step.id}
            className={`relative ${stepIdx !== steps.length - 1 ? 'flex-1 pr-8' : ''}`}
          >
            <div className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step.id < currentStep
                    ? 'bg-[var(--primary)] text-white'
                    : step.id === currentStep
                    ? 'border-2 border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--primary)]'
                    : 'border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'
                }`}
              >
                {step.id < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              {stepIdx !== steps.length - 1 && (
                <div
                  className={`ml-4 h-0.5 flex-1 ${
                    step.id < currentStep
                      ? 'bg-[var(--primary)]'
                      : 'bg-[var(--border)]'
                  }`}
                />
              )}
            </div>
            <div className="mt-2 hidden sm:block">
              <p
                className={`text-xs font-medium ${
                  step.id <= currentStep
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {step.name}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function NewOrderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialPlanId = searchParams.get('plan');
  const initialCycle = (searchParams.get('cycle') as DurationUnit) || 'MONTHLY';

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(initialPlanId);
  const [billingCycle, setBillingCycle] = useState<DurationUnit>(initialCycle);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [hostname, setHostname] = useState('');
  const [hostnameError, setHostnameError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResponse | null>(null);

  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: images, isLoading: imagesLoading } = useImages();
  const validateCouponMutation = useValidateCoupon();
  const createOrderMutation = useCreateOrder();

  const selectedPlan = useMemo(
    () => plans?.find((p) => p.id === selectedPlanId),
    [plans, selectedPlanId]
  );
  const selectedImage = useMemo(
    () => images?.find((i) => i.id === selectedImageId),
    [images, selectedImageId]
  );

  const basePrice = getPlanPrice(selectedPlan, billingCycle);
  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const totalPrice = Math.max(0, basePrice - discountAmount);

  // Auto-select plan if provided in URL
  useEffect(() => {
    if (initialPlanId && plans?.length) {
      const plan = plans.find((p) => p.id === initialPlanId);
      if (plan) {
        setSelectedPlanId(initialPlanId);
      }
    }
  }, [initialPlanId, plans]);

  const checkHostnameValidity = (value: string): string | null => {
    if (!value.trim()) return 'Hostname wajib diisi';
    if (value.length < 3) return 'Hostname minimal 3 karakter';
    if (value.length > 63) return 'Hostname maksimal 63 karakter';
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(value)) {
      return 'Hostname hanya boleh huruf, angka, dan strip (-)';
    }
    return null;
  };

  const validateHostname = (value: string): boolean => {
    const error = checkHostnameValidity(value);
    setHostnameError(error || '');
    return !error;
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;

    validateCouponMutation.mutate(
      { code: couponCode.trim(), planId: selectedPlanId || undefined },
      {
        onSuccess: (data) => {
          if (data.valid) {
            setAppliedCoupon(data);
          } else {
            setAppliedCoupon(null);
          }
        },
        onError: () => {
          setAppliedCoupon(null);
        },
      }
    );
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!selectedPlanId;
      case 2:
        return !!selectedImageId;
      case 3:
        return !checkHostnameValidity(hostname);
      case 4:
        return true; // Coupon is optional
      case 5:
        return !!selectedPlanId && !!selectedImageId && !!hostname;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (!selectedPlanId || !selectedImageId || !hostname) return;

    createOrderMutation.mutate({
      planId: selectedPlanId,
      imageId: selectedImageId,
      duration: 1,
      durationUnit: billingCycle,
      hostname: hostname.toLowerCase(),
      couponCode: appliedCoupon?.code,
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Katalog
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
          Buat Pesanan VPS
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Ikuti langkah-langkah berikut untuk membuat pesanan VPS baru
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} steps={STEPS} />

      {/* Step Content */}
      <div className="mb-8">
        {/* Step 1: Select Plan */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Pilih Paket VPS
            </h2>

            {/* Billing Toggle */}
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm text-[var(--text-secondary)]">Periode:</span>
              <div className="flex items-center gap-1 bg-[var(--surface)] p-1 rounded-lg border border-[var(--border)]">
                <button
                  onClick={() => setBillingCycle('MONTHLY')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                    billingCycle === 'MONTHLY'
                      ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Bulanan
                </button>
                <button
                  onClick={() => setBillingCycle('YEARLY')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                    billingCycle === 'YEARLY'
                      ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Tahunan
                </button>
              </div>
            </div>

            {plansLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {plans
                  ?.filter((p) => p.isActive)
                  .map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        selectedPlanId === plan.id
                          ? 'border-[var(--primary)] bg-[var(--primary-muted)] ring-2 ring-[var(--primary-muted)]'
                          : 'border-[var(--border)] bg-[var(--card-bg)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-[var(--text-primary)]">
                          {plan.name}
                        </h3>
                        {selectedPlanId === plan.id && (
                          <div className="w-5 h-5 bg-[var(--primary)] rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-lg font-bold text-[var(--primary)] mb-2">
                        Rp {getPlanPrice(plan, billingCycle).toLocaleString('id-ID')}
                        <span className="text-xs font-normal text-[var(--text-muted)]">
                          /{billingCycle === 'MONTHLY' ? 'bln' : 'thn'}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                        <span>{plan.cpu} vCPU</span>
                        <span>•</span>
                        <span>{formatRam(plan.ram)}</span>
                        <span>•</span>
                        <span>{plan.ssd} GB SSD</span>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select OS Image */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Pilih Sistem Operasi
            </h2>

            {imagesLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {images
                  ?.filter((i) => i.isActive)
                  .map((image) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedImageId(image.id)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        selectedImageId === image.id
                          ? 'border-[var(--primary)] bg-[var(--primary-muted)] ring-2 ring-[var(--primary-muted)]'
                          : 'border-[var(--border)] bg-[var(--card-bg)] hover:border-[var(--border-hover)]'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="w-8 h-8 bg-[var(--surface)] rounded-lg flex items-center justify-center">
                          <Server className="h-4 w-4 text-[var(--text-muted)]" />
                        </div>
                        {selectedImageId === image.id && (
                          <div className="w-5 h-5 bg-[var(--primary)] rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-medium text-[var(--text-primary)]">
                        {image.name}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)]">
                        {image.distribution} {image.version}
                      </p>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Configure Hostname */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Konfigurasi Server
            </h2>

            <Card>
              <CardContent className="pt-6">
                <Input
                  label="Hostname"
                  placeholder="contoh: web-server-01"
                  value={hostname}
                  onChange={(e) => {
                    setHostname(e.target.value);
                    if (hostnameError) validateHostname(e.target.value);
                  }}
                  onBlur={() => validateHostname(hostname)}
                  error={hostnameError}
                  helperText="Hostname akan digunakan sebagai nama server Anda"
                  required
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Apply Coupon */}
        {currentStep === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Kode Kupon (Opsional)
            </h2>

            <Card>
              <CardContent className="pt-6">
                {appliedCoupon ? (
                  <div className="bg-[var(--success-bg)] border border-[var(--success-border)] rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--success)]/20 rounded-lg flex items-center justify-center">
                          <Tag className="h-5 w-5 text-[var(--success)]" />
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">
                            {appliedCoupon.code}
                          </p>
                          <p className="text-sm text-[var(--success)]">
                            Diskon{' '}
                            {appliedCoupon.discountType === 'PERCENTAGE'
                              ? `${appliedCoupon.discountValue}%`
                              : `Rp ${appliedCoupon.discountValue.toLocaleString('id-ID')}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveCoupon}
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="Masukkan kode kupon"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        error={
                          validateCouponMutation.isError
                            ? 'Kode kupon tidak valid'
                            : undefined
                        }
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleApplyCoupon}
                      isLoading={validateCouponMutation.isPending}
                      disabled={!couponCode.trim()}
                    >
                      Terapkan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Review Pesanan
            </h2>

            <div className="space-y-4">
              {/* Selected Plan */}
              <Card>
                <CardHeader>
                  <CardTitle size="sm">Paket VPS</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {selectedPlan && (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">
                          {selectedPlan.name}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)] mt-1">
                          <span className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" /> {selectedPlan.cpu} vCPU
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" /> {formatRam(selectedPlan.ram)}
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" /> {selectedPlan.ssd} GB SSD
                          </span>
                          <span className="flex items-center gap-1">
                            <Wifi className="h-3 w-3" /> {formatBandwidth(selectedPlan.bandwidth)}
                          </span>
                        </div>
                      </div>
                      <Badge>{billingCycle === 'MONTHLY' ? 'Bulanan' : 'Tahunan'}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Selected OS */}
              <Card>
                <CardHeader>
                  <CardTitle size="sm">Sistem Operasi</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {selectedImage && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--surface)] rounded-lg flex items-center justify-center">
                        <Server className="h-5 w-5 text-[var(--text-muted)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          {selectedImage.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {selectedImage.distribution} {selectedImage.version}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle size="sm">Konfigurasi</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Hostname</span>
                    <span className="font-mono text-[var(--text-primary)]">
                      {hostname.toLowerCase()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Price Summary */}
              <Card>
                <CardHeader>
                  <CardTitle size="sm">Ringkasan Pembayaran</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Harga Paket</span>
                    <span className="text-[var(--text-primary)]">
                      Rp {basePrice.toLocaleString('id-ID')}
                    </span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--success)]">
                        Diskon ({appliedCoupon.code})
                      </span>
                      <span className="text-[var(--success)]">
                        - Rp {discountAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-[var(--border)] pt-3 flex justify-between">
                    <span className="font-semibold text-[var(--text-primary)]">
                      Total
                    </span>
                    <span className="font-bold text-lg text-[var(--primary)]">
                      Rp {totalPrice.toLocaleString('id-ID')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-[var(--border)]">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 1}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Kembali
        </Button>

        {currentStep < 5 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Lanjutkan
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed() || createOrderMutation.isPending}
            isLoading={createOrderMutation.isPending}
          >
            Buat Pesanan
          </Button>
        )}
      </div>
    </div>
  );
}
