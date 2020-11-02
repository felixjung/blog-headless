import { promisify } from 'util';

import aws from 'aws-sdk';

import { BlogPost, isBlogPost } from '../types/post';

import { AWSDynamoDBConfig } from './config';

export class DynamoDB {
  documentClient: aws.DynamoDB.DocumentClient;

  config: AWSDynamoDBConfig;

  constructor(config: AWSDynamoDBConfig) {
    aws.config.update({
      region: config.region,
      accessKeyId: config.accessKeyID,
      secretAccessKey: config.secretAccessKey,
    });

    this.documentClient = new aws.DynamoDB.DocumentClient();
    this.config = config;
  }

  writePosts(posts: BlogPost[]) {
    const put = promisify(this.documentClient.put.bind(this.documentClient));

    return Promise.all(
      posts.map(({ slug, publishDate = '', ...post }) => {
        const params = {
          TableName: this.config.tableName,
          Item: {
            slug,
            publishDate,
            ...post,
          },
        };

        return put(params);
      }),
    );
  }

  async listPosts(offset = 0, limit = 10) {
    const scan = promisify(this.documentClient.scan.bind(this.documentClient));
    const params = {
      TableName: this.config.tableName,
    };

    const posts = await scan(params);

    if (!posts.Items) {
      return [] as BlogPost[];
    }

    return posts.Items.filter(isBlogPost).slice(offset, offset + limit);
  }

  async getPost(slug: string) {
    const query = promisify(
      this.documentClient.query.bind(this.documentClient),
    );
    const params = {
      TableName: this.config.tableName,
      KeyConditionExpression: '#sg = :slug',
      ExpressionAttributeNames: {
        '#sg': 'slug',
      },
      ExpressionAttributeValues: {
        ':slug': slug,
      },
      Limit: 1,
    };

    const result = await query(params);

    if (
      !result.Items ||
      result.Items.length === 0 ||
      !isBlogPost(result.Items[0])
    ) {
      return null;
    }

    return result?.Items[0];
  }
}
