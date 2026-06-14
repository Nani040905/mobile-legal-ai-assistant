class MockAsyncStorage {
  constructor() {
    this.storage = new Map();
  }

  async getItem(key) {
    return this.storage.get(key) || null;
  }

  async setItem(key, value) {
    this.storage.set(key, String(value));
  }

  async removeItem(key) {
    this.storage.delete(key);
  }

  async clear() {
    this.storage.clear();
  }

  async multiGet(keys) {
    return keys.map((key) => [key, this.storage.get(key) || null]);
  }

  async multiSet(keyValuePairs) {
    for (const [key, value] of keyValuePairs) {
      this.storage.set(key, String(value));
    }
  }

  async getAllKeys() {
    return Array.from(this.storage.keys());
  }
}

module.exports = new MockAsyncStorage();
