import type { IDraftStore, LocationContent, StoredDraft } from './types.js';

// Stateless draft store — encodes content into the ID itself.
// No external service required; the "draft" lives in Claude's context window.
export class InlineDraftStore implements IDraftStore {
  async save(content: LocationContent): Promise<string> {
    const payload = JSON.stringify({ c: content, t: Date.now() });
    return 'iv_' + Buffer.from(payload).toString('base64url');
  }

  async get(id: string): Promise<StoredDraft | undefined> {
    try {
      const encoded = id.startsWith('iv_') ? id.slice(3) : id;
      const { c, t } = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf-8'),
      ) as { c: LocationContent; t: number };
      return { ...c, _id: id, _createdAt: new Date(t).toISOString() };
    } catch {
      return undefined;
    }
  }

  // Not used directly — register-tools.ts handles update via get+save to produce a fresh ID
  async update(_id: string, _patch: Partial<LocationContent>): Promise<StoredDraft | undefined> {
    return undefined;
  }

  async delete(_id: string): Promise<boolean> {
    return true; // no-op; old IDs simply expire from context
  }

  async list(): Promise<Array<{ id: string; title: string; suburb: string; createdAt: string }>> {
    return []; // stateless — no server-side index
  }
}
