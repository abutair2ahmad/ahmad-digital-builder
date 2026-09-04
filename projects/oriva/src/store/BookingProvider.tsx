import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  buildSeedBookings,
  makeId,
  occupiedRanges,
  STORAGE_KEY,
  type Booking,
  type BookingStatus,
  type PersistedState,
} from './bookings';
import { todayISO } from '../lib/time';

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

function read(): Booking[] {
  const today = todayISO();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed?.seededOn === today && Array.isArray(parsed.bookings)) return parsed.bookings;
      // A day has passed since the demo data was generated — refresh the seeded
      // rows so "today" is populated, but keep anything the visitor booked.
      const mine = (parsed?.bookings ?? []).filter((b) => !b.demo);
      return [...buildSeedBookings(), ...mine];
    }
  } catch {
    /* corrupted or unavailable storage — fall through to a clean seed */
  }
  return buildSeedBookings();
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>(() => read());

  useEffect(() => {
    try {
      const payload: PersistedState = { seededOn: todayISO(), bookings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* private mode / quota — the demo still works in memory */
    }
  }, [bookings]);

  const create: BookingContextValue['create'] = useCallback((input) => {
    const booking: Booking = {
      ...input,
      id: makeId(),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      demo: false,
    };
    setBookings((prev) => [...prev, booking]);
    return booking;
  }, []);

  const setStatus = useCallback((id: string, status: BookingStatus) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
  }, []);

  const reschedule = useCallback((id: string, date: string, time: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, date, time, status: 'confirmed' } : b)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const occupiedFor = useCallback(
    (staffId: string, date: string) => occupiedRanges(bookings, staffId, date),
    [bookings],
  );

  const resetDemo = useCallback(() => {
    setBookings(buildSeedBookings());
  }, []);

  const value = useMemo(
    () => ({ bookings, create, setStatus, reschedule, remove, occupiedFor, resetDemo }),
    [bookings, create, setStatus, reschedule, remove, occupiedFor, resetDemo],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}
