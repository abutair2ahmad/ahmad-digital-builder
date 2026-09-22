export interface AuthUser {
  id: string;
  email: string;
}

export type AuthResult =
  | { ok: true; user: AuthUser; needsEmailConfirmation?: false }
  | { ok: true; user: null; needsEmailConfirmation: true }
  | { ok: false; error: string };

export interface AuthProvider {
  signUp(input: { email: string; password: string; fullName: string }): Promise<AuthResult>;
  signIn(input: { email: string; password: string }): Promise<AuthResult>;
  signOut(): Promise<void>;
  /** The signed-in user for the current request, from cookies. */
  getUser(): Promise<AuthUser | null>;
  /** Privileged user creation (seeding, scripts). */
  adminCreateUser(input: { email: string; password: string; fullName: string }): Promise<AuthUser>;
}
