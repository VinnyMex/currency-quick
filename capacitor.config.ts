import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.currencyquick.app',
  appName: 'Currency Quick',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
