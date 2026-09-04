import type { Doctor, Treatment } from '@/lib/types';

export interface BookingDraftState {
  treatmentId: string | null;
  doctorId: string | null;
  date: string | null;
  startTime: string | null;
  patientName: string;
  phone: string;
  email: string;
  note: string;
}

export interface ConfirmedBooking {
  reference: string;
  date: string;
  startTime: string;
  endTime: string;
  patientName: string;
  treatment: string;
  doctor: string;
  status: string;
}

export interface BookingResponse {
  booking: ConfirmedBooking;
  manageUrl: string;
  integrations: { calendar: 'live' | 'simulated'; whatsapp: 'live' | 'simulated' };
}

export interface StepProps {
  draft: BookingDraftState;
  treatments: Treatment[];
  doctors: Doctor[];
  onChange: (patch: Partial<BookingDraftState>) => void;
  onNext: () => void;
}

export const STEPS = [
  { id: 'treatment', label: 'Treatment' },
  { id: 'doctor', label: 'Clinician' },
  { id: 'date', label: 'Date' },
  { id: 'time', label: 'Time' },
  { id: 'details', label: 'Details' },
  { id: 'review', label: 'Review' },
  { id: 'confirmation', label: 'Confirmed' },
] as const;

export type StepId = (typeof STEPS)[number]['id'];
