import crypto from 'crypto';

import { NowRequest } from '@vercel/node';

import { fetchPosts } from '../lib/github';
import { config, GitHubConfig } from '../lib/config';
import { BlogPost } from '../types/post';
import { DynamoDB } from '../lib/dynamo-db';
import { handleErrors, HTTPError, StatusCode } from '../middleware/error';
import { withContext, Context } from '../middleware/context';

function isGitHubWebhook(cfg: GitHubConfig, req: NowRequest): boolean {
  if (!req.body) {
    return false;
  }

  const header = 'x-hub-signature-256';
  const sha = crypto
    .createHmac('sha256', cfg.webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  const expectedSignature = `sha256=${sha}`;

  const signature = req.headers[header];
  return signature === expectedSignature;
}

async function handleWebhook({ logger, req, res }: Context) {
  logger.info('processing request', req.method);

  if (!req.body) {
    throw new HTTPError('missing request body', StatusCode.BadRequest);
  }

  if (req.method !== 'POST') {
    throw new HTTPError('invalid request method', StatusCode.MethodNotAllowed, {
      method: req.method,
    });
  }

  if (!isGitHubWebhook(config.github, req)) {
    throw new HTTPError(
      'failed to verify GitHub webhook',
      StatusCode.Unauthorized,
    );
  }

  logger.info('fetching posts');

  let posts: BlogPost[];

  try {
    posts = await fetchPosts(config.github);
  } catch (err) {
    throw new HTTPError('failed to fetch posts');
  }

  logger.info(`fetched ${posts.length} posts`);
  const postStorage = new DynamoDB(config.aws);

  try {
    await postStorage.writePosts(posts);
  } catch (err) {
    throw new HTTPError(
      'failed to write posts to DynamoDB',
      StatusCode.InternalServerError,
      { error: err },
    );
  }

  logger.info('successfully wrote posts to DynamoDB');

  res.status(200).end();
}

export default withContext(handleErrors, handleWebhook);
