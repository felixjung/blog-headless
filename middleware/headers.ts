import { Context, NextFn } from './context';

export function withHeaders(headers: { [key: string]: string | number }) {
  return async ({ logger, res }: Context, next: NextFn) => {
    logger.info('adding headers', { headers });

    Object.keys(headers).forEach((key) => {
      res.setHeader(key, headers[key]);
    });

    await next();
  };
}
