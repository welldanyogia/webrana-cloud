import { OrderStatus } from '@prisma/client';

/**
 * Order State Machine
 * 
 * NEW Balance-Based Flow (Phase 4B):
 * 
 * PENDING -> PROCESSING (balance deducted)
 * PENDING -> FAILED (balance deduction failed)
 * PENDING -> CANCELED (user canceled)
 * PROCESSING -> PROVISIONING (provisioning started)
 * PROCESSING -> FAILED (provisioning setup failed)
 * PROVISIONING -> ACTIVE (droplet ready)
 * PROVISIONING -> FAILED (droplet failed/timeout, balance refunded)
 * ACTIVE -> EXPIRING_SOON (approaching expiry)
 * ACTIVE -> SUSPENDED (expired, monthly/yearly grace)
 * ACTIVE -> TERMINATED (user deleted)
 * EXPIRING_SOON -> ACTIVE (auto-renewed)
 * EXPIRING_SOON -> EXPIRED (past expiry)
 * EXPIRED -> ACTIVE (manual renewal)
 * EXPIRED -> SUSPENDED (grace period started)
 * EXPIRED -> TERMINATED (daily - no grace)
 * SUSPENDED -> TERMINATED (grace period ended)
 * 
 * Legacy Flow (backward compatibility):
 * PENDING_PAYMENT -> PAID (admin override)
 * PAID -> PROVISIONING (automatic after payment)
 * 
 * State Diagram:
 * 
 *     PENDING ──[balance deducted]──► PROCESSING ──[start prov]──► PROVISIONING
 *        │                                │                          │      │
 *        │                                │                          │      │
 *        ▼                                ▼                          ▼      ▼
 *    CANCELED                          FAILED                    ACTIVE  FAILED
 *                                                                   │      (refund)
 *                                                                   ▼
 *                                                            EXPIRING_SOON
 *                                                                   │
 *                                                                   ▼
 *                                                               EXPIRED
 *                                                                   │
 *                                                    [daily]────────┴────────[monthly/yearly]
 *                                                       │                           │
 *                                                       ▼                           ▼
 *                                                  TERMINATED                  SUSPENDED
 *                                                                                   │
 *                                                                                   ▼
 *                                                                             TERMINATED
 */

type TransitionMap = {
  [K in OrderStatus]?: OrderStatus[];
};

const VALID_TRANSITIONS: TransitionMap = {
  // New balance-based flow
  [OrderStatus.PENDING]: [
    OrderStatus.PROCESSING,  // Balance deducted successfully
    OrderStatus.FAILED,      // Balance deduction failed
    OrderStatus.CANCELED,    // User canceled before payment
  ],
  [OrderStatus.PROCESSING]: [
    OrderStatus.PROVISIONING,  // Provisioning started
    OrderStatus.FAILED,        // Provisioning setup failed
  ],
  [OrderStatus.PROVISIONING]: [
    OrderStatus.ACTIVE,  // VPS ready
    OrderStatus.FAILED,  // Provisioning failed (balance refunded)
  ],
  [OrderStatus.ACTIVE]: [
    OrderStatus.EXPIRING_SOON,  // Approaching expiry
    OrderStatus.SUSPENDED,      // Expired (grace period)
    OrderStatus.TERMINATED,     // User deleted or admin terminated
  ],
  [OrderStatus.EXPIRING_SOON]: [
    OrderStatus.ACTIVE,     // Auto-renewed or manual renewal
    OrderStatus.EXPIRED,    // Past expiry, no renewal
  ],
  [OrderStatus.EXPIRED]: [
    OrderStatus.ACTIVE,      // Manual renewal or late auto-renew
    OrderStatus.SUSPENDED,   // Monthly/yearly grace period started
    OrderStatus.TERMINATED,  // Daily - no grace period
  ],
  [OrderStatus.SUSPENDED]: [
    OrderStatus.ACTIVE,      // Reactivated (e.g., payment received)
    OrderStatus.TERMINATED,  // Grace period ended
  ],
  
  // Legacy flow (backward compatibility)
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.PAID,
    OrderStatus.CANCELED,
    OrderStatus.PROCESSING,  // New flow bridge
  ],
  [OrderStatus.PAID]: [
    OrderStatus.PROVISIONING,
  ],
  
  // Terminal states - no valid transitions (except admin retry)
  [OrderStatus.TERMINATED]: [],
  [OrderStatus.FAILED]: [
    OrderStatus.PROCESSING,  // Admin retry provisioning (manual recovery)
  ],
  [OrderStatus.CANCELED]: [],
};

export class OrderStateMachine {
  /**
   * Check if a transition from currentStatus to newStatus is valid
   */
  static isValidTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus
  ): boolean {
    const validNextStates = VALID_TRANSITIONS[currentStatus] || [];
    return validNextStates.includes(newStatus);
  }

  /**
   * Get all valid next states from the current status
   */
  static getValidNextStates(currentStatus: OrderStatus): OrderStatus[] {
    return VALID_TRANSITIONS[currentStatus] || [];
  }

  /**
   * Check if the current status is a terminal state (no further transitions)
   */
  static isTerminalState(status: OrderStatus): boolean {
    const validNextStates = VALID_TRANSITIONS[status] || [];
    return validNextStates.length === 0;
  }

  /**
   * Get human-readable description of a transition
   */
  static getTransitionDescription(
    from: OrderStatus,
    to: OrderStatus
  ): string {
    const transitions: Record<string, string> = {
      // New balance-based flow
      [`${OrderStatus.PENDING}->${OrderStatus.PROCESSING}`]: 'Balance deducted, processing started',
      [`${OrderStatus.PENDING}->${OrderStatus.FAILED}`]: 'Balance deduction failed',
      [`${OrderStatus.PENDING}->${OrderStatus.CANCELED}`]: 'Order canceled',
      [`${OrderStatus.PROCESSING}->${OrderStatus.PROVISIONING}`]: 'VPS provisioning started',
      [`${OrderStatus.PROCESSING}->${OrderStatus.FAILED}`]: 'Provisioning setup failed',
      [`${OrderStatus.PROVISIONING}->${OrderStatus.ACTIVE}`]: 'VPS provisioned successfully',
      [`${OrderStatus.PROVISIONING}->${OrderStatus.FAILED}`]: 'Provisioning failed, balance refunded',
      [`${OrderStatus.ACTIVE}->${OrderStatus.EXPIRING_SOON}`]: 'VPS approaching expiration',
      [`${OrderStatus.ACTIVE}->${OrderStatus.SUSPENDED}`]: 'VPS suspended due to expiration',
      [`${OrderStatus.ACTIVE}->${OrderStatus.TERMINATED}`]: 'VPS terminated',
      [`${OrderStatus.EXPIRING_SOON}->${OrderStatus.ACTIVE}`]: 'VPS renewed successfully',
      [`${OrderStatus.EXPIRING_SOON}->${OrderStatus.EXPIRED}`]: 'VPS expired',
      [`${OrderStatus.EXPIRED}->${OrderStatus.ACTIVE}`]: 'VPS reactivated after renewal',
      [`${OrderStatus.EXPIRED}->${OrderStatus.SUSPENDED}`]: 'VPS suspended (grace period)',
      [`${OrderStatus.EXPIRED}->${OrderStatus.TERMINATED}`]: 'VPS terminated (no grace period)',
      [`${OrderStatus.SUSPENDED}->${OrderStatus.ACTIVE}`]: 'VPS reactivated',
      [`${OrderStatus.SUSPENDED}->${OrderStatus.TERMINATED}`]: 'VPS terminated (grace period ended)',
      
      // Legacy flow
      [`${OrderStatus.PENDING_PAYMENT}->${OrderStatus.PAID}`]: 'Payment verified',
      [`${OrderStatus.PENDING_PAYMENT}->${OrderStatus.CANCELED}`]: 'Order canceled',
      [`${OrderStatus.PENDING_PAYMENT}->${OrderStatus.PROCESSING}`]: 'Migrated to balance-based flow',
      [`${OrderStatus.PAID}->${OrderStatus.PROVISIONING}`]: 'Provisioning started',
      
      // Admin retry
      [`${OrderStatus.FAILED}->${OrderStatus.PROCESSING}`]: 'Admin triggered retry provisioning',
    };
    return transitions[`${from}->${to}`] || `Status changed from ${from} to ${to}`;
  }
}
