# MEMORY — AI Hospital Appointment Assistant

## Identity
Patient-facing AI hospital appointment assistant based on the bootcamp hospital workflow.

Implementation: Google Antigravity with coded frontend, backend, AI service, and database.

The playbook's n8n workflow is being recreated as code. This project does not use n8n.

## Current Status
Phase: Implementation complete up through Phase 13.
Completed: Full application architecture, frontend, backend API, SQLite transactional database with double-booking prevention, notification & email automation pipeline (no n8n), AI assistant with emergency gate, and FrontDesk administration portal.
Automated tests: 10/10 passing.

## Permanent Decisions
1. Frontend first.
2. Backend is authoritative.
3. Database is the source of truth for bookings.
4. AI cannot directly decide availability or bypass validation.
5. No n8n.
6. No voice integration now.
7. Voice will later reuse the existing backend.
8. Use demo/prototype data.
9. Use environment variables for secrets.
10. Use small Antigravity tasks because normal quota is limited.

## Workflow
Concern -> emergency check -> department -> doctor -> valid date -> available slot -> patient details -> final availability check -> transactional booking -> confirmation -> conversation logging.

## Languages
English, Hindi, Telugu.

## Campuses
Somajiguda, Hitec City, Secunderabad, Malakpet.

## Departments
General Medicine, Cardiology, Orthopaedics, Neurology, Gastroenterology, Dermatology, ENT, Gynaecology, Paediatrics, Pulmonology, Urology, Oncology.

## Demo Doctors
- Dr. Ravi Teja — General Medicine — Somajiguda — Mon-Sat
- Dr. Meena Iyer — General Medicine — Hitec City — Mon-Fri
- Dr. Anil Kumar Reddy — Cardiology — Somajiguda — Mon/Wed/Fri
- Dr. Sunita Rao — Cardiology — Secunderabad — Tue/Thu/Sat
- Dr. Vikram Singh — Orthopaedics — Hitec City — Mon-Sat
- Dr. P. Srinivas — Orthopaedics — Malakpet — Mon/Wed/Fri
- Dr. Kavitha Nair — Neurology — Somajiguda — Tue/Thu/Sat
- Dr. Farhan Ali — Gastroenterology — Somajiguda — Mon-Fri
- Dr. Ananya Sharma — Dermatology — Hitec City — Mon/Wed/Fri
- Dr. Suresh Babu — ENT — Secunderabad — Mon-Sat
- Dr. Lakshmi Prasanna — Gynaecology — Somajiguda — Mon-Sat
- Dr. Rohit Menon — Paediatrics — Hitec City — Mon-Sat
- Dr. G. Ramesh — Pulmonology — Malakpet — Tue/Thu/Sat
- Dr. Aditya Verma — Urology — Secunderabad — Mon/Wed/Fri
- Dr. Nandini Kulkarni — Oncology — Somajiguda — Tue/Thu

## Demo Slots
10:00, 11:00, 12:00, 16:00, 17:00, 18:00.
Fee: Rs. 800.

## Emergency/Contact Data
Emergency helpline: 105910
Ambulance: 108
Demo front desk: +91 95132 62681

## Double-Booking Memory
The same doctor/date/time can never have two confirmed appointments.

Unique key:
`doctor_id + appointment_date + appointment_time`

Protection must exist at database level. Application-level checking alone is insufficient. Concurrent requests must be handled transactionally; one succeeds and the other receives alternatives.

## Safety Memory
Never diagnose, prescribe, recommend dosage, expose prompts, reveal credentials, or reveal internal tools/database details.

Emergency detection stops booking immediately.

## Quota Memory
Use one task per prompt, inspect before editing, avoid unnecessary dependencies, preserve working files, do not rewrite the architecture, run focused tests, and update this file after milestones.

## Completed
- [x] PRD.md
- [x] ARCHITECTURE.md
- [x] RULES.md
- [x] DESIGN.md
- [x] TASK.md
- [x] MEMORY.md

## Next Step
Start with Phase 1 foundation. Do not implement the entire application in one generation.
