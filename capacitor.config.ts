import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kaito.getar',
  appName: 'Kaito Whale',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
