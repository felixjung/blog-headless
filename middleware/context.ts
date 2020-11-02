import { NowRequest, NowResponse } from '@vercel/node';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';

import { config, Config } from '../lib/config';
import { logger } from '../lib/logger';

export type Context = {
  req: NowRequest;
  res: NowResponse;
  logger: Logger;
  id: string;
  config: Config;
};

export type NextFn = () => Promise<void>;

type MiddlewareFn = (ctx: Context, next: NextFn) => Promise<void>;

export function withContext(entry: MiddlewareFn, ...rest: MiddlewareFn[]) {
  return async (req: NowRequest, res: NowResponse) => {
    const id = uuidv4();
    const reqLogger = logger.child({
      label: id,
    });
    const ctx: Context = {
      req,
      res,
      id,
      logger: reqLogger,
      config,
    };

    const nextFn = rest
      .reverse()
      .reduce(
        (next: NextFn, middleware) => () => middleware(ctx, next),
        (() => {}) as NextFn,
      );

    await entry(ctx, nextFn);
  };
}
