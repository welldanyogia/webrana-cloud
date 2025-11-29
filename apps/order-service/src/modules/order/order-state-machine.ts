import { OrderStatus } from '@prisma/client';

/**
 * Order State Machine
 * 
 * Valid transitions per PRD Section 10.4:
 * 
 * PENDING_PAYMENT -> PAID (admin override)
 * PENDING_PAYMENT -> PAYMENT_FAILED (admin override)
 * PENDING_PAYMENT -> CANCELED (admin/future: user)
 * PAID -> PROVISIONING (automatic after payment)
 * PROVISIONING -> ACTIVE (system - droplet ready)
 * PROVISIONING -> FAILED (system - droplet failed/timeout)
 * 
 * State Diagram:
 * 
 * PENDING_PAYMENT ──[admin mark PAID]──► PAID
 *        │                                │
 *        │                                ▼
 *        │                          PROVISIONING
 *        │                           │       │
 *        │            [success]◄─────┘       └─────►[failed]
 *        │                │                            │
 *        ▼                ▼                            ▼
 *    CANCELED          ACTIVE                       FAILED
 */

type TransitionMap = {
  [K in OrderStatus]?: OrderStatus[];
};

const VALID_TRANSITIONS: TransitionMap = {
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.PAID,
    OrderStatus.CANCELED,
    // Note: PAYMENT_FAILED is handled as a separate status tracking
    // but the order itself stays at PENDING_PAYMENT or moves to CANCELED
  ],
  [OrderStatus.PAID]: [
    OrderStatus.PROVISIONING,
  ],
  [OrderStatus.PROVISIONING]: [
    OrderStatus.ACTIVE,
    OrderStatus.FAILED,
  ],
  // Terminal states - no valid transitions
  [OrderStatus.ACTIVE]: [],
  [OrderStatus.FAILED]: [],
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
      [`${OrderStatus.PENDING_PAYMENT}->${OrderStatus.PAID}`]: 'Payment verified',
      [`${OrderStatus.PENDING_PAYMENT}->${OrderStatus.CANCELED}`]: 'Order canceled',
      [`${OrderStatus.PAID}->${OrderStatus.PROVISIONING}`]: 'Provisioning started',
      [`${OrderStatus.PROVISIONING}->${OrderStatus.ACTIVE}`]: 'Droplet provisioned successfully',
      [`${OrderStatus.PROVISIONING}->${OrderStatus.FAILED}`]: 'Provisioning failed',
    };
    return transitions[`${from}->${to}`] || `Status changed from ${from} to ${to}`;
  }
}
