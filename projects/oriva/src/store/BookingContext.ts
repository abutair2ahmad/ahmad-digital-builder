import { createContext } from 'react';
import type { Booking, BookingStatus } from './bookings';

export interface BookingContextValue {
  bookings: Booking[];
  create: (input: Omit<Booking, 'id' | 'createdAt' | 'demo' | 'status'>) => Booking;
  setStatus: (id: string, status: BookingStatus) => void;
  reschedule: (id: string, date: string, time: string) => void;
  remove: (id: string) => void;
  occupiedFor: (staffId: string, date: string) => { start: number; end: number }[];
  resetDemo: () => void;
}

export const BookingContext = createContext<BookingContextValue | null>(null);
