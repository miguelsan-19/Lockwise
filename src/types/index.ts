export interface VaultEntry {
  id: string;
  userId: string;
  title: string;
  ciphertext: string;
  iv: string;
  authTag: string;
  encTitle: string | null;
  encUrl: string | null;
  encCategory: string | null;
  category: VaultCategory | null;
  url: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultEntryDecrypted {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string | null;
  notes: string | null;
  category: VaultCategory | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultEntryCreate {
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  category?: VaultCategory;
}

export type VaultCategory =
  | "social"
  | "email"
  | "finance"
  | "shopping"
  | "work"
  | "other";

export interface User {
  id: string;
  email: string;
}
