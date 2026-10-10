const path = require('node:path');
const { devDependencies } = require('../../package.json');

module.exports = {
  appId: 'com.celeste.gamepad',
  productName: 'Gamepad Inputs',
  electronVersion: devDependencies.electron,
  directories: {
    app: __dirname,
    output: path.resolve(__dirname, '../../release/gamepad'),
  },
  files: ['dist/**/*', 'electron/**/*', 'package.json'],
  win: {
    signAndEditExecutable: false,
    target: [{ target: 'nsis', arch: ['x64'] }],
  },
};
