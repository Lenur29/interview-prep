import { Inject, type Provider, Scope } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { applicationDefault, cert, initializeApp, type ServiceAccount } from 'firebase-admin/app';

import { GcpConfig } from '@/config/index.js';

export const FIREBASE_APP = Symbol('FIREBASE_APP');

export const InjectFirebaseApp = () => Inject(FIREBASE_APP);

export const firebaseApp: Provider = {
  inject: [GcpConfig.KEY],
  provide: FIREBASE_APP,
  scope: Scope.DEFAULT,
  useFactory: (gcpConfig: ConfigType<typeof GcpConfig>) => {
    return initializeApp({
      projectId: gcpConfig.projectId,
      credential: gcpConfig.serviceAccountKey
        ? cert(gcpConfig.serviceAccountKey as ServiceAccount)
        : applicationDefault(),
    });
  },
};
