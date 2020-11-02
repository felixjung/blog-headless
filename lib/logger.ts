import * as winston from 'winston';

const { combine, timestamp, simple } = winston.format;

export const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: combine(timestamp(), simple()),
    }),
  ],
});
