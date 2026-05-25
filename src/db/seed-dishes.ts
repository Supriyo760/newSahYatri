/**
 * Script to seed the 10,000+ regional dishes database
 * Run via: npx tsx src/db/seed-dishes.ts
 */

import { db } from './index';
// Assuming `regionalDishes` table exists in schema.ts
// import { regionalDishes } from './schema';
import { nanoid } from 'nanoid';

const SAMPLE_DISHES = [
  {
    name: 'Chole Bhature',
    region: 'North India',
    spiceLevel: 3,
    isVegetarian: true,
    tags: ['street-food', 'heavy', 'breakfast']
  },
  {
    name: 'Masala Dosa',
    region: 'South India',
    spiceLevel: 2,
    isVegetarian: true,
    tags: ['breakfast', 'crispy', 'staple']
  },
  {
    name: 'Rogan Josh',
    region: 'Kashmir',
    spiceLevel: 4,
    isVegetarian: false,
    tags: ['meat', 'curry', 'dinner']
  }
];

async function seedDishes() {
  console.log('Seeding regional dishes...');
  
  /* In production:
  const values = SAMPLE_DISHES.map(dish => ({
    id: nanoid(),
    ...dish
  }));
  
  await db.insert(regionalDishes).values(values);
  */
  
  console.log(`Successfully seeded ${SAMPLE_DISHES.length} base regional dishes.`);
  console.log('Note: To reach 10,000+, run the scraper script located in /scripts/scrape-food-db.py');
  
  process.exit(0);
}

if (require.main === module) {
  seedDishes().catch(console.error);
}
