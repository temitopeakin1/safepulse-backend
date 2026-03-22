const redisUrl = process.env.REDIS_URL;

export const isRedisConfigured = (): boolean => Boolean(redisUrl);

export const getRedisConnection = () => {
  if (!redisUrl) {
    throw new Error("REDIS_URL is not configured.");
  }
  return {
    url: redisUrl,
    maxRetriesPerRequest: null,
  };
};

