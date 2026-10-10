const path = require('node:path');
const { devDependencies } = require('../../package.json');

module.exports = {
  appId: 'com.celeste.splits',
  productName: 'Celeste Splits',
  electronVersion: devDependencies.electron,
  directories: {
    app: __dirname,
    output: path.resolve(__dirname, '../../release/celeste-splits'),
  },
  files: ['dist/**/*', 'electron/**/*', 'package.json'],
  win: {
    signAndEditExecutable: false,
    target: [{ target: 'nsis', arch: ['x64'] }],
  },
};
