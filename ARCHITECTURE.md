# ARCHITECTURE — AI Hospital Appointment Assistant

## Principle
Recreate the playbook's n8n workflow as maintainable application code. The backend is authoritative; the AI is not the source of truth for availability or booking.

## Component Mapping
- Chat Trigger -> frontend chat plus backend chat endpoint
- AI Agent -> AI assistant service
- Window Buffer Memory -> server-side session state
- Knowledge document -> versioned hospital knowledge data
- Check Slot -> availability service
- Create Booking -> booking service
- Supabase nodes -> database repository/service
- n8n error handling -> backend error handling

## Layers
### Frontend
Chat UI, message rendering, loading/error states, doctor/slot selection, patient form, confirmation. Never expose secrets or booking authority.

### Backend
Chat orchestration, AI service, safety rules, session manager, availability service, booking service, conversation logging, validation, and error handling.

### Knowledge
Approved departments, doctors, campuses, consultation days, slots, emergency numbers, front desk number, and fee. The AI must never invent directory data.

### Database
Suggested entities:
- doctors: id, name, department, campus, consultation_days, active
- appointment_slots: id, doctor_id, appointment_date, appointment_time, status
- bookings: id, doctor_id, patient_name, phone, department, doctor, campus, appointment_date, appointment_time, slot_datetime, status, notes, created_at
- conversations: id, session_id, role, message, timestamp

## Booking Transaction
1. Validate doctor, date, consultation day, and slot.
2. Lock/check the slot.
3. Confirm it is available.
4. Insert booking.
5. Mark slot booked.
6. Commit.
7. If uniqueness or locking fails, roll back and return an alternative-slot response.

Use a database constraint such as:
`UNIQUE(doctor_id, appointment_date, appointment_time)`

## Suggested APIs
POST /api/chat
POST /api/sessions
GET /api/doctors
GET /api/doctors/:id/slots
POST /api/bookings/check
POST /api/bookings
GET /api/bookings/:id
POST /api/conversations

## Security
Use environment variables, validate backend inputs, do not expose keys/system prompts/database errors, and add rate limiting where practical.

## Future Voice
Voice is out of scope now. Later it must call the same chat, safety, availability, and booking services rather than duplicate business logic.
