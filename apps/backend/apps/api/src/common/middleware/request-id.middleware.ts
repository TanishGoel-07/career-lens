import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

declare module 'express' {
  interface Request {
    requestId: string;
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header('x-request-id');
    req.requestId = incoming ?? uuid();
    res.setHeader('x-request-id', req.requestId);
    next();
  }
}
