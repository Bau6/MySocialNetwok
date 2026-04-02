import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.socialnetwork.app',
    appName: 'Social Network',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    },
    android: {
        buildOptions: {
            keystorePath: 'keystore.jks',
            keystoreAlias: 'socialnetwork',
            keystorePassword: 'password123',
            keystoreAliasPassword: 'password123'
        }
    }
};

export default config;