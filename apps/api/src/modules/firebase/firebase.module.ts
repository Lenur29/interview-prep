import { Module } from '@nestjs/common';

import { firebaseApp } from './firebase.providers.js';

@Module({
  providers: [firebaseApp],
  exports: [firebaseApp],
})
export class FirebaseModule {}
