const Module = require('module');
const path = require('path');

// Shim global.jest for standard node runs
global.jest = {
  fn: (impl) => {
    const mock = (...args) => {
      mock.mock.calls.push(args);
      if (impl) return impl(...args);
    };
    mock.mock = { calls: [] };
    mock.mockReturnValue = (val) => {
      impl = () => val;
      return mock;
    };
    mock.mockImplementation = (newImpl) => {
      impl = newImpl;
      return mock;
    };
    return mock;
  }
};

const originalResolveFilename = Module._resolveFilename;
const mockDir = path.resolve(__dirname, '..', '__mocks__');

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'react-native') {
    return path.join(mockDir, 'react-native.js');
  }
  if (request === 'react-native-fs') {
    return path.join(mockDir, 'react-native-fs.js');
  }
  if (request === 'llama.rn') {
    return path.join(mockDir, 'llama.rn.js');
  }
  if (request === '@react-native-async-storage/async-storage') {
    return path.join(mockDir, '@react-native-async-storage/async-storage.js');
  }
  if (request.endsWith('services/secureStorage')) {
    return path.join(mockDir, 'secureStorage.js');
  }
  return originalResolveFilename.apply(this, arguments);
};

// Register @babel/register to transpile ES6 imports/exports on the fly
require('@babel/register').default({
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
  ignore: [/node_modules/]
});

// Run the GPU soak test
require('./gpu_soak.js');
