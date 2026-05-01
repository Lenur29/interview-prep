import { Global, Module } from '@nestjs/common';
import { createCache } from 'cache-manager';
import Keyv from 'keyv';

import { Cache } from 'cache-manager';

export const CACHE_MANAGER = Symbol('CACHE_MANAGER');

@Global()
@Module({
  providers: [
    {
      provide: CACHE_MANAGER,
      useFactory(): Cache {
        const keyv = new Keyv({
          ttl: 60000,
        });

        keyv.serialize = undefined;

        keyv.deserialize = undefined;

        return createCache({ stores: [keyv] });
      },
    },
  ],
  exports: [CACHE_MANAGER],
})
export class CacheModule {}
