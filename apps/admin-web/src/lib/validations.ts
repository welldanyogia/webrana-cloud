import { z } from 'zod';

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
  password: z
    .string()
    .min(1, 'Password wajib diisi')
    .min(6, 'Password minimal 6 karakter'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Payment status update validation schema
 */
export const paymentStatusSchema = z.object({
  status: z.enum(['PAID', 'FAILED']),
  reason: z.string().optional(),
});

export type PaymentStatusFormData = z.infer<typeof paymentStatusSchema>;
