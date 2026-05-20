// src/db/schema.ts
import {
  pgTable, pgEnum, text, integer, real, boolean,
  timestamp, jsonb, uuid, varchar, index, uniqueIndex
} from 'drizzle-orm/pg-core';

// ─── ENUMS ───────────────────────────────────────────────────────────────────

export const travelStyleEnum = pgEnum('travel_style', [
  'adventure', 'cultural', 'relaxation', 'culinary', 'mixed'
]);

export const budgetLevelEnum = pgEnum('budget_level', [
  'minimal', 'average', 'premium'
]);

export const groupStatusEnum = pgEnum('group_status', [
  'forming', 'planning', 'active', 'completed', 'dissolved'
]);

export const tripStatusEnum = pgEnum('trip_status', [
  'draft', 'planning', 'confirmed', 'active', 'completed', 'cancelled'
]);

export const itineraryItemTypeEnum = pgEnum('itinerary_item_type', [
  'attraction', 'food', 'transport', 'rest', 'hidden_gem',
  'medical_stop', 'accommodation'
]);

export const messageTypeEnum = pgEnum('message_type', [
  'text', 'system', 'location', 'emergency', 'image'
]);

export const memberRoleEnum = pgEnum('member_role', ['creator', 'member']);

export const expenseSplitEnum = pgEnum('expense_split', ['equal', 'custom']);

export const authProviderEnum = pgEnum('auth_provider', [
  'credentials', 'google', 'github'
]);

// ─── USERS ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: text('password_hash'),
  name: varchar('name', { length: 100 }).notNull(),
  avatarUrl: text('avatar_url'),
  age: integer('age'),
  gender: varchar('gender', { length: 20 }),
  nationality: varchar('nationality', { length: 100 }),
  authProvider: authProviderEnum('auth_provider').default('credentials'),
  isVerified: boolean('is_verified').default(false),
  isOnboarded: boolean('is_onboarded').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex('users_email_idx').on(t.email),
}));

// ─── PERSONALITY PROFILES ─────────────────────────────────────────────────────

export const personalityProfiles = pgTable('personality_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Big Five traits (0.0 - 1.0)
  openness: real('openness').notNull(),
  conscientiousness: real('conscientiousness').notNull(),
  extraversion: real('extraversion').notNull(),
  agreeableness: real('agreeableness').notNull(),
  neuroticism: real('neuroticism').notNull(),

  // Travel preferences
  travelStyle: travelStyleEnum('travel_style').notNull(),
  riskTolerance: integer('risk_tolerance').notNull(), // 1-5
  budgetLevel: budgetLevelEnum('budget_level').notNull(),
  preferredGroupSize: integer('preferred_group_size').default(4), // 3-5
  languagesSpoken: text('languages_spoken').array(),

  // Food preferences (stored as jsonb)
  // Shape: { street_food: bool, fine_dining: bool, vegetarian: bool,
  //           vegan: bool, halal: bool, kosher: bool, gluten_free: bool }
  foodPreferences: jsonb('food_preferences'),

  // Interests array: ['hiking', 'museums', 'photography', ...]
  interests: text('interests').array(),

  // Embedding vector for similarity search (stored as float array)
  // Computed from all above fields — update whenever profile changes
  embeddingVector: real('embedding_vector').array(),

  completedAt: timestamp('completed_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  userIdx: uniqueIndex('personality_user_idx').on(t.userId),
}));

// ─── MEDICAL PROFILES ─────────────────────────────────────────────────────────
// All sensitive fields are AES-256-GCM encrypted at application layer

export const medicalProfiles = pgTable('medical_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  bloodType: varchar('blood_type', { length: 10 }),

  // ENCRYPTED jsonb fields — never store plaintext
  // Decrypted shape for conditions:
  // [{ name: string, severity: 'mild'|'moderate'|'severe', notes: string }]
  conditionsEncrypted: text('conditions_encrypted'),

  // Decrypted shape for medications:
  // [{ name: string, dosage: string, schedule: string, notes: string }]
  medicationsEncrypted: text('medications_encrypted'),

  // Decrypted shape for allergies:
  // [{ allergen: string, severity: string, response: string, epipen: bool }]
  allergiesEncrypted: text('allergies_encrypted'),

  // Decrypted shape for emergency contacts:
  // [{ name: string, phone: string, relationship: string, isPrimary: bool }]
  emergencyContactsEncrypted: text('emergency_contacts_encrypted'),

  firstAidNotesEncrypted: text('first_aid_notes_encrypted'),

  // Non-sensitive: what to show in group medical overview
  // e.g., ['diabetes', 'severe-nut-allergy'] — no detail, just category
  conditionCategories: text('condition_categories').array(),

  shareWithGroup: boolean('share_with_group').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  userIdx: uniqueIndex('medical_user_idx').on(t.userId),
}));

// ─── TRAVEL GROUPS ────────────────────────────────────────────────────────────

export const travelGroups = pgTable('travel_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  status: groupStatusEnum('status').default('forming'),
  maxMembers: integer('max_members').default(4),
  destination: varchar('destination', { length: 200 }),
  tripStartDate: timestamp('trip_start_date'),
  tripEndDate: timestamp('trip_end_date'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  compatibilityScore: real('compatibility_score'),
  inviteCode: varchar('invite_code', { length: 12 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  inviteCodeIdx: uniqueIndex('group_invite_code_idx').on(t.inviteCode),
}));

// ─── GROUP MEMBERS ────────────────────────────────────────────────────────────

export const groupMembers = pgTable('group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => travelGroups.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: memberRoleEnum('role').default('member'),
  medicalSharingConsent: boolean('medical_sharing_consent').default(false),
  joinedAt: timestamp('joined_at').defaultNow(),
}, (t) => ({
  uniqueMembership: uniqueIndex('unique_group_member').on(t.groupId, t.userId),
  groupIdx: index('group_members_group_idx').on(t.groupId),
}));

// ─── COMPATIBILITY SCORES CACHE ───────────────────────────────────────────────

export const compatibilityScores = pgTable('compatibility_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  userAId: uuid('user_a_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userBId: uuid('user_b_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  overallScore: real('overall_score').notNull(),
  personalityScore: real('personality_score'),
  budgetScore: real('budget_score'),
  foodScore: real('food_score'),
  travelStyleScore: real('travel_style_score'),
  computedAt: timestamp('computed_at').defaultNow(),
}, (t) => ({
  pairIdx: uniqueIndex('compat_pair_idx').on(t.userAId, t.userBId),
}));

// ─── TRIPS ────────────────────────────────────────────────────────────────────

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => travelGroups.id, { onDelete: 'cascade' }),
  destination: varchar('destination', { length: 200 }).notNull(),
  destinationLat: real('destination_lat'),
  destinationLng: real('destination_lng'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  durationDays: integer('duration_days').notNull(),
  status: tripStatusEnum('status').default('draft'),
  totalBudget: real('total_budget'),
  perPersonBudget: real('per_person_budget'),
  currency: varchar('currency', { length: 3 }).default('USD'),
  hiddenGemMode: boolean('hidden_gem_mode').default(false), // true if durationDays >= 5
  generationPromptUsed: text('generation_prompt_used'), // store for debugging
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── ITINERARY DAYS ───────────────────────────────────────────────────────────

export const itineraryDays = pgTable('itinerary_days', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  dayNumber: integer('day_number').notNull(),
  date: timestamp('date').notNull(),
  theme: varchar('theme', { length: 200 }),
  weatherForecast: jsonb('weather_forecast'),
  notes: text('notes'),
}, (t) => ({
  tripDayIdx: uniqueIndex('itinerary_trip_day_idx').on(t.tripId, t.dayNumber),
}));

// ─── ITINERARY ITEMS ──────────────────────────────────────────────────────────

export const itineraryItems = pgTable('itinerary_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  dayId: uuid('day_id').notNull().references(() => itineraryDays.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  type: itineraryItemTypeEnum('type').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  locationName: varchar('location_name', { length: 200 }),
  lat: real('lat'),
  lng: real('lng'),
  googlePlaceId: varchar('google_place_id', { length: 100 }),
  estimatedDurationMinutes: integer('estimated_duration_minutes'),
  estimatedCostPerPerson: real('estimated_cost_per_person'),
  isHiddenGem: boolean('is_hidden_gem').default(false),
  gemScore: real('gem_score'),
  openingHours: text('opening_hours'),
  photoUrl: text('photo_url'),
  tips: text('tips'),
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),
});

// ─── MESSAGES ─────────────────────────────────────────────────────────────────

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => travelGroups.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').references(() => users.id),
  content: text('content').notNull(),
  type: messageTypeEnum('type').default('text'),
  sentimentScore: real('sentiment_score'),
  metadata: jsonb('metadata'), // for location pins, emergency data, etc.
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  groupIdx: index('messages_group_idx').on(t.groupId),
  createdAtIdx: index('messages_created_at_idx').on(t.createdAt),
}));

// ─── EXPENSES ─────────────────────────────────────────────────────────────────

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  paidBy: uuid('paid_by').notNull().references(() => users.id),
  amount: real('amount').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  description: varchar('description', { length: 300 }).notNull(),
  category: varchar('category', { length: 50 }), // food/transport/attraction/other
  splitType: expenseSplitEnum('split_type').default('equal'),
  // For custom splits: { userId: amount }
  splits: jsonb('splits'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── RESTAURANTS ──────────────────────────────────────────────────────────────
// Local cache of Google Places data to reduce API calls

export const restaurants = pgTable('restaurants', {
  id: uuid('id').primaryKey().defaultRandom(),
  googlePlaceId: varchar('google_place_id', { length: 100 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  cuisineTypes: text('cuisine_types').array(),
  priceLevel: integer('price_level'), // 1-4 (Google's scale)
  rating: real('rating'),
  totalRatings: integer('total_ratings'),
  lat: real('lat'),
  lng: real('lng'),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  country: varchar('country', { length: 100 }),
  specialties: text('specialties').array(),
  isLocalGem: boolean('is_local_gem').default(false),
  gemScore: real('gem_score'),
  photoUrl: text('photo_url'),
  openingHours: jsonb('opening_hours'),
  lastFetchedAt: timestamp('last_fetched_at').defaultNow(),
}, (t) => ({
  placeIdIdx: uniqueIndex('restaurants_place_id_idx').on(t.googlePlaceId),
  cityIdx: index('restaurants_city_idx').on(t.city),
}));

// ─── HIDDEN GEMS ──────────────────────────────────────────────────────────────

export const hiddenGems = pgTable('hidden_gems', {
  id: uuid('id').primaryKey().defaultRandom(),
  googlePlaceId: varchar('google_place_id', { length: 100 }),
  name: varchar('name', { length: 200 }).notNull(),
  category: varchar('category', { length: 100 }), // scenic/artisan/cafe/historical/natural
  description: text('description'),
  story: text('story'), // Why this place is special
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  city: varchar('city', { length: 100 }),
  country: varchar('country', { length: 100 }),
  gemScore: real('gem_score').notNull(),
  authenticityScore: real('authenticity_score'),
  touristDensityScore: real('tourist_density_score'), // lower = better gem
  localEndorsements: integer('local_endorsements').default(0),
  photoUrl: text('photo_url'),
  bestTimeToVisit: varchar('best_time_to_visit', { length: 100 }),
  tips: text('tips'),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  cityIdx: index('hidden_gems_city_idx').on(t.city),
  scoreIdx: index('hidden_gems_score_idx').on(t.gemScore),
}));

// ─── PRE-MATCHING CHATS ───────────────────────────────────────────────────────
// Anonymous chats before group is formed

export const preMatchChats = pgTable('pre_match_chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  initiatorId: uuid('initiator_id').notNull().references(() => users.id),
  recipientId: uuid('recipient_id').notNull().references(() => users.id),
  isAnonymous: boolean('is_anonymous').default(true),
  status: varchar('status', { length: 20 }).default('active'), // active/ended
  overallSentiment: real('overall_sentiment'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const preMatchMessages = pgTable('pre_match_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').notNull().references(() => preMatchChats.id),
  senderId: uuid('sender_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  sentimentScore: real('sentiment_score'),
  createdAt: timestamp('created_at').defaultNow(),
});
