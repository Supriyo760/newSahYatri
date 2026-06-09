# SahYatri: AI-Powered Intelligent Travel Companion Network 

SahYatri is a next-generation travel platform built to revolutionize how people plan trips, find travel companions, and manage their safety abroad. Built with a robust **Next.js** monolith and a **Python FastAPI** AI microservice, SahYatri leverages advanced machine learning (K-Means Clustering, Random Forests, XGBoost) to form highly compatible travel groups, dynamically replan itineraries, and ensure medical safety.

---

##  Features

- **AI Matchmaking**: Forms optimal 3-5 person travel groups based on Big Five personality traits, travel styles, and budget preferences using K-Means clustering.
- **Dynamic Replanner**: Automatically adjusts itineraries in real-time in response to severe weather, heavy traffic, or disruptive local events.
- **Medical Risk Engine**: Proactively flags medical incompatibilities (e.g., altitude sickness risk vs. destination) using a Random Forest model, and provides interactive first-aid decision trees.
- **Hidden Gem Discovery**: XGBoost-powered algorithm that scores locations based on authenticity, local endorsements, and low tourist density.
- **Real-Time Chat & Sentiment**: Socket.io powered anonymous pre-match chatting with live NLP sentiment analysis to ensure safe interactions.
- **Freemium Tier & Payments**: Stripe and Razorpay integrations for seamless premium upgrades (unlocking AI Chatbots and advanced gem insights).

---

##  Architecture

SahYatri uses a hybrid architecture:
1. **Frontend / Core Backend**: [Next.js 16.2.6 (App Router)](https://nextjs.org/) with React 19. Handles UI, auth, database ORM (Drizzle), and core business logic.
2. **AI Microservice**: [Python FastAPI](https://fastapi.tiangolo.com/). Handles heavy ML workloads (Scikit-Learn, XGBoost, Transformers).
3. **Database**: [PostgreSQL](https://www.postgresql.org/).

Read the detailed [Technical Architecture Document (ARCHITECTURE.md)](./ARCHITECTURE.md) for a deep dive into the stack.

---

##  Local Deployment Instructions

The easiest way to run the entire stack (Next.js, FastAPI, and PostgreSQL) locally is by using **Docker Compose**.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/) installed.
- Git installed.

### Step 1: Clone the repository
```bash
git clone https://github.com/Supriyo760/SahYatri-New.git
cd SahYatri-New
```

### Step 2: Environment Variables
Create a `.env.local` file in the root directory. You can use the provided template or set up minimum required variables:
```env
# .env.local
DATABASE_URL=postgres://user:password@db:5432/sahyatri
NEXT_PUBLIC_API_URL=http://localhost:3000

# NextAuth (Generate a secret using: openssl rand -base64 32)
NEXTAUTH_SECRET=your_super_secret_string
NEXTAUTH_URL=http://localhost:3000

# Payments (Optional for local dev)
STRIPE_SECRET_KEY=sk_test_...
RAZORPAY_KEY_ID=rzp_test_...
```

### Step 3: Run with Docker Compose
Run the following command from the root directory:
```bash
docker-compose up --build
```
*(If you are using Docker Desktop v4+, you can just use `docker compose up --build`)*

**This command will automatically:**
1. Pull a clean PostgreSQL image and set up the database on port `5432`.
2. Install Python dependencies and boot the FastAPI AI Brain on port `8000`.
3. Build the Next.js app in standalone mode and start the web server on port `3000`.

### Step 4: Access the Application
- **SahYatri Web App**: [http://localhost:3000](http://localhost:3000)
- **FastAPI ML Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

To stop the servers, press `Ctrl + C` in the terminal, or run:
```bash
docker-compose down
```

---

##  Manual Development Mode (Without Docker)

If you prefer to run the services natively for hot-reloading and development:

### 1. Database
Ensure you have PostgreSQL running locally and create a database named `sahyatri`. Update your `.env.local` with your local Postgres credentials.

### 2. Python AI Service
```bash
cd python-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Next.js Web App
In a new terminal (from the project root):
```bash
npm install
npm run dev
```

---

##  Testing

The platform includes automated test suites for both services:

**Next.js Frontend (Jest + React Testing Library):**
```bash
npm run test
```

**Python AI Service (Pytest):**
```bash
cd python-service
pytest
```

**E2E / Load Testing:**
- Playwright E2E: `npx playwright test`
- JMeter Load Testing: `jmeter -n -t tests/load/sahyatri_load_plan.jmx`

---

##  Documentation Deliverables

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Full system design.
- [MEDICAL_HANDBOOK.md](./MEDICAL_HANDBOOK.md) - Standard Operating Procedures for medical features.
- [generate_synthetic_data.py](./scripts/generate_synthetic_data.py) - Script to procedurally generate 10k users for academic validation.
