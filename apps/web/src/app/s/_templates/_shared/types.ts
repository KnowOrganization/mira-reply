// Locked prop contracts for all 10 storefront templates.
// Workstream C wires these from page.tsx; workstream B defines them here.
// SfProduct extends the original Storefront.tsx shape + priceMinor/currency/available/images.
import type { StorefrontConfig } from "@shaiz/shared";

export type SfProduct = {
  id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  priceText: string | null;
  priceMinor: number | null;   // minor units (paise for INR); null = link-out only
  currency: string;            // ISO 4217 uppercase e.g. "INR"
  imageUrl: string | null;
  images?: string[];           // additional product images (gallery)
  available: boolean;
  ctaUrl: string | null;
};

export type ListingProps = {
  config: StorefrontConfig;
  products: SfProduct[];
  slug: string;
};

export type DetailProps = {
  config: StorefrontConfig;
  product: SfProduct;
  more: SfProduct[];           // related products shown below detail
  slug: string;
};

// Re-export for convenience
export type { StorefrontConfig };
