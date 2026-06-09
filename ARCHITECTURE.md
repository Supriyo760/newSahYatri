# SahYatri Technical Architecture

## 1. System Overview
SahYatri is an "AI-Powered Intelligent Travel Companion Network". It is designed to match strangers based on 18-dimensional embedding vectors (personality, budget, travel style) and securely form optimal travel groups using greedy constraint-satisfaction algorithms.

## 2. Monolithic + Microservice Hybrid
The system utilizes a split architecture:
- **Next.js Frontend & Core API**: Handles authentication (NextAuth), UI rendering (App Router), PostgreSQL database communication (Drizzle ORM), and real-time Socket.io connections.
- **Python FastAPI Microservice (The "Brain")**: A dedicated container running Scikit-Learn, XGBoost, and Transformers for heavy algorithmic lifting.

## 3. Data Layer
- **PostgreSQL**: Primary datastore.
- **Drizzle ORM**: Used for type-safe schema definitions (`src/db/schema.ts`).
- **AES-256-GCM Encryption**: Medical profiles and emergency contacts are encrypted at rest using Node.js native `crypto.createCipheriv` with AES-256-GCM authenticated encryption to prevent tampering.

## 4. Real-Time Interactions (Socket.io)
Socket.io is initialized in `server.ts` alongside Next.js. It powers:
- Instant group messaging
- Live GPS location sharing for the `LiveLocationMap`
- Real-time `CollaborativeItineraryBuilder` state syncing
- SOS Emergency broadcasts

## 5. Algorithmic Stack
1. **K-Means Clustering**: Partitions massive user pools into 3-5 person groups based on embeddings.
2. **Random Forest**: Predicts the probability of interpersonal conflict (0.0 to 1.0) and assesses medical risks based on destinations.
3. **XGBoost**: Classifies "Hidden Gems" vs "Tourist Traps" based on review counts and tourist density indexes.
4. **Cosine Similarity**: Matches users to restaurants based on 10-dimensional food preference vectors.
5. **Custom Dijkstra**: A specialized shortest-path routing algorithm that applies real-time traffic delay multipliers (fetched from Google Maps API) to avoid dynamically congested edges.

## 6. Background Jobs
Node.js worker scripts (`src/workers/`) are invoked via cron:
- `alerts-cron.ts`: Runs `checkAndReplanItinerary()` every 15 mins to proactively reroute trips if severe weather is detected via OpenWeather API.
- `medication-cron.ts`: Evaluates medication schedules and dispatches W3C Web Push Notification payloads.
