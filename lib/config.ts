import env from 'env-var';

enum Env {
  TEST = 'test',
  DEV = 'development',
  PROD = 'production',
}

export interface GitHubConfig {
  postsRef: string;
  repo: string;
  owner: string;
  token: string;
  webhookSecret: string;
}

export interface AWSDynamoDBConfig {
  tableName: string;
  region: string;
  accessKeyID: string;
  secretAccessKey: string;
}

export interface Config {
  env: Env;
  github: GitHubConfig;
  aws: AWSDynamoDBConfig;
}

export const config: Config = {
  env: env.get('NODE_ENV').required().asEnum([Env.TEST, Env.DEV, Env.PROD]),
  github: {
    postsRef: env.get('CMS_REPO_POSTS_REF').required().asString(),
    repo: env.get('CMS_REPO').required().asString(),
    owner: env.get('CMS_REPO_OWNER').required().asString(),
    token: env.get('CMS_GITHUB_TOKEN').required().asString(),
    webhookSecret: env.get('CMS_GITHUB_WEBHOOK_SECRET').required().asString(),
  },
  aws: {
    tableName: env.get('CMS_AWS_DYNAMO_DB_TABLE').required().asString(),
    region: env.get('CMS_AWS_REGION').required().asString(),
    accessKeyID: env.get('CMS_AWS_ACCESS_KEY_ID').required().asString(),
    secretAccessKey: env.get('CMS_AWS_SECRET_ACCESS_KEY').required().asString(),
  },
};
