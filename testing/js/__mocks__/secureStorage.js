const AsyncStorage = require('@react-native-async-storage/async-storage');

module.exports = {
  secureStorage: {
    getItem: jest.fn(async (name) => {
      return AsyncStorage.getItem(name);
    }),
    setItem: jest.fn(async (name, value) => {
      return AsyncStorage.setItem(name, value);
    }),
    removeItem: jest.fn(async (name) => {
      return AsyncStorage.removeItem(name);
    })
  }
};
