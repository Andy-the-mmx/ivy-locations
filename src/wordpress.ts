import type { LocationContent, PostStatus, WordPressPostResult } from './types.js';

export class WordPressClient {
  private authHeader: string;
  private endpoint: string;

  constructor(config: {
    baseUrl: string;
    username: string;
    appPassword: string;
    locationsEndpoint?: string;
  }) {
    const credentials = Buffer.from(`${config.username}:${config.appPassword}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
    this.endpoint =
      config.baseUrl.replace(/\/$/, '') +
      (config.locationsEndpoint ?? '/wp-json/wp/v2/locations');
  }

  async createLocation(
    content: LocationContent,
    status: PostStatus = 'draft',
  ): Promise<WordPressPostResult> {
    const body = this.buildRequestBody(content, status);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WordPress API error ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<WordPressPostResult>;
  }

  async updateLocation(
    postId: number,
    content: LocationContent,
    status?: PostStatus,
  ): Promise<WordPressPostResult> {
    const body = this.buildRequestBody(content, status);

    const response = await fetch(`${this.endpoint}/${postId}`, {
      method: 'PUT',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WordPress API error ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<WordPressPostResult>;
  }

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const response = await fetch(this.endpoint + '?per_page=1', {
        headers: { Authorization: this.authHeader },
      });
      if (response.ok) {
        return { connected: true, message: `Connected — endpoint: ${this.endpoint}` };
      }
      const text = await response.text();
      return { connected: false, message: `HTTP ${response.status}: ${text}` };
    } catch (err) {
      return {
        connected: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private buildRequestBody(content: LocationContent, status?: PostStatus) {
    return {
      title: content.title,
      ...(content.slug && { slug: content.slug }),
      ...(content.excerpt && { excerpt: content.excerpt }),
      ...(status && { status }),
      // ACF fields — requires "Show in REST API" enabled on the field group in ACF
      acf: {
        hero: content.hero,
        global: content.global,
        ...(content.local_intro && { local_intro: content.local_intro }),
        ...(content.services && { services: content.services }),
        ...(content.review && { review: content.review }),
        ...(content.comparison && { comparison: content.comparison }),
        ...(content.faq && { faq: content.faq }),
        ...(content.final_cta && { final_cta: content.final_cta }),
        ...(content.nearby_links && { nearby_links: content.nearby_links }),
        ...(content.schema && { schema: content.schema }),
      },
    };
  }
}
