/** Only Pharos University emails may use Studia. */
export const ALLOWED_EMAIL_DOMAIN = "pua.edu.eg";

export function isAllowedUniversityEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return new RegExp(`^[^@\\s]+@${ALLOWED_EMAIL_DOMAIN.replace(/\./g, "\\.")}$`, "i").test(
    email.trim(),
  );
}
