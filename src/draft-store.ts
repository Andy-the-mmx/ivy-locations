import { randomBytes } from 'crypto';
import type { IDraftStore, LocationContent, StoredDraft } from './types.js';

export class DraftStore implements IDraftStore {
  private drafts = new Map<string, StoredDraft>();

  async save(content: LocationContent): Promise<string> {
    const id = randomBytes(4).toString('hex');
    this.drafts.set(id, { ...content, _id: id, _createdAt: new Date().toISOString() });
    return id;
  }

  async get(id: string): Promise<StoredDraft | undefined> {
    return this.drafts.get(id);
  }

  async update(id: string, patch: Partial<LocationContent>): Promise<StoredDraft | undefined> {
    const existing = this.drafts.get(id);
    if (!existing) return undefined;
    const updated: StoredDraft = { ...existing, ...patch };
    this.drafts.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.drafts.delete(id);
  }

  async list(): Promise<Array<{ id: string; title: string; suburb: string; createdAt: string }>> {
    return Array.from(this.drafts.values()).map((d) => ({
      id: d._id,
      title: d.title,
      suburb: d.global.suburb_name,
      createdAt: d._createdAt,
    }));
  }
}
