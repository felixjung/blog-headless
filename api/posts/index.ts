import { NowRequestQuery } from '@vercel/node';

import { config } from '../../lib/config';
import { DynamoDB } from '../../lib/dynamo-db';
import { Context, withContext } from '../../middleware/context';
import { handleErrors, HTTPError, StatusCode } from '../../middleware/error';
import { withHeaders } from '../../middleware/headers';
import { BlogPost } from '../../types/post';

type QueryParams = {
  offset?: number;
  limit?: number;
};

function mustParseInt(maybeNumber: string | string[]): number {
  if (Array.isArray(maybeNumber)) {
    throw new Error(`failed to parse number: ${maybeNumber}`);
  }

  const parsed = parseInt(maybeNumber, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`failed to parse number: ${maybeNumber}`);
  }

  return parsed;
}

function parseQueryParams(params: NowRequestQuery): QueryParams {
  const offset = params.offset ? mustParseInt(params.offset) : undefined;
  const limit = params.limit ? mustParseInt(params.limit) : undefined;
  return { offset, limit };
}

async function listPosts({ res, req, logger }: Context) {
  if (req.method !== 'GET') {
    throw new HTTPError(
      'unsupported HTTP method',
      StatusCode.MethodNotAllowed,
      {
        method: req.method,
      },
    );
  }

  const postStorage = new DynamoDB(config.aws);
  let queryParams;

  try {
    queryParams = parseQueryParams(req.query);
  } catch (err) {
    throw new HTTPError('failed to parse query params', StatusCode.BadRequest, {
      query: req.query,
    });
  }

  let posts;
  try {
    posts = await postStorage.listPosts(queryParams.offset, queryParams.limit);
  } catch (err) {
    throw new HTTPError(
      'failed to fetch posts',
      StatusCode.InternalServerError,
      { error: err },
    );
  }

  logger.info('fetched posts', {
    routes: posts.map((p) => `/${p.slug}`),
  });

  const sortedPosts = posts.sort(publishDateCompareFn);

  res.status(200).json({
    data: sortedPosts,
  });
}

function publishDateCompareFn(
  { publishDate: publishDateA }: BlogPost,
  { publishDate: publishDateB }: BlogPost,
): number {
  if (isUndefined(publishDateA) && !isUndefined(publishDateB)) {
    return 1;
  }

  if (!isUndefined(publishDateA) && isUndefined(publishDateB)) {
    return -1;
  }

  if (isUndefined(publishDateA) && isUndefined(publishDateB)) {
    return 0;
  }

  // This should never happen, but the compiler does not agree.
  if (isUndefined(publishDateA) || isUndefined(publishDateB)) {
    return 0;
  }

  const dateA = new Date(publishDateA);
  const dateB = new Date(publishDateB);

  // Somehow type guard for undefined is not working
  if (dateA && dateB && dateA < dateB) {
    return 1;
  }

  if (dateA && dateB && dateA > dateB) {
    return -1;
  }

  return 0;
}

function isUndefined(value: unknown): value is undefined {
  if (typeof value === 'undefined') {
    return true;
  }

  return false;
}

export default withContext(
  handleErrors,
  withHeaders({
    'Cache-Control': 's-maxage=600, stale-while-revalidate',
    'Content-Type': 'application/json',
  }),
  listPosts,
);
