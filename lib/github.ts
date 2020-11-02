import { graphql } from '@octokit/graphql';
import yamlParser from 'yaml';

import { BlogPost, isBlogPost } from '../types/post';

import { GitHubConfig } from './config';

export async function fetchPosts({
  owner,
  repo,
  postsRef,
  token,
}: GitHubConfig): Promise<BlogPost[]> {
  const fileEntries = await fetchFiles(owner, repo, postsRef, token);
  return fileEntries.map(composePostData).filter<BlogPost>(isBlogPost);
}

interface TreeEntry {
  name: string;
  type: string;
}

interface PostEntry extends TreeEntry {
  object: {
    entries: FileEntry[];
  };
}

interface FileEntry extends TreeEntry {
  object: {
    text: string;
  };
}

type FetchFilesResponse = {
  repository: {
    posts: {
      entries: PostEntry[];
    };
  };
};

async function fetchFiles(
  owner: string,
  repo: string,
  path: string,
  token: string,
) {
  const query = `
    query contents($owner: String!, $repo: String!, $path: String!) {
      repository(owner: $owner, name: $repo) {
        ... on Repository {
          posts: object(expression: $path) {
            ... on Tree {
              entries {
                name
                type
                object {
                  ... on Tree {
                    entries {
                      name
                      type
                      object {
                        ... on Blob {
                          text
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const resp = await graphql<FetchFilesResponse>(query, {
    owner,
    repo,
    path,
    headers: {
      authorization: `token ${token}`,
    },
  });

  if (!resp.repository.posts) {
    throw new Error('failed to fetch files');
  }

  return resp.repository.posts.entries.filter(({ type }) => type === 'tree');
}

function composePostData({ name: slug, ...entry }: PostEntry): BlogPost | null {
  const subTree = entry.object.entries;

  const bodyMDX = getPostBody(subTree);
  const metaYAML = getPostMeta(subTree);

  if (!bodyMDX || !metaYAML) {
    return null;
  }

  const postMetaData = getMetadata(metaYAML);
  if (postMetaData === null) {
    return null;
  }
  const postData = splitPost(bodyMDX);
  if (postData === null) {
    return null;
  }

  const { summary, ...metadata } = postMetaData;
  const { body, title } = postData;

  return {
    slug,
    title,
    summary: summary.trim(),
    ...metadata,
    isPublished: isPublished(metadata.publishDate),
    body: rewriteImageURLs(body),
  };
}

function getPostBody(entries: FileEntry[]): string | null {
  const postEntry = getEntryByName('index.md', entries);
  if (!postEntry) {
    return null;
  }

  return getEntryText(postEntry);
}

function getEntryByName(name: string, entries: FileEntry[]) {
  return entries.find(({ name: n }) => n === name);
}

function getEntryText(entry: FileEntry) {
  return entry.object.text;
}

type PostMetaData = {
  summary: string;
  category: string;
  tags: string[];
  publishDate: string;
  isPublished: boolean;
};

function isPostMetaData(something: unknown): something is PostMetaData {
  const maybePostMeta = something as PostMetaData;

  if (typeof maybePostMeta !== 'object') {
    return false;
  }

  const hasSummary = typeof maybePostMeta.summary === 'string';
  const hasCategory = typeof maybePostMeta.category === 'string';
  const maybeTags = maybePostMeta.tags;
  const hasTags =
    Array.isArray(maybeTags) &&
    maybeTags.reduce(
      (allStrings, value) => allStrings && typeof value === 'string',
      true,
    );
  const hasPublishDate = ['undefined', 'string'].includes(
    typeof maybePostMeta.publishDate,
  );
  const hasIsPublished = ['undefined', 'boolean'].includes(
    typeof maybePostMeta.isPublished,
  );

  return (
    hasSummary && hasCategory && hasTags && hasPublishDate && hasIsPublished
  );
}

function getPostMeta(entries: FileEntry[]): string | null {
  const postMeta = getEntryByName('metadata.yaml', entries);
  if (!postMeta) {
    return null;
  }

  return getEntryText(postMeta);
}

function getMetadata(yaml: string): PostMetaData | null {
  const parsedYAML = yamlParser.parse(yaml);
  if (!isPostMetaData(parsedYAML)) {
    return null;
  }

  return parsedYAML;
}

function getTitle(regex: RegExp, text: string): string {
  const res = regex.exec(text);
  if (res === null) {
    return '';
  }

  return res[1];
}

function splitPost(mdx: string): null | { body: string; title: string } {
  const titleRegex = /^# ?(.+)\n$/im;

  const title = getTitle(titleRegex, mdx);

  if (title.length === 0) {
    return null;
  }

  const body = mdx.replace(titleRegex, '').trim();

  return { title, body };
}

function isPublished(publishDate: string) {
  if (!publishDate) {
    return false;
  }

  return new Date(publishDate) <= new Date();
}

// TODO: add baseURL paramter
function rewriteImageURLs(mdx: string) {
  const imgRegex = /\]\(images\//gi;
  return mdx.replace(imgRegex, '](https://felixjung.imgix.net/');
}
