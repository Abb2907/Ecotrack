#!/usr/bin/env bash
# EcoTrack Google Cloud Platform Provisioning Script (v2)
# Enforces low-carbon region selection and strict IAM scoping.

set -euo pipefail

# Configurations
PROJECT_ID="gen-lang-client-0849880096"
REGION="us-central1" # Low-carbon region
BILLING_ACCOUNT="YOUR_BILLING_ACCOUNT_ID"

echo "=== Creating GCP Project: ${PROJECT_ID} ==="
gcloud projects create "${PROJECT_ID}" --name="EcoTrack"

echo "=== Linking Billing Account ==="
gcloud beta billing projects link "${PROJECT_ID}" --billing-account="${BILLING_ACCOUNT}"

echo "=== Enabling GCP APIs ==="
gcloud services enable \
    firestore.googleapis.com \
    secretmanager.googleapis.com \
    aiplatform.googleapis.com \
    run.googleapis.com \
    bigquery.googleapis.com \
    cloudbuild.googleapis.com \
    iam.googleapis.com \
    cloudresourcemanager.googleapis.com \
    identitytoolkit.googleapis.com \
    artifactregistry.googleapis.com \
    logging.googleapis.com \
    monitoring.googleapis.com \
    cloudtrace.googleapis.com \
    --project="${PROJECT_ID}"

echo "=== Provisioning Firestore in Native Mode ==="
gcloud firestore databases create \
    --project="${PROJECT_ID}" \
    --location="${REGION}" \
    --type=firestore-native

echo "=== Initializing Firebase on the GCP Project ==="
# Requires the Firebase CLI (firebase-tools) to be installed and authenticated separately.
# This step is what actually turns the GCP project into a usable Firebase project —
# enabling identitytoolkit.googleapis.com alone does NOT do this.
firebase projects:addfirebase "${PROJECT_ID}"

echo "=== Creating Artifact Registry Repository (for Cloud Build image pushes) ==="
gcloud artifacts repositories create ecotrack-images \
    --repository-format=docker \
    --location="${REGION}" \
    --description="EcoTrack frontend/backend container images" \
    --project="${PROJECT_ID}"

echo "=== Creating Scoped Service Accounts ==="
gcloud iam service-accounts create ecotrack-frontend-sa \
    --description="Service account for EcoTrack Frontend Cloud Run service" \
    --display-name="ecotrack-frontend-sa" \
    --project="${PROJECT_ID}"

gcloud iam service-accounts create ecotrack-backend-sa \
    --description="Service account for EcoTrack Backend Cloud Run service" \
    --display-name="ecotrack-backend-sa" \
    --project="${PROJECT_ID}"

echo "=== Granting Scoped IAM Permissions (Backend) ==="
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:ecotrack-backend-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/datastore.user"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:ecotrack-backend-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:ecotrack-backend-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:ecotrack-backend-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/bigquery.dataEditor"

echo "=== NOTE: Frontend → Backend invocation permission ==="
# roles/run.invoker must be granted on the BACKEND Cloud Run *service* specifically,
# not at the project level — the service does not exist yet at provisioning time.
# Run this once the backend service is deployed (Phase 4 deploy script):
#
#   gcloud run services add-iam-policy-binding ecotrack-backend \
#       --member="serviceAccount:ecotrack-frontend-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
#       --role="roles/run.invoker" \
#       --region="${REGION}" \
#       --project="${PROJECT_ID}"

echo "=== Creating Secret Manager Placeholder for Anonymization Key ==="
# The actual key value is generated and set separately (never echoed into shell history or logs).
gcloud secrets create anonymization-hmac-key \
    --replication-policy="automatic" \
    --project="${PROJECT_ID}"

echo "=== Setup Complete ==="
