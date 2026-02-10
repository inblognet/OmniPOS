import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export function useCurrency() {
  const settings = useLiveQuery(() => db.settings.get(1));
  // Return the saved currency, or fallback to '$' if loading/not set
  return settings?.currency || '$';
}