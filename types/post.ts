export type BlogPost = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  publishDate?: string;
  isPublished: boolean;
  body: string;
};

export function isBlogPost(something: unknown): something is BlogPost {
  if (typeof something !== 'object') {
    return false;
  }

  const maybeBlogPost = something as BlogPost;

  if (maybeBlogPost === null || typeof maybeBlogPost !== 'object') {
    return false;
  }

  const hasSummary = typeof maybeBlogPost.summary === 'string';
  const hasCategory = typeof maybeBlogPost.category === 'string';
  const maybeTags = maybeBlogPost.tags;
  const hasTags =
    Array.isArray(maybeTags) &&
    maybeTags.reduce(
      (allStrings, value) => allStrings && typeof value === 'string',
      true,
    );
  const hasPublishDate = ['undefined', 'string'].includes(
    typeof maybeBlogPost.publishDate,
  );
  const hasIsPublished = ['undefined', 'boolean'].includes(
    typeof maybeBlogPost.isPublished,
  );
  const hasBody =
    typeof maybeBlogPost.body === 'string' && maybeBlogPost.body.length > 0;

  const hasTitle =
    typeof maybeBlogPost.title === 'string' && maybeBlogPost.title.length > 0;

  return (
    hasSummary &&
    hasCategory &&
    hasTags &&
    hasPublishDate &&
    hasIsPublished &&
    hasBody &&
    hasTitle
  );
}
