import ElectronStore from 'electron-store';

class StoreManager {
  private store: any;

  constructor() {
    this.store = new ElectronStore();
  }

  get<T = any>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  set<T = any>(key: string, value: T): void {
    this.store.set(key, value);
  }

  remove(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const storeManager = new StoreManager();