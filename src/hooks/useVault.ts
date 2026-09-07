import { create } from "zustand";
import type { VaultEntryDecrypted, VaultCategory } from "@/types";

export interface VaultKeys {
  encryptionKey: CryptoKey;
  verifierKey: CryptoKey;
  salt: string;
}

interface VaultState {
  entries: VaultEntryDecrypted[];
  keys: VaultKeys | null;
  searchQuery: string;
  selectedCategory: VaultCategory | "all";
  isLoading: boolean;

  setKeys: (keys: VaultKeys) => void;
  clearKeys: () => void;
  setEntries: (entries: VaultEntryDecrypted[]) => void;
  addEntry: (entry: VaultEntryDecrypted) => void;
  updateEntry: (entry: VaultEntryDecrypted) => void;
  removeEntry: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: VaultCategory | "all") => void;
  setIsLoading: (loading: boolean) => void;

  filteredEntries: () => VaultEntryDecrypted[];
}

export const useVaultStore = create<VaultState>((set, get) => ({
  entries: [],
  keys: null,
  searchQuery: "",
  selectedCategory: "all",
  isLoading: false,

  setKeys: (keys) => set({ keys }),
  clearKeys: () => set({ keys: null, entries: [] }),
  setEntries: (entries) => set({ entries }),
  addEntry: (entry) => set((state) => ({ entries: [...state.entries, entry] })),
  updateEntry: (entry) =>
    set((state) => ({
      entries: state.entries.map((e) => (e.id === entry.id ? entry : e)),
    })),
  removeEntry: (id) =>
    set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  filteredEntries: () => {
    const { entries, searchQuery, selectedCategory } = get();
    return [...entries]
      .filter((entry) => {
        const matchesSearch =
          !searchQuery ||
          entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.url?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === "all" || entry.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  },
}));

export function useUnlockKeys() {
  return useVaultStore((s) => s.keys);
}
