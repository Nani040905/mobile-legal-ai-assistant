module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  moduleNameMapper: {
    // Redirect secureStorage to mock first
    '^.*/services/secureStorage$': '<rootDir>/__mocks__/secureStorage.js',
    
    // Redirect all LegalAI source imports to the actual files
    '^../../../LegalAI/src/(.*)$': '<rootDir>/../../LegalAI/src/$1',
    '^../../src/(.*)$': '<rootDir>/../../LegalAI/src/$1',
    '^../src/(.*)$': '<rootDir>/../../LegalAI/src/$1',
    
    // Redirect native module imports to our mocks
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^react-native-fs$': '<rootDir>/__mocks__/react-native-fs.js',
    '^llama.rn$': '<rootDir>/__mocks__/llama.rn.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/@react-native-async-storage/async-storage.js'
  },
  moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  }
};
