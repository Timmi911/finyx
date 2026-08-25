import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.finyx.moneymap',
  appName: 'MoneyMap',
  webDir: 'dist',
  backgroundColor: '#F4F5F7',
  android: {
    backgroundColor: '#F4F5F7',
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
