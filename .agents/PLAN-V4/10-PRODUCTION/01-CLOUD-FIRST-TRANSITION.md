# Cloud / SaaS Transition

Baseline documental: operação local-first.

Isso não deve ser confundido com produto SaaS pronto para produção multi-tenant.

## Target

Managed PostgreSQL + pgvector
+
Redis
+
Workers
+
CI/CD
+
Secrets
+
Observability
+
Backup
+
DR

## Sequence

1. local reproducibility;
2. managed staging;
3. migration rehearsal;
4. worker/Redis resilience;
5. observability;
6. backup/restore;
7. DR;
8. production cutover.

Kubernetes é opcional e posterior.
