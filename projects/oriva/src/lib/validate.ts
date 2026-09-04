export interface ContactForm {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export type FormErrors = Partial<Record<keyof ContactForm, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
// Accepts +971 50 123 4567, 0501234567, (04) 018-2200 …
const PHONE = /^\+?[\d\s().-]{7,20}$/;

export function validateField(field: keyof ContactForm, value: string): string | undefined {
  const v = value.trim();
  switch (field) {
    case 'name':
      if (!v) return 'Please tell us your name.';
      if (v.length < 2) return 'That looks a little short.';
      return undefined;
    case 'phone':
      if (!v) return 'We confirm every appointment by phone.';
      if (!PHONE.test(v) || v.replace(/\D/g, '').length < 7) return 'Please check this number.';
      return undefined;
    case 'email':
      if (!v) return 'Your confirmation is sent here.';
      if (!EMAIL.test(v)) return 'That email address looks incomplete.';
      return undefined;
    default:
      return undefined;
  }
}

export function validateForm(form: ContactForm): FormErrors {
  const errors: FormErrors = {};
  (['name', 'phone', 'email'] as const).forEach((field) => {
    const error = validateField(field, form[field]);
    if (error) errors[field] = error;
  });
  return errors;
}
