'use client';

import type { PaymentMethod } from '@/lib/types';

export interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
  landmark: string;
  notes: string;
  payment_method: PaymentMethod;
}

const KEY = 'jamra.customer.v1';
export const EMPTY_CUSTOMER: CustomerDetails = { name: '', phone: '', address: '', landmark: '', notes: '', payment_method: 'cash' };

/** Remembered on this device only, for the next order. Notes are not kept. */
export function loadCustomer(): CustomerDetails {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_CUSTOMER;
    const v = JSON.parse(raw) as Partial<CustomerDetails>;
    const str = (x: unknown) => (typeof x === 'string' ? x.slice(0, 300) : '');
    return {
      name: str(v.name),
      phone: str(v.phone),
      address: str(v.address),
      landmark: str(v.landmark),
      notes: '',
      payment_method: v.payment_method === 'card' || v.payment_method === 'bit' ? v.payment_method : 'cash',
    };
  } catch {
    return EMPTY_CUSTOMER;
  }
}

export function saveCustomer(c: CustomerDetails) {
  try {
    const { notes: _notes, ...kept } = c;
    void _notes;
    window.localStorage.setItem(KEY, JSON.stringify(kept));
  } catch {
    // ignore: remembering is a convenience
  }
}
