import { randomBytes } from 'crypto';
import type { LocationContent, StoredDraft } from './types.js';

export class DraftStore {
  private drafts = new Map<string, StoredDraft>();

  save(content: LocationContent): string {
    const id = randomBytes(4).toString('hex');
    this.drafts.set(id, {
      ...content,
      _id: id,
      _createdAt: new Date().toISOString(),
    });
    return id;
  }

  get(id: string): StoredDraft | undefined {
    return this.drafts.get(id);
  }

  update(id: string, patch: Partial<LocationContent>): StoredDraft | undefined {
    const existing = this.drafts.get(id);
    if (!existing) return undefined;
    const updated: StoredDraft = { ...existing, ...patch };
    this.drafts.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.drafts.delete(id);
  }

  list(): Array<{ id: string; title: string; suburb: string; createdAt: string }> {
    return Array.from(this.drafts.values()).map((d) => ({
      id: d._id,
      title: d.title,
      suburb: d.global.suburb_name,
      createdAt: d._createdAt,
    }));
  }
}
