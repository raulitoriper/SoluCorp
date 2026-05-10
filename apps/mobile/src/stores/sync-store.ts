import { create } from 'zustand';
import { getQueueCounts } from '../db/sync-queue';

interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  sentCount: number;
  setOnline: (online: boolean) => void;
  refreshCounts: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: true,
  pendingCount: 0,
  failedCount: 0,
  sentCount: 0,

  setOnline: (online) => set({ isOnline: online }),

  refreshCounts: async () => {
    try {
      const counts = await getQueueCounts();
      set({ pendingCount: counts.pending, failedCount: counts.failed, sentCount: counts.sent });
    } catch {}
  },
}));
