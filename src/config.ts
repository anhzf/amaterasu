const appConfig = {
  firebase: {
    emulator: {
      host: 'localhost',
      port: {
        auth: process.env.FIREBASE_AUTH_EMULATOR_HOST?.split(':')[1] ?? '9099',
        firestore: process.env.FIREBASE_FIRESTORE_EMULATOR_HOST?.split(':')[1] ?? '8080',
        storage: process.env.FIREBASE_STORAGE_EMULATOR_HOST?.split(':')[1] ?? '9199',
        functions: process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST?.split(':')[1] ?? '5001',
      },
    },
  },
} as const;

export default appConfig;
