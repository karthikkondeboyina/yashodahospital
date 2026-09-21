# PRD — AI Hospital Appointment Assistant

## Purpose
Build a patient-facing AI hospital appointment assistant based on the bootcamp hospital workflow, implemented with coded frontend/backend services instead of n8n.

## Constraints
- No n8n.
- No voice integration now; integrate it later through the existing backend.
- Frontend first, backend and database in stages.
- Use small, focused Antigravity tasks to conserve normal quota.
- Keep secrets in environment variables.
- Treat this as a demo/prototype.

## Patient Flow
1. Greet in English, Hindi, or Telugu.
2. Ask the patient's concern.
3. Run an emergency safety gate on every message.
4. If emergency, stop booking and provide emergency guidance.
5. Suggest one approved department.
6. Confirm the department.
7. Offer only doctors from approved knowledge data.
8. Offer only valid consultation dates and available slots.
9. Collect name, valid Indian mobile number, campus, date, and time.
10. Re-check availability immediately before booking.
11. Create one confirmed booking.
12. Return a booking reference and log the conversation.

## Approved Departments
General Medicine, Cardiology, Orthopaedics, Neurology, Gastroenterology, Dermatology, ENT, Gynaecology, Paediatrics, Pulmonology, Urology, Oncology.

## Demo Campuses
Somajiguda, Hitec City, Secunderabad, Malakpet.

## Demo Slots
10:00, 11:00, 12:00, 16:00, 17:00, 18:00. Demo fee: Rs. 800.

## Absolute Booking Requirement
A doctor/date/time combination may have only one confirmed booking.

Unique identity:
`doctor_id + appointment_date + appointment_time`

Enforce this in application logic and at database level using a unique constraint or transactional locking. A simple frontend check is insufficient. If two patients compete for the same slot, only one transaction succeeds; the other receives alternative slots.

## Safety
Never diagnose, prescribe, recommend dosage, or provide medical advice. Emergency examples include chest pain, breathing difficulty, stroke signs, heavy bleeding, unconsciousness, severe injury, and suicidal thoughts. Emergency responses must include 105910 and 108 and must not create bookings.

## Success Criteria
- Chat works responsively.
- English, Hindi, and Telugu are supported.
- Only approved doctors/departments are offered.
- Invalid phones are rejected.
- Unavailable slots cannot be booked.
- Duplicate and concurrent bookings are prevented.
- Conversations are logged.
- Database errors are safely handled.
- Relative dates use Asia/Kolkata.
