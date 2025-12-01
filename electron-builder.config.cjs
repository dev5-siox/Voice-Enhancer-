/**
 * @type {import('electron-builder').Configuration}
 */
module.exports = {
  appId: 'com.voicepro.app',
  productName: 'VoicePro',
  directories: {
    output: 'release',
    buildResources: 'assets',
  },
  files: [
    'electron/dist/**/*',
    'dist/**/*',
    'package.json',
  ],
  extraMetadata: {
    main: 'electron/dist/main/main.js',
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
    icon: 'assets/icon.ico',
    artifactName: '${productName}-${version}-Windows.${ext}',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'assets/icon.ico',
    uninstallerIcon: 'assets/icon.ico',
    installerHeaderIcon: 'assets/icon.ico',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'VoicePro',
  },
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
    ],
    icon: 'assets/icon.icns',
    artifactName: '${productName}-${version}-Mac-${arch}.${ext}',
    category: 'public.app-category.utilities',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'assets/entitlements.mac.plist',
    entitlementsInherit: 'assets/entitlements.mac.plist',
  },
  dmg: {
    contents: [
      {
        x: 130,
        y: 220,
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications',
      },
    ],
  },
  linux: {
    target: ['AppImage', 'deb'],
    icon: 'assets/icon.png',
    artifactName: '${productName}-${version}-Linux.${ext}',
    category: 'Audio',
  },
  publish: null,
};
