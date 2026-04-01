// Allowed email domains for magic link login.
// Add client or partner domains here to grant access.
const ALLOWED_DOMAINS = [
  "shownmedia.com",
];

const ADMIN_EMAILS = [
  "alejandro@shownmedia.com",
  "mitchell@shownmedia.com",
  "maya@shownmedia.com",
  "andy@shownmedia.com",
  "matt@shownmedia.com",
];

export function isAllowedEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
