export interface SidebarStat {
  title: string;
  description: string;
}

export interface ServiceCard {
  title: string;
  description: string;
}

export interface Review {
  author_name: string;
  author_location?: string;
  rating?: number;
  text: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface NearbySuburb {
  suburb_name: string;
  page_url?: string;
}

export interface LocationContent {
  // WordPress post fields
  title: string;
  slug?: string;
  excerpt?: string;

  // ACF: Hero group
  hero: {
    hero_h1: string;
    hero_subtitle?: string;
    hero_intro?: string;
  };

  // ACF: Global group
  global: {
    suburb_name: string;
    region_name?: string;
  };

  // ACF: Local Intro group
  local_intro?: {
    local_intro_heading?: string;
    local_intro_content?: string;
    local_sidebar_stats?: SidebarStat[];
  };

  // ACF: Services group
  services?: {
    services_heading?: string;
    services_intro?: string;
    service_cards?: ServiceCard[];
  };

  // ACF: Reviews group (ACF name: "review")
  review?: {
    reviews_heading?: string;
    reviews?: Review[];
  };

  // ACF: Comparison group
  comparison?: {
    comparison_heading?: string;
    comparison_intro?: string;
  };

  // ACF: FAQ group
  faq?: {
    faq_heading?: string;
    faqs?: FAQ[];
  };

  // ACF: Final CTA group
  final_cta?: {
    cta_heading?: string;
    cta_intro?: string;
  };

  // ACF: Nearby Links group
  nearby_links?: {
    nearby_heading?: string;
    map_address?: string;
    nearby_intro_heading?: string;
    nearby_intro?: string;
    nearby_suburbs?: NearbySuburb[];
  };

  // ACF: Schema group
  schema?: {
    schema_json?: string;
  };
}

export interface StoredDraft extends LocationContent {
  _id: string;
  _createdAt: string;
}

export type PostStatus = 'draft' | 'pending' | 'publish';

export interface WordPressPostResult {
  id: number;
  status: string;
  title: { rendered: string };
  link: string;
  slug: string;
}

export interface IDraftStore {
  save(content: LocationContent): Promise<string>;
  get(id: string): Promise<StoredDraft | undefined>;
  update(id: string, patch: Partial<LocationContent>): Promise<StoredDraft | undefined>;
  delete(id: string): Promise<boolean>;
  list(): Promise<Array<{ id: string; title: string; suburb: string; createdAt: string }>>;
}
