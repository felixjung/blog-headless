import { Context, NextFn } from './context';

export enum StatusCode {
  NotFound = 404,
  BadRequest = 400,
  Unauthorized = 401,
  MethodNotAllowed = 405,
  InternalServerError = 500,
}

const statusMessages = {
  [StatusCode.NotFound]: 'Not Found',
  [StatusCode.BadRequest]: 'Bad Request',
  [StatusCode.Unauthorized]: 'Unauthorized',
  [StatusCode.MethodNotAllowed]: 'Method Not Allowed',
  [StatusCode.InternalServerError]: 'Internal Server Error',
};

const NO_CACHE_STATUSES = [StatusCode.NotFound, StatusCode.MethodNotAllowed];

type ErrorData = { [key: string]: unknown };

export class HTTPError extends Error {
  statusCode: StatusCode;

  logMessage: string;

  meta: ErrorData;

  constructor(
    logMessage: string,
    statusCode: StatusCode = 500,
    meta: ErrorData = {},
  ) {
    super();
    this.logMessage = logMessage;
    this.statusCode = statusCode;
    this.meta = meta;
  }
}

export async function handleErrors({ logger, res }: Context, next: NextFn) {
  try {
    await next();
  } catch (e) {
    if (!(e instanceof HTTPError)) {
      logger.error('failed to handle error of unknown type', { error: e });
      res.status(StatusCode.InternalServerError).json({
        message: 'internal server error',
      });
    }

    const err = e as HTTPError;

    logger.error(err.logMessage, { context: err.meta });

    if (NO_CACHE_STATUSES.includes(err.statusCode)) {
      res.setHeader('Cache-Control', 'no-cache');
    }

    res
      .status(err.statusCode)
      .json({ message: statusMessages[err.statusCode] });
  }
}
