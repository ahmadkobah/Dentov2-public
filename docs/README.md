# Dento V2 — Documentation

## Directory Structure

```
docs/
├── architecture/      Core design, planning & technical decisions
├── screens/           UI screen specifications & integration guides
├── security/          Security policies, HIPAA/GDPR compliance & audits
├── testing/           Test strategy, trackers & analysis reports
├── deployment/        Deployment guides & environment setup
├── audits/            Phase-by-phase compliance & implementation audits
│   ├── admin-pages/   Admin portal frontend audits
│   ├── api-hooks/     API route & hook inventory audits
│   ├── developer-pages/ Developer portal audits
│   ├── phase-3/       Phase 3 compliance audits
│   ├── phase-4/       Phase 4 compliance audits
│   ├── phase-5/       Phase 5 compliance audits
│   ├── phase-6/       Phase 6 compliance audits
│   └── phase-7/       Phase 7 compliance audits
└── archive/           Historical reports & earlier audit snapshots
```

## Quick Links

### Architecture & Planning

| Document                                                                    | Description                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------ |
| [DENTO_V2_MASTER_PLAN.md](architecture/DENTO_V2_MASTER_PLAN.md)             | Overall project vision, goals & scope            |
| [TECH_REQUIREMENTS.md](architecture/TECH_REQUIREMENTS.md)                   | Technology stack & technical requirements        |
| [V2_DATABASE.md](architecture/V2_DATABASE.md)                               | Database schema design                           |
| [V2_STRUCTURE.md](architecture/V2_STRUCTURE.md)                             | Project structure & monorepo layout              |
| [V2_DECISION_LOG.md](architecture/V2_DECISION_LOG.md)                       | Architecture decision records                    |
| [IMPLEMENTATION_ROADMAP.md](architecture/IMPLEMENTATION_ROADMAP.md)         | Phase-by-phase implementation roadmap            |
| [BUILD_RULES.md](architecture/BUILD_RULES.md)                               | Build rules & coding conventions                 |
| [PLATFORM_RBAC.md](architecture/PLATFORM_RBAC.md)                           | Role-based access control (implemented)          |
| [DOCTOR_PORTAL_GAP_ANALYSIS.md](architecture/DOCTOR_PORTAL_GAP_ANALYSIS.md) | Doctor portal gap analysis & implementation plan |
| [AI_AGENT_PLATFORM_PLAN.md](architecture/AI_AGENT_PLATFORM_PLAN.md)         | Self-hosted AI agent platform plan               |

### Screens & UI

| Document                                                               | Description                            |
| ---------------------------------------------------------------------- | -------------------------------------- |
| [ADMIN_PORTAL_SCREENS.md](screens/ADMIN_PORTAL_SCREENS.md)             | Admin portal screen specifications     |
| [DEV_PORTAL_SCREENS.md](screens/DEV_PORTAL_SCREENS.md)                 | Developer portal screen specifications |
| [ONLINE_BOOKING_INTEGRATION.md](screens/ONLINE_BOOKING_INTEGRATION.md) | Online booking integration guide       |

### Security

| Document                                                          | Description                            |
| ----------------------------------------------------------------- | -------------------------------------- |
| [SECURITY_AND_ENCRYPTION.md](security/SECURITY_AND_ENCRYPTION.md) | Encryption, hashing & key management   |
| [HIPAA_GDPR_COMPLIANCE.md](security/HIPAA_GDPR_COMPLIANCE.md)     | HIPAA & GDPR compliance requirements   |
| [SECURITY_AUDIT_RESULTS.md](security/SECURITY_AUDIT_RESULTS.md)   | Security audit findings & remediations |

### Testing

| Document                                                                           | Description                       |
| ---------------------------------------------------------------------------------- | --------------------------------- |
| [E2E_TEST_ANALYSIS_REPORT.md](testing/E2E_TEST_ANALYSIS_REPORT.md)                 | E2E test coverage analysis        |
| [PHASE2_E2E_TEST_TRACKER.md](testing/PHASE2_E2E_TEST_TRACKER.md)                   | Phase 2 E2E test tracker          |
| [PHASE3_API_CONTRACT_TEST_TRACKER.md](testing/PHASE3_API_CONTRACT_TEST_TRACKER.md) | Phase 3 API contract test tracker |

### Deployment

| Document                                                          | Description                    |
| ----------------------------------------------------------------- | ------------------------------ |
| [DEPLOYMENT.md](deployment/DEPLOYMENT.md)                         | Deployment guide & checklist   |
| [MISSING_ENV_VARS_AUDIT.md](deployment/MISSING_ENV_VARS_AUDIT.md) | Environment variable audit     |
| [P3_DEFERRED_TRACKER.md](deployment/P3_DEFERRED_TRACKER.md)       | Phase 3 deferred items tracker |

## Stale — Do Not Trust

`docs/archive/**` and per-phase `docs/audits/**` are point-in-time snapshots of closed phases — do not rely on them for current state. Authority order (per `BUILD_RULES.md` §1): [V2_DECISION_LOG.md](architecture/V2_DECISION_LOG.md) overrides all other docs.
