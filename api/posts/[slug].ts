import { config } from '../../lib/config';
import { DynamoDB } from '../../lib/dynamo-db';
import { Context, withContext } from '../../middleware/context';
import { handleErrors, HTTPError, StatusCode } from '../../middleware/error';
import { withHeaders } from '../../middleware/headers';

function mustParseStringQuery(maybeString: string[] | string): string {
  if (typeof maybeString !== 'string' || maybeString.length === 0) {
    throw new Error(`failed to parse slug`);
  }

  return maybeString;
}

async function getPost({ res, req }: Context) {
  if (req.method !== 'GET') {
    throw new HTTPError(
      'unsupported HTTP method',
      StatusCode.MethodNotAllowed,
      {
        method: req.method,
      },
    );
  }

  let slug;
  try {
    slug = mustParseStringQuery(req.query.slug);
  } catch (err) {
    throw new HTTPError('failed to parse slug', StatusCode.BadRequest, {
      slug: req.query.slug,
    });
  }

  const postStorage = new DynamoDB(config.aws);
  const post = await postStorage.getPost(slug);

  if (post === null) {
    throw new HTTPError('failed to find post', StatusCode.NotFound, { slug });
  }

  res.status(200).json({
    data: post,
  });
}

export default withContext(
  handleErrors,
  withHeaders({
    'Cache-Control': 's-maxage=60, stale-while-revalidate',
    'Content-Type': 'application/json',
  }),
  getPost,
);
