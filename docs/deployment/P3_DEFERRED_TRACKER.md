# P3 Deferred Items Tracker

> These 6 items are intentionally postponed. Each has a specific **trigger event** — implement only when that trigger occurs.

| #   | Item                             | Effort                  | Trigger                                             | Status         |
| --- | -------------------------------- | ----------------------- | --------------------------------------------------- | -------------- |
| 6.1 | cornerstone3D DICOM Viewer       | XL (2–4 days)           | Clinic requests DICOM import from imaging equipment | ⬜ Not started |
| 6.2 | ClamAV Virus Scanning            | M (4–8 hours)           | Security audit or compliance requirement            | ⬜ Not started |
| 6.3 | Security Anomaly Detection       | L–XL (1–4 days)         | HIPAA compliance audit                              | ⬜ Not started |
| 6.4 | Patient Checkout (Stripe/Paymob) | XL (multi-layer)        | Clinic requests online patient payments             | ⬜ Not started |
| 6.5 | Disaster Recovery Automation     | XL (infra + monitoring) | Production deployment at scale                      | ⬜ Not started |
| 6.6 | Barcode Scanning (React Native)  | M                       | Phase 7 Mobile App kickoff                          | ⬜ Not started |

---

## Details

### 6.1 cornerstone3D DICOM Viewer

- Replace current image viewer with cornerstone3D for medical DICOM support (X-rays, CT scans)
- Dependencies: `@cornerstonejs/core`, `@cornerstonejs/streaming-image-volume-loader`, `@cornerstonejs/tools`

### 6.2 ClamAV Virus Scanning

- Scan uploaded files for malware before S3 storage
- Add `clamav` Docker service, integrate in upload middleware

### 6.3 Security Anomaly Detection

- Detect suspicious login patterns: new device, impossible travel, off-hours access
- Rule-based (L effort) or ML-based (XL effort)

### 6.4 Patient Checkout

- Patient-facing payment page for invoice settlement
- Stripe Checkout or Paymob iframe, configured per-tenant

### 6.5 Disaster Recovery Automation

- Multi-region MongoDB replica sets, automated failover
- RTO/RPO monitoring dashboards

### 6.6 Barcode Scanning

- Camera-based barcode scanning for inventory on mobile
- Depends on Phase 7 (Mobile App) starting
