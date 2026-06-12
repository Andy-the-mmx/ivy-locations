import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { WordPressClient } from './wordpress.js';
import { DraftStore } from './draft-store.js';
import type { LocationContent, PostStatus } from './types.js';

// ---------------------------------------------------------------------------
// Zod schemas — mirrors LocationContent, used for tool input validation
// ---------------------------------------------------------------------------

const HeroSchema = z.object({
  hero_h1: z.string().describe('Main H1 heading for the hero section'),
  hero_subtitle: z.string().optional().describe('Hero subtitle text'),
  hero_intro: z.string().optional().describe('Hero intro paragraph'),
});

const GlobalSchema = z.object({
  suburb_name: z.string().describe('Suburb name, e.g. "Bondi Beach"'),
  region_name: z.string().optional().describe('Region name, e.g. "Eastern Suburbs"'),
});

const LocalIntroSchema = z.object({
  local_intro_heading: z.string().optional(),
  local_intro_content: z.string().optional().describe('HTML content for the WYSIWYG editor'),
  local_sidebar_stats: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      }),
    )
    .optional()
    .describe('Stats shown in the sidebar (e.g. "15+ years experience")'),
});

const ServicesSchema = z.object({
  services_heading: z.string().optional(),
  services_intro: z.string().optional(),
  service_cards: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      }),
    )
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
    .array(
      z.object({
        question: z.string(),
        answer: z.string().describe('HTML content for the WYSIWYG editor'),
      }),
    )
    .optional(),
});

const FinalCTASchema = z.object({
  cta_heading: z.string().optional(),
  cta_intro: z.string().optional(),
});

const NearbyLinksSchema = z.object({
  nearby_heading: z.string().optional(),
  map_address: z.string().optional().describe('Address string for the embedded map'),
  nearby_intro_heading: z.string().optional(),
  nearby_intro: z.string().optional(),
  nearby_suburbs: z
    .array(
      z.object({
        suburb_name: z.string(),
        page_url: z.string().url().optional(),
      }),
    )
    .optional(),
});

const SchemaMarkupSchema = z.object({
  schema_json: z
    .string()
    .optional()
    .describe('JSON-LD structured data string for the page'),
});

const LocationContentSchema = z.object({
  title: z.string().describe('WordPress post title, e.g. "Roof Repairs Bondi Beach"'),
  slug: z.string().optional().describe('URL slug — auto-generated from title if omitted'),
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
// Bootstrap
// ---------------------------------------------------------------------------

const wp = new WordPressClient({
  baseUrl: process.env.WP_BASE_URL ?? '',
  username: process.env.WP_USERNAME ?? '',
  appPassword: process.env.WP_APP_PASSWORD ?? '',
  locationsEndpoint: process.env.WP_LOCATIONS_ENDPOINT,
});

const store = new DraftStore();

const server = new McpServer({
  name: 'ivy-locations',
  version: '1.0.0',
});

// ---------------------------------------------------------------------------
// Tool: store_location_draft
// ---------------------------------------------------------------------------

server.tool(
  'store_location_draft',
  'Store a complete location SEO content draft for review before publishing to WordPress. Returns a draft ID you can pass to push_to_wordpress once approved.',
  LocationContentSchema.shape,
  async (input) => {
    const content = input as LocationContent;
    const id = store.save(content);
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

// ---------------------------------------------------------------------------
// Tool: get_location_draft
// ---------------------------------------------------------------------------

server.tool(
  'get_location_draft',
  'Retrieve and display a stored location draft for review.',
  { id: z.string().describe('Draft ID returned by store_location_draft') },
  async ({ id }) => {
    const draft = store.get(id);
    if (!draft) {
      return {
        content: [{ type: 'text' as const, text: `No draft found with ID: ${id}` }],
      };
    }
    // Strip internal metadata before displaying
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

// ---------------------------------------------------------------------------
// Tool: update_location_draft
// ---------------------------------------------------------------------------

server.tool(
  'update_location_draft',
  'Update one or more fields on a stored location draft. Only supply the fields you want to change — everything else is preserved.',
  {
    id: z.string().describe('Draft ID to update'),
    patch: LocationContentSchema.partial().describe('Fields to update'),
  },
  async ({ id, patch }) => {
    const updated = store.update(id, patch as Partial<LocationContent>);
    if (!updated) {
      return {
        content: [{ type: 'text' as const, text: `No draft found with ID: ${id}` }],
      };
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

// ---------------------------------------------------------------------------
// Tool: list_location_drafts
// ---------------------------------------------------------------------------

server.tool(
  'list_location_drafts',
  'List all pending location drafts waiting for approval.',
  {},
  async () => {
    const drafts = store.list();
    if (drafts.length === 0) {
      return {
        content: [{ type: 'text' as const, text: 'No pending drafts.' }],
      };
    }
    const rows = drafts.map(
      (d) => `- \`${d.id}\` — **${d.title}** (${d.suburb}) — ${d.createdAt}`,
    );
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

// ---------------------------------------------------------------------------
// Tool: delete_location_draft
// ---------------------------------------------------------------------------

server.tool(
  'delete_location_draft',
  'Remove a pending location draft without publishing it.',
  { id: z.string().describe('Draft ID to delete') },
  async ({ id }) => {
    const deleted = store.delete(id);
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

// ---------------------------------------------------------------------------
// Tool: push_to_wordpress
// ---------------------------------------------------------------------------

server.tool(
  'push_to_wordpress',
  'Publish an approved location draft to WordPress via the REST API. Creates the post in "draft" status by default so it can be reviewed in the WP admin before going live.',
  {
    id: z.string().describe('Draft ID to push'),
    status: z
      .enum(['draft', 'pending', 'publish'])
      .optional()
      .describe('WordPress post status (default: draft)'),
  },
  async ({ id, status }) => {
    const draft = store.get(id);
    if (!draft) {
      return {
        content: [{ type: 'text' as const, text: `No draft found with ID: ${id}` }],
      };
    }

    if (!process.env.WP_BASE_URL) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'WP_BASE_URL is not set. Copy .env.example to .env and fill in your credentials.',
          },
        ],
      };
    }

    try {
      const result = await wp.createLocation(draft, (status as PostStatus) ?? 'draft');
      store.delete(id);
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

// ---------------------------------------------------------------------------
// Tool: test_wordpress_connection
// ---------------------------------------------------------------------------

server.tool(
  'test_wordpress_connection',
  'Verify that the WordPress credentials and endpoint in .env are working correctly.',
  {},
  async () => {
    if (!process.env.WP_BASE_URL) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'WP_BASE_URL is not set. Copy .env.example to .env and fill in your credentials.',
          },
        ],
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

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
