const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "rizwanachoo123@gmail.com").toLowerCase();

export function isOwner(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === OWNER_EMAIL;
}
