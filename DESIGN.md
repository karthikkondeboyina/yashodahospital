# DESIGN — AI Hospital Appointment Assistant

## Design Goal
Create a modern, trustworthy, accessible healthcare experience rather than a generic chatbot.

Priorities: clarity, trust, accessibility, responsiveness, and fast interaction.

## Initial Screen
Include hospital/assistant identity, short purpose statement, chat area, composer, send button, loading state, and a calm emergency notice.

## Chat
Clearly distinguish patient and assistant messages. Include readable typography, accessible contrast, visible focus states, loading feedback, and disabled send state while processing.

## Appointment UI
Use doctor cards or selectable rows with doctor name, department, campus, and consultation information. Show available slots as selectable buttons. Do not show booked slots as available. Refresh/recheck availability before confirmation.

## Patient Form
Collect full name, mobile number, campus, date, and time. Validate inline with simple patient-friendly messages.

## Confirmation
Show booking reference, doctor, department, campus, date, and time. Include:
“Please arrive 15 minutes early with a valid ID. For changes, call the hospital front desk.”

## Emergency/Error States
Emergency state must remove booking actions and show 105910 and 108. Technical errors must show a friendly message and front desk number, never raw stack traces or database errors.

## Visual Style
Clean healthcare visual language, professional typography, restrained animation, subtle depth, clear hierarchy, and minimal clutter. Avoid excessive gradients, unnecessary 3D effects, and distracting motion.

## Reusable Components
ChatWindow, MessageBubble, Composer, LoadingIndicator, DoctorCard, SlotButton, PatientDetailsForm, ConfirmationCard, EmergencyNotice, ErrorNotice.

## Responsive Requirements
Mobile: comfortable chat, accessible composer, wrapping slot buttons, readable confirmation.
Desktop: centered content with a comfortable maximum width.

## Quota-Safe Design Order
1. Shell
2. Chat window
3. Message states
4. Composer
5. Appointment components
6. Patient form
7. Confirmation
8. Emergency/error states
9. Responsive polish
10. Final refinement
