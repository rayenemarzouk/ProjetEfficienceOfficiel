// Centralisation des emails super-admin — source unique de vérité
export const RAYAN_EMAIL = 'maarzoukrayan3@gmail.com';
export const YOUNIS_EMAIL = 'younis@efficience.fr';
export const SUPER_ADMIN_EMAILS = [RAYAN_EMAIL, YOUNIS_EMAIL];

export function isSuperAdmin(user) {
  return !!user?.email && SUPER_ADMIN_EMAILS.includes(user.email);
}
