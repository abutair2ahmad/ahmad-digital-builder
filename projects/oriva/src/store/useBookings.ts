import { useContext } from 'react';
import { BookingContext } from './BookingProvider';

export function useBookings() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBookings must be used inside <BookingProvider>');
  return ctx;
}
