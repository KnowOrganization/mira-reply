// Demo catalog for t05-playful — "The Sticker Shop".
// Sugar Riot: a loud little candy + bake counter. Every image URL verified 200
// via curl (images.unsplash.com with imgix params).
import type { DemoSet } from "../fallback";

const IMG = "?q=80&w=1200&auto=format&fit=crop";

const set: DemoSet = {
  settings: {
    storefrontTitle: "Sugar Riot",
    storefrontAccent: "#ff5fa2",
    storefrontHeroHeadline: "Treats with attitude",
    storefrontHeroTagline:
      "Small-batch candy and bakes, made loud. Packed same-day at the counter, gone by teatime.",
    storefrontHeroLayout: "split",
    storefrontHeroImageUrl: `https://images.unsplash.com/photo-1516919549054-e08258825f80${IMG}`,
    storefrontFeaturedIds: ["d51", "d54", "d55"],
    storefrontShowFeatured: true,
    storefrontShowDiscover: true,
    storefrontShowAbout: true,
    storefrontAbout:
      "Sugar Riot is two sisters, one tiny kitchen and an unreasonable amount of sprinkles. Everything is mixed, baked and wrapped by hand in small batches — if it doesn't make you grin, we eat the evidence.",
    storefrontContactUrl: "https://instagram.com/sugarriot",
    storefrontBuyLabel: "Order",
    storefrontCheckoutEnabled: true,
    storefrontCurrency: "INR",
  },
  products: [
    {
      id: "d51",
      slug: "birthday-cake-brownie-box",
      title: "Birthday Cake Brownie Box",
      subtitle: "Box of 6 · Fudgy middles · Sprinkle-loaded",
      description:
        "Six thick-cut brownies with a birthday-cake crumb swirl and a snowstorm of rainbow sprinkles. Baked to order, still a little gooey in the middle — exactly as the law requires.",
      priceText: "₹1,450",
      priceMinor: 145000,
      currency: "INR",
      imageUrl: `https://images.unsplash.com/photo-1606313564200-e75d5e30476c${IMG}`,
      images: [
        `https://images.unsplash.com/photo-1606313564200-e75d5e30476c${IMG}`,
        `https://images.unsplash.com/photo-1612203985729-70726954388c${IMG}`,
        `https://images.unsplash.com/photo-1578985545062-69928b1d9587${IMG}`,
      ],
      available: true,
      ctaUrl: null,
    },
    {
      id: "d52",
      slug: "pistachio-cloud-cookies",
      title: "Pistachio Cloud Cookies",
      subtitle: "Half dozen · Soft-baked · Very nutty",
      description:
        "Pillowy soft-baked cookies folded with roasted pistachio butter and a pinch of sea salt. They weigh almost nothing and disappear even faster.",
      priceText: "₹650",
      priceMinor: 65000,
      currency: "INR",
      imageUrl: `https://images.unsplash.com/photo-1499636136210-6f4ee915583e${IMG}`,
      available: true,
      ctaUrl: null,
    },
    {
      id: "d53",
      slug: "strawberry-milk-caramels",
      title: "Strawberry Milk Caramels",
      subtitle: "18 pieces · Chewy · Pink as anything",
      description:
        "Slow-cooked milk caramels blitzed with freeze-dried strawberries, each one hand-wrapped in wax paper. Tastes like the last sip of strawberry milk, but chewy.",
      priceText: "₹520",
      priceMinor: 52000,
      currency: "INR",
      imageUrl: `https://images.unsplash.com/photo-1558326567-98ae2405596b${IMG}`,
      available: true,
      ctaUrl: null,
    },
    {
      id: "d54",
      slug: "everything-snack-tin",
      title: "The Everything Snack Tin",
      subtitle: "Keepsake tin · 9 kinds · Sharing size (allegedly)",
      description:
        "One reusable riot-pink tin packed with nine kinds of candy and crunch — sour gummies, choco pebbles, honeycomb shards and whatever the kitchen got excited about this week.",
      priceText: "₹2,400",
      priceMinor: 240000,
      currency: "INR",
      imageUrl: `https://images.unsplash.com/photo-1587668178277-295251f900ce${IMG}`,
      available: true,
      ctaUrl: null,
    },
    {
      id: "d55",
      slug: "hot-cocoa-bombs-4pk",
      title: "Hot Cocoa Bombs — 4pk",
      subtitle: "4 bombs · Marshmallow core · 54% dark shell",
      description:
        "Drop one in hot milk and watch it crack open into cocoa, marshmallows and a frankly unnecessary amount of joy. Four bombs, four very good evenings.",
      priceText: "₹980",
      priceMinor: 98000,
      currency: "INR",
      imageUrl: `https://images.unsplash.com/photo-1481391319762-47dff72954d9${IMG}`,
      available: true,
      ctaUrl: null,
    },
    {
      id: "d56",
      slug: "mystery-flavor-drop",
      title: "Mystery Flavor Drop",
      subtitle: "One-off batch · Sealed bag · No hints",
      description:
        "A sealed bag of this week's experiment from the test kitchen. We won't tell you what's inside, and honestly neither will the label. Guess the flavor, win bragging rights.",
      priceText: "₹350",
      priceMinor: 35000,
      currency: "INR",
      imageUrl: null,
      available: true,
      ctaUrl: null,
    },
  ],
};

export default set;
