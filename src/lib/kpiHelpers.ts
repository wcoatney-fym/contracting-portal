export function weeksSince(dateCreated: string): number {
  const created = new Date(dateCreated + 'T00:00:00Z');
  const now = new Date();
  const ms = now.getTime() - created.getTime();
  return Math.max(1, Math.floor(ms / (7 * 24 * 60 * 60 * 1000)));
}

export function monthsSince(dateCreated: string): number {
  const created = new Date(dateCreated + 'T00:00:00Z');
  const now = new Date();
  const months =
    (now.getUTCFullYear() - created.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - created.getUTCMonth());
  return Math.max(1, months);
}

export function avgContactsPerWeek(totalContacts: number, dateCreated: string | null, dbaClientCount = 0): number {
  const newContacts = Math.max(0, totalContacts - dbaClientCount);
  if (!dateCreated) return newContacts;
  return Math.round(newContacts / weeksSince(dateCreated));
}

export function avgContactsPerMonth(totalContacts: number, dateCreated: string | null, dbaClientCount = 0): number {
  const newContacts = Math.max(0, totalContacts - dbaClientCount);
  if (!dateCreated) return newContacts;
  return Math.round(newContacts / monthsSince(dateCreated));
}
