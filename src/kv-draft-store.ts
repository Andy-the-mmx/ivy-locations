import { Redis } from '@upstash/redis';
import { randomBytes } from 'crypto';
import type { IDraftStore, LocationContent, StoredDraft } from './types.js';

const TTL_SECONDS = 60 * 60 * 24; // 24 hours

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export class KvDraftStore implements IDraftStore {
  async save(content: LocationContent): Promise<string> {
    const redis = getRedis();
    const id = randomBytes(4).toString('hex');
    const draft: StoredDraft = { ...content, _id: id, _createdAt: new Date().toISOString() };
    await redis.set(`draft:${id}`, draft, { ex: TTL_SECONDS });
    await redis.sadd('draft_ids', id);
    return id;
  }

  async get(id: string): Promise<StoredDraft | undefined> {
    const redis = getRedis();
    const draft = await redis.get<StoredDraft>(`draft:${id}`);
    return draft ?? undefined;
  }

  async update(id: string, patch: Partial<LocationContent>): Promise<StoredDraft | undefined> {
    const existing = await this.get(id);
    if (!existing) return undefined;
    const redis = getRedis();
    const updated: StoredDraft = { ...existing, ...patch };
    await redis.set(`draft:${id}`, updated, { ex: TTL_SECONDS });
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const redis = getRedis();
    const result = await redis.del(`draft:${id}`);
    await redis.srem('draft_ids', id);
    return result > 0;
  }

  async list(): Promise<Array<{ id: string; title: string; suburb: string; createdAt: string }>> {
    const redis = getRedis();
    const ids = (await redis.smembers('draft_ids')) as string[];
    if (!ids.length) return [];
    const drafts = await Promise.all(ids.map((id) => this.get(id)));
    return drafts
      .filter((d): d is StoredDraft => d !== undefined)
      .map((d) => ({ id: d._id, title: d.title, suburb: d.global.suburb_name, createdAt: d._createdAt }));
  }
}
