# EcoTrack

EcoTrack is a production-grade web application to help individuals understand, track, and reduce their carbon footprint.

## Tech Stack
- **Frontend**: Next.js (React) + TypeScript + Tailwind CSS
- **Backend**: FastAPI (Python) + Firestore (GCP Native Mode) + BigQuery (Aggregated Anonymized Telemetry)
- **AI**: Vertex AI (Gemini) for weekly personalized recommendation generation
- **Auth**: Firebase Authentication (Google Sign-In, Email/Password)
- **Security & Privacy**: Strict 7-day deletion grace period, self-serve data export/deletion, and HMAC-SHA256 user ID hashing prior to BigQuery streaming.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.11+)
- GCP CLI (`gcloud`)
- Firebase CLI (`firebase`)

### Setup and Running Locally

1. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. **Backend Setup**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

## Production Deployment
Refer to `infrastructure/gcp_provision.sh` for initial Google Cloud Platform resources provisioning.
