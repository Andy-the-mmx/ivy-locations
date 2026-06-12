import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { IDraftStore, LocationContent, PostStatus } from './types.js';
import type { WordPressClient } from './wordpress.js';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const HeroSchema = z.object({
  hero_h1: z.string().describe('Main H1 heading for the hero section'),
  hero_subtitle: z.string().optional(),
  hero_intro: z.string().optional(),
});

const GlobalSchema = z.object({
  suburb_name: z.string().describe('Suburb name, e.g. "Bondi Beach"'),
  region_name: z.string().optional(),
});

const LocalIntroSchema = z.object({
  local_intro_heading: z.string().optional(),
  local_intro_content: z.string().optional().describe('HTML for the WYSIWYG editor'),
  local_sidebar_stats: z
    .array(z.object({ title: z.string(), description: z.string() }))
    .optional(),
});

const ServicesSchema = z.object({
  services_heading: z.string().optional(),
  services_intro: z.string().optional(),
  service_cards: z
    .array(z.object({ title: z.string(), description: z.string() }))
    .optional(),
});

const ReviewSchema = z.object({
  reviews_heading: z.string().optional(),
  reviews: z
    .array(
      z.object({
        author_name: z.string(),
        author_location: z.string().optional(),
        rating: z.number().min(1).max(5).optional(),
        text: z.string(),
      }),
    )
    .optional(),
});

const ComparisonSchema = z.object({
  comparison_heading: z.string().optional(),
  comparison_intro: z.string().optional(),
});

const FAQSchema = z.object({
  faq_heading: z.string().optional(),
  faqs: z
    .array(z.object({ question: z.string(), answer: z.string().describe('HTML for the WYSIWYG editor') }))
    .optional(),
});

const FinalCTASchema = z.object({
  cta_heading: z.string().optional(),
  cta_intro: z.string().optional(),
});

const NearbyLinksSchema = z.object({
  nearby_heading: z.string().optional(),
  map_address: z.string().optional(),
  nearby_intro_heading: z.string().optional(),
  nearby_intro: z.string().optional(),
  nearby_suburbs: z
    .array(z.object({ suburb_name: z.string(), page_url: z.string().url().optional() }))
    .optional(),
});

const SchemaMarkupSchema = z.object({
  schema_json: z.string().optional().describe('JSON-LD structured data string'),
});

const LocationContentSchema = z.object({
  title: z.string().describe('WordPress post title, e.g. "Roof Repairs Bondi Beach"'),
  slug: z.string().optional(),
  excerpt: z.string().optional().describe('Post excerpt / meta description'),
  hero: HeroSchema,
  global: GlobalSchema,
  local_intro: LocalIntroSchema.optional(),
  services: ServicesSchema.optional(),
  review: ReviewSchema.optional(),
  comparison: ComparisonSchema.optional(),
  faq: FAQSchema.optional(),
  final_cta: FinalCTASchema.optional(),
  nearby_links: NearbyLinksSchema.optional(),
  schema: SchemaMarkupSchema.optional(),
});

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerTools(server: McpServer, store: IDraftStore, wp: WordPressClient) {
  server.tool(
    'store_location_draft',
    'Store a complete location SEO content draft for review before publishing to WordPress. Returns a draft ID.',
    LocationContentSchema.shape,
    async (input) => {
      const content = input as LocationContent;
      const id = await store.save(content);
      return {
        content: [
          {
            type: 'text' as const,
            text: [
              `Draft stored — ID: \`${id}\``,
              `Title: ${content.title}`,
              `Suburb: ${content.global.suburb_name}`,
              ``,
              `Review with: get_location_draft("${id}")`,
              `Push to WordPress with: push_to_wordpress("${id}")`,
            ].join('\n'),
          },
        ],
      };
    },
  );

  server.tool(
    'get_location_draft',
    'Retrieve and display a stored location draft for review.',
    { id: z.string().describe('Draft ID returned by store_location_draft') },
    async ({ id }) => {
      const draft = await store.get(id);
      if (!draft) {
        return { content: [{ type: 'text' as const, text: `No draft found with ID: ${id}` }] };
      }
      const { _id, _createdAt, ...content } = draft;
      return {
        content: [
          {
            type: 'text' as const,
            text: `**Draft \`${_id}\`** — created ${_createdAt}\n\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\``,
          },
        ],
      };
    },
  );

  server.tool(
    'update_location_draft',
    'Update one or more fields on a stored draft. Only supply the fields you want to change — everything else is preserved.',
    {
      id: z.string().describe('Draft ID to update'),
      patch: LocationContentSchema.partial().describe('Fields to update'),
    },
    async ({ id, patch }) => {
      const updated = await store.update(id, patch as Partial<LocationContent>);
      if (!updated) {
        return { content: [{ type: 'text' as const, text: `No draft found with ID: ${id}` }] };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: `Draft \`${id}\` updated. Changed fields: ${Object.keys(patch).join(', ')}`,
          },
        ],
      };
    },
  );

  server.tool(
    'list_location_drafts',
    'List all pending location drafts waiting for approval.',
    {},
    async () => {
      const drafts = await store.list();
      if (!drafts.length) {
        return { content: [{ type: 'text' as const, text: 'No pending drafts.' }] };
      }
      const rows = drafts.map((d) => `- \`${d.id}\` — **${d.title}** (${d.suburb}) — ${d.createdAt}`);
      return {
        content: [
          {
            type: 'text' as const,
            text: `**Pending location drafts (${drafts.length})**\n\n${rows.join('\n')}`,
          },
        ],
      };
    },
  );

  server.tool(
    'delete_location_draft',
    'Remove a pending location draft without publishing it.',
    { id: z.string().describe('Draft ID to delete') },
    async ({ id }) => {
      const deleted = await store.delete(id);
      return {
        content: [
          {
            type: 'text' as const,
            text: deleted ? `Draft \`${id}\` deleted.` : `No draft found with ID: ${id}`,
          },
        ],
      };
    },
  );

  server.tool(
    'push_to_wordpress',
    'Push an approved location draft to WordPress as a draft post via the REST API.',
    {
      id: z.string().describe('Draft ID to push'),
      status: z.enum(['draft', 'pending', 'publish']).optional().describe('WordPress post status (default: draft)'),
    },
    async ({ id, status }) => {
      const draft = await store.get(id);
      if (!draft) {
        return { content: [{ type: 'text' as const, text: `No draft found with ID: ${id}` }] };
      }
      if (!process.env.WP_BASE_URL) {
        return {
          content: [{ type: 'text' as const, text: 'WP_BASE_URL is not configured.' }],
        };
      }
      try {
        const result = await wp.createLocation(draft, (status as PostStatus) ?? 'draft');
        await store.delete(id);
        return {
          content: [
            {
              type: 'text' as const,
              text: [
                `Successfully created WordPress ${result.status}!`,
                ``,
                `- **Post ID**: ${result.id}`,
                `- **Title**: ${result.title.rendered}`,
                `- **Slug**: ${result.slug}`,
                `- **Status**: ${result.status}`,
                `- **URL**: ${result.link}`,
              ].join('\n'),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to push to WordPress:\n\n${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    'test_wordpress_connection',
    'Verify that the WordPress credentials and endpoint are working correctly.',
    {},
    async () => {
      if (!process.env.WP_BASE_URL) {
        return {
          content: [{ type: 'text' as const, text: 'WP_BASE_URL is not configured.' }],
        };
      }
      const result = await wp.testConnection();
      return {
        content: [
          {
            type: 'text' as const,
            text: result.connected
              ? `Connection successful\n${result.message}`
              : `Connection failed\n${result.message}`,
          },
        ],
      };
    },
  );
}
