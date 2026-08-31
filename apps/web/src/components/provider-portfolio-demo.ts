import type { ProviderPortfolioItem } from "./provider-portfolio-gallery";

const DEMO_LIKES_KEY = "kaila-demo-portfolio-likes";

const demoPortfolioItems: ProviderPortfolioItem[] = [
  {
    id: "demo-kitchen",
    caption: "Custom kitchen cabinet install",
    downloadPath:
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=960&h=720&q=80",
    likeCount: 18,
    demo: true,
  },
  {
    id: "demo-bathroom",
    caption: "Bathroom fixture replacement",
    downloadPath:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=960&h=720&q=80",
    likeCount: 11,
    demo: true,
  },
  {
    id: "demo-living",
    caption: "Living room refresh and paint",
    downloadPath:
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=960&h=720&q=80",
    likeCount: 9,
    demo: true,
  },
  {
    id: "demo-deck",
    caption: "Outdoor deck repair",
    downloadPath:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=960&h=720&q=80",
    likeCount: 14,
    demo: true,
  },
  {
    id: "demo-shelving",
    caption: "Built-in shelving and trim",
    downloadPath:
      "https://images.unsplash.com/photo-1503389152951-9f343605f61e?auto=format&fit=crop&w=960&h=720&q=80",
    likeCount: 7,
    demo: true,
  },
  {
    id: "demo-lighting",
    caption: "Lighting upgrade and wiring",
    downloadPath:
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=960&h=720&q=80",
    likeCount: 6,
    demo: true,
  },
];

const demoBaseCounts = Object.fromEntries(
  demoPortfolioItems.map((item) => [item.id, item.likeCount ?? 0]),
) as Record<string, number>;

function readDemoLikes(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(DEMO_LIKES_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeDemoLikes(likes: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_LIKES_KEY, JSON.stringify(likes));
}

function applyDemoReactionState(items: ProviderPortfolioItem[]): ProviderPortfolioItem[] {
  const likes = readDemoLikes();
  return items.map((item) => {
    if (!item.demo) return item;
    const liked = Boolean(likes[item.id]);
    const baseCount = demoBaseCounts[item.id] ?? 0;
    return {
      ...item,
      liked,
      likeCount: baseCount + (liked ? 1 : 0),
    };
  });
}

export function withDemoPortfolio(items: ProviderPortfolioItem[]): ProviderPortfolioItem[] {
  if (items.length > 0 || process.env.NODE_ENV !== "development") {
    return items;
  }

  return applyDemoReactionState(demoPortfolioItems);
}

export function isDemoPortfolio(items: ProviderPortfolioItem[], sourceCount: number): boolean {
  return sourceCount === 0 && items.length > 0 && process.env.NODE_ENV === "development";
}

export function toggleDemoPortfolioLike(
  items: ProviderPortfolioItem[],
  itemId: string,
): ProviderPortfolioItem[] {
  const likes = readDemoLikes();
  likes[itemId] = !likes[itemId];
  if (!likes[itemId]) delete likes[itemId];
  writeDemoLikes(likes);
  return applyDemoReactionState(items);
}
