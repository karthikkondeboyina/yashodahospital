# TASK — AI Hospital Appointment Assistant

## Working Protocol
Before each task, read PRD.md, ARCHITECTURE.md, RULES.md, DESIGN.md, and MEMORY.md. Inspect the current files. Implement only one unchecked task. Test it. Update this file and MEMORY.md. Do not regenerate unrelated code.

## Phase 0 — Documentation
- [x] Confirm all six documents exist.
- [x] Confirm no n8n.
- [x] Confirm voice is out of scope.
- [x] Confirm demo/prototype status.
- [x] Confirm double-booking protection.

## Phase 1 — Foundation
- [x] Create/verify frontend and backend structure.
- [x] Configure environment variables.
- [x] Add .gitignore.
- [x] Add health endpoint.
- [x] Verify frontend and backend start.

## Phase 2 — Frontend
- [x] Build responsive shell.
- [x] Build header.
- [x] Build chat window and message bubbles.
- [x] Build composer.
- [x] Add loading and error states.

## Phase 3 — Chat
- [x] Create session ID.
- [x] Connect frontend to chat endpoint.
- [x] Preserve multi-turn state.
- [x] Handle network errors.

## Phase 4 — Knowledge
- [x] Add departments.
- [x] Add doctors.
- [x] Add campuses and consultation days.
- [x] Add slots and emergency/front desk numbers.
- [x] Prevent invented directory data.

## Phase 5 — AI
- [x] Implement persona.
- [x] Support English, Hindi, and Telugu.
- [x] Implement department selection.
- [x] Implement doctor/date/slot flow.
- [x] Implement medical-advice refusal.
- [x] Implement prompt-injection and out-of-scope handling.
- [x] Implement empty-input handling.

## Phase 6 — Safety
- [x] Run emergency gate on every message.
- [x] Stop booking on emergency.
- [x] Include 105910 and 108.
- [x] Verify no emergency booking is created.

## Phase 7 — Database
- [x] Create doctors data.
- [x] Create slots representation.
- [x] Create bookings.
- [x] Create conversations.
- [x] Add indexes and unique booking constraint.

## Phase 8 — Availability
- [x] Validate doctor/date/day/slot.
- [x] Query available slots.
- [x] Hide booked slots.
- [x] Recheck immediately before booking.

## Phase 9 — Booking
- [x] Validate patient details.
- [x] Normalize phone.
- [x] Use transaction.
- [x] Handle race conditions.
- [x] Return booking reference and confirmation.

## Phase 10 — Logging
- [x] Log all user messages.
- [x] Log all assistant messages.
- [x] Store session IDs and timestamps.

## Phase 11 — UI States
- [x] Doctor selection.
- [x] Slot selection.
- [x] Unavailable state.
- [x] Patient form.
- [x] Confirmation.
- [x] Emergency and technical error states.

## Phase 12 — Tests
- [x] Skin rash -> Dermatology.
- [x] Chest pain -> emergency.
- [x] Medical advice -> refusal.
- [x] Invalid phone -> rejected.
- [x] Invalid consultation day -> alternative.
- [x] Booked slot -> rejected.
- [x] Same doctor/date/time twice -> second rejected.
- [x] Concurrent booking -> only one succeeds.
- [x] Conversation logging.
- [x] Database failure handling.
- [x] Asia/Kolkata relative-date handling.

## Phase 13 — Final Integration
- [x] Frontend/backend/AI/database connected.
- [x] Safety and booking verified.
- [x] Responsive UI verified.
- [x] No secrets committed.
- [x] No n8n or voice dependency.

## Phase 14 — Later Voice Integration
- [ ] Inspect user-provided voice integration.
- [ ] Connect it to existing backend.
- [ ] Reuse existing safety and booking services.
- [ ] Test without duplicating business logic.

## Definition of Done
A task is complete only when code exists, focused tests pass, existing functionality remains intact, the task is checked, and MEMORY.md is updated.
