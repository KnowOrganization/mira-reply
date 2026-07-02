// Template registry — static imports so all 10 are bundled, no dynamic loading.
// Each template exposes a default-exported Listing and Detail RSC.
// REGISTRY is keyed by the stable template IDs in @shaiz/shared STOREFRONT_TEMPLATES.
import type { ComponentType } from "react";
import type { ListingProps, DetailProps } from "./_shared/types";

import T01Listing from "./t01-editorial/Listing";
import T01Detail from "./t01-editorial/Detail";

import T02Listing from "./t02-brutalist/Listing";
import T02Detail from "./t02-brutalist/Detail";

import T03Listing from "./t03-luxe/Listing";
import T03Detail from "./t03-luxe/Detail";

import T04Listing from "./t04-neon/Listing";
import T04Detail from "./t04-neon/Detail";

import T05Listing from "./t05-playful/Listing";
import T05Detail from "./t05-playful/Detail";

import T06Listing from "./t06-magazine/Listing";
import T06Detail from "./t06-magazine/Detail";

import T07Listing from "./t07-drop/Listing";
import T07Detail from "./t07-drop/Detail";

import T08Listing from "./t08-market/Listing";
import T08Detail from "./t08-market/Detail";

import T09Listing from "./t09-boutique/Listing";
import T09Detail from "./t09-boutique/Detail";

import T10Listing from "./t10-typo/Listing";
import T10Detail from "./t10-typo/Detail";

export type TemplateModule = {
  Listing: ComponentType<ListingProps>;
  Detail: ComponentType<DetailProps>;
};

export const REGISTRY: Record<string, TemplateModule> = {
  "t01-editorial": { Listing: T01Listing, Detail: T01Detail },
  "t02-brutalist": { Listing: T02Listing, Detail: T02Detail },
  "t03-luxe":      { Listing: T03Listing, Detail: T03Detail },
  "t04-neon":      { Listing: T04Listing, Detail: T04Detail },
  "t05-playful":   { Listing: T05Listing, Detail: T05Detail },
  "t06-magazine":  { Listing: T06Listing, Detail: T06Detail },
  "t07-drop":      { Listing: T07Listing, Detail: T07Detail },
  "t08-market":    { Listing: T08Listing, Detail: T08Detail },
  "t09-boutique":  { Listing: T09Listing, Detail: T09Detail },
  "t10-typo":      { Listing: T10Listing, Detail: T10Detail },
};

/** Safe getter — unknown id falls back to t01-editorial, which always exists. */
export function getTemplate(id: string): TemplateModule {
  return REGISTRY[id] ?? REGISTRY["t01-editorial"]!;
}

// Re-export types for workstream C convenience
export type { ListingProps, DetailProps };
export type { SfProduct } from "./_shared/types";
