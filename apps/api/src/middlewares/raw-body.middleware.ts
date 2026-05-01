import { Injectable, NestMiddleware } from '@nestjs/common';
import bodyParser from 'body-parser';
import { Request, Response } from 'express';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  use(req: Request, res: Response, next: () => any) {
    console.log('RawBodyMiddleware applied');
    bodyParser.raw({
      type: '*/*',
    })(req, res, next);
  }
}
