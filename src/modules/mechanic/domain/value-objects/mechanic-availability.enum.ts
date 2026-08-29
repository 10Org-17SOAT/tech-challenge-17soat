/**
 * Availability state of a mechanic. OFF_DUTY is part of the enum but has no
 * transitions implemented in this phase (manual availability control is
 * future work) — it documents the domain and keeps the state machine
 * forward-compatible.
 */
export const MECHANIC_AVAILABILITY = {
  Available: 'AVAILABLE',
  Allocated: 'ALLOCATED',
  OffDuty: 'OFF_DUTY',
  Inactive: 'INACTIVE',
} as const;

export type MechanicAvailability =
  (typeof MECHANIC_AVAILABILITY)[keyof typeof MECHANIC_AVAILABILITY];
