# Infra (V1)

## Philosophy
Start minimal and cheap:
- serverless over clusters
- managed services over ops
- infra automation when it pays off

## V1 Components
- Cloud Run: api_fastapi, ingest_worker
- Pub/Sub: ingest queue
- Cloud Scheduler: hourly trigger
- Cloud Storage: raw provider JSON
- BigQuery: curated table + ingest runs
- Firestore: serving + profiles
- Firebase Auth: Google + Apple

## ClickOps vs Terraform
V1 suggestion:
- Use minimal ClickOps to bootstrap fast
- Document every setting in /docs and keep notes in /infra/bootstrap_notes/
- Add Terraform in V1.1 when stable

## Cost Controls
- Ingest only 1 location in V1
- Hourly schedule only
- Cache served forecast in Firestore
- Keep scoring on-device
