import { mkdir, readFile, writeFile } from 'fs/promises';
import { homedir } from 'os';
import path from 'path';

const STORAGE_DIR = path.join(homedir(), '.config', 'raycast-quick-event');
const STORAGE_FILE = path.join(STORAGE_DIR, 'recent-invitees.json');
const MAX_INVITEES = 50;

const sanitizeList = (data: unknown): string[] => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''))
    .filter((value) => value.length > 0);
};

export async function getRecentInvitees(): Promise<string[]> {
  try {
    const buffer = await readFile(STORAGE_FILE, 'utf8');
    return sanitizeList(JSON.parse(buffer));
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    console.error('Unable to read recent invitees', error);
    return [];
  }
}

export async function saveRecentInvitees(invitees: string[]): Promise<void> {
  const normalized = sanitizeList(invitees).slice(0, MAX_INVITEES);

  try {
    await mkdir(STORAGE_DIR, { recursive: true });
    await writeFile(STORAGE_FILE, JSON.stringify(normalized, null, 2));
  } catch (error) {
    console.error('Unable to store recent invitees', error);
  }
}
