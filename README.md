# ivy-locations

MCP server for generating and publishing location SEO content to WordPress. Claude generates structured content for each suburb, you review it, then it gets pushed to WordPress as a draft via the REST API — populating all ACF fields automatically.

## How it works

1. Ask Claude to generate location content for a suburb
2. Claude calls `store_location_draft` and shows you the result
3. Review / edit as needed (`update_location_draft`)
4. Say "approve it" — Claude calls `push_to_wordpress`
5. Post appears in WordPress as a **draft** ready for final review

## WordPress setup (required before first use)

### 1. Enable ACF REST API on the field group

The ACF field group **"Locations Additional Fields"** must have **Show in REST API** set to `Yes`. Without this, ACF fields won't be written when the post is created.

In WordPress admin: **Custom Fields → Field Groups → Locations Additional Fields → Settings → Show in REST API → Yes**

### 2. Generate an Application Password

WordPress admin → **Users → Your Profile → Application Passwords**

Give it a name (e.g. "Claude MCP"), copy the generated password.

### 3. Create your .env

```bash
cp .env.example .env
```

Fill in:

```
WP_BASE_URL=https://yoursite.com.au
WP_USERNAME=your_wp_username
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
```

The `WP_LOCATIONS_ENDPOINT` defaults to `/wp-json/wp/v2/locations`. If your CPT `rest_base` is different, set it here (check `/wp-json/wp/v2/types/location` to verify).

## Installation

```bash
npm install
npm run build
```

## Add to Claude Code

Add this to your Claude Code MCP config (`.claude/settings.json` in the project, or your user-level `~/.claude.json`):

```json
{
  "mcpServers": {
    "ivy-locations": {
      "command": "node",
      "args": ["/Users/andyjones/Desktop/Web/ivy-locations/dist/index.js"]
    }
  }
}
```

Or if using Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ivy-locations": {
      "command": "node",
      "args": ["/Users/andyjones/Desktop/Web/ivy-locations/dist/index.js"]
    }
  }
}
```

## Available tools

| Tool | Description |
|---|---|
| `store_location_draft` | Store a complete location draft (returns an ID) |
| `get_location_draft` | View a stored draft |
| `update_location_draft` | Patch specific fields on a draft |
| `list_location_drafts` | Show all pending drafts |
| `delete_location_draft` | Discard a draft without publishing |
| `push_to_wordpress` | Push approved draft to WordPress as a draft post |
| `test_wordpress_connection` | Verify credentials and endpoint are working |

## ACF field map

| Section | ACF group name | Fields |
|---|---|---|
| Hero | `hero` | `hero_h1`, `hero_subtitle`, `hero_intro` |
| Global | `global` | `suburb_name`, `region_name` |
| Local Intro | `local_intro` | `local_intro_heading`, `local_intro_content`, `local_sidebar_stats[]` |
| Services | `services` | `services_heading`, `services_intro`, `service_cards[]` |
| Reviews | `review` | `reviews_heading`, `reviews[]` |
| Comparison | `comparison` | `comparison_heading`, `comparison_intro` |
| FAQ | `faq` | `faq_heading`, `faqs[]` |
| Final CTA | `final_cta` | `cta_heading`, `cta_intro` |
| Nearby Links | `nearby_links` | `nearby_heading`, `map_address`, `nearby_intro_heading`, `nearby_intro`, `nearby_suburbs[]` |
| Schema | `schema` | `schema_json` |

## Rebuilding after changes

```bash
npm run build
```

Restart the MCP server (or reload Claude) after rebuilding.
