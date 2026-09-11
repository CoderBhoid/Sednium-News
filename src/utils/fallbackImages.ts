export const CATEGORY_FALLBACK_IMAGES: Record<string, string[]> = {
  top: [
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80',
    'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80',
    'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=800&q=80',
    'https://images.unsplash.com/photo-1557992260-ec58e38d363c?w=800&q=80',
  ],
  general: [
    'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=800&q=80',
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80',
  ],
  technology: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80',
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&q=80',
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
  ],
  world: [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
    'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&q=80',
  ],
  business: [
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
  ],
  politics: [
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&q=80',
    'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80',
    'https://images.unsplash.com/photo-1575320181282-9afab399332c?w=800&q=80',
  ],
  science: [
    'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&q=80',
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    'https://images.unsplash.com/photo-1614935151651-0bea6508db6b?w=800&q=80',
    'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&q=80',
  ],
  health: [
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&q=80',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&q=80',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80',
  ],
  entertainment: [
    'https://images.unsplash.com/photo-1603190287605-e6ade32fa852?w=800&q=80',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
    'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&q=80',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
  ],
  sports: [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80',
    'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80',
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80',
    'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=800&q=80',
  ],
  india: [
    'https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=800&q=80',
    'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80',
    'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&q=80',
  ],
  default: [
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80',
    'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80',
    'https://images.unsplash.com/photo-1432821596592-e2c18b78144f?w=800&q=80',
  ]
};

/**
 * Returns a stable fallback image URL for a category and seed.
 * Providing the title or URL as seed guarantees the same image displays on every render.
 */
export function getCategoryFallbackImage(category: string = 'default', seed: string = ''): string {
  const catKey = (category || 'default').toLowerCase();
  const list = CATEGORY_FALLBACK_IMAGES[catKey] || CATEGORY_FALLBACK_IMAGES.default;
  if (!seed) {
    return list[0];
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % list.length;
  return list[idx];
}
