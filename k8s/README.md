# Kubernetes deployment

1. Build & push the image: `docker build -t REGISTRY/aitp-portal:TAG .`
2. `kubectl apply -f namespace.yaml configmap.yaml` and create the secret
   from `secret.example.yaml` (never commit the filled file).
3. Point `DATABASE_URL` at your managed PostgreSQL 16 (recommended) or an
   in-cluster instance.
4. Run the migration job (`migrate-job.yaml`) — applies migrations + seeds
   reference data only (5 streams, 35 entities, phases, batches, settings;
   users/items start EMPTY).
5. `kubectl apply -f deployment.yaml service.yaml ingress.yaml`
