import { Injectable, NestMiddleware } from '@nestjs/common';
import bodyParser from 'body-parser';
import { Request, Response } from 'express';

@Injectable()
export class JsonBodyMiddleware implements NestMiddleware {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  use(req: Request, res: Response, next: () => any) {
    bodyParser.json()(req, res, next);
  }
}
