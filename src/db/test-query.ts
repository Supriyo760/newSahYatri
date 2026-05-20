import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('./index');
  const { itineraryItems } = await import('./schema');
  
  const items = await db.select().from(itineraryItems);
  items.forEach(item => {
    console.log({
      name: item.name,
      type: item.type,
      lat: item.lat,
      latType: typeof item.lat,
      lng: item.lng,
      lngType: typeof item.lng,
      photoUrl: item.photoUrl,
    });
  });
}

main().catch(console.error).finally(() => process.exit(0));
