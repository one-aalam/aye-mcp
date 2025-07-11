import { Client, Stronghold, Store } from '@tauri-apps/plugin-stronghold';
import { appDataDir } from '@tauri-apps/api/path';

interface StrongholdStore {
  insert: (key: string, value: string) => Promise<void>;
  get: (key: string) => Promise<string | null>;
  remove: (key: string) => Promise<void>;
}

export class StrongholdStoreImpl implements StrongholdStore {
  stronghold: Stronghold | undefined;
  vault: Client | undefined;
  store: Store | undefined;
  constructor() {

  }
  async init(clientName: string) {
    const vaultPath = `${await appDataDir()}/aye-mcp-vault.hold`;
    this.stronghold = await Stronghold.load(vaultPath, import.meta.env.VITE_STRONGHOLD_PASSWORD);
    try {
      this.vault = await this.stronghold.loadClient(clientName);
    } catch {
      this.vault = await this.stronghold.createClient(clientName);
    }
    this.store = this.vault.getStore();
  }
  async insert(key: string, value: string): Promise<void> {
    if(!this.store || !this.stronghold) {
      throw new Error('Stronghold store not initialized');
    }
    const keyData = Array.from(new TextEncoder().encode(value));
    await this.store.insert(key, keyData);
    await this.stronghold.save();
  }
  async get(key: string): Promise<string | null> {
    if(!this.store || !this.stronghold) {
      throw new Error('Stronghold store not initialized');
    }
    const keyData = await this.store.get(key);
    if (keyData && keyData.length > 0) {
      const value = new TextDecoder().decode(new Uint8Array(keyData));
      return value;
    }
    return null;
  }
  async getAll(keys: string[]): Promise<{ key: string; value: string | null }[]> {
    if (keys && keys.length > 0) {
      const values = keys.map(async (key) => {
        const value = await this.get(key);
        return value ? { key, value }: { key, value: null };
      });
      return Promise.all(values);
    }
    return [];
  }
  async remove(key: string): Promise<void> {
    if(!this.store || !this.stronghold) {
      throw new Error('Stronghold store not initialized');
    }
    await this.store.remove(key);
    await this.stronghold.save();
  }
}

export class StrongholdStoreFactory {
  static instance: StrongholdStoreImpl;
  static async getInstance(clientName: string) {
    if (!this.instance) {
      this.instance = new StrongholdStoreImpl();
      await this.instance.init(clientName);
    }
    return this.instance;
  }
}