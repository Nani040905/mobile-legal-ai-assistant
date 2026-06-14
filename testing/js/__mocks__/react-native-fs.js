module.exports = {
  DocumentDirectoryPath: '/mock/DocumentDirectoryPath',
  ExternalDirectoryPath: '/mock/ExternalDirectoryPath',
  exists: jest.fn(() => Promise.resolve(false)),
  readFile: jest.fn(() => Promise.resolve('')),
  writeFile: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve())
};
