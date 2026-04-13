# SMS Notifications (Production-ready)

This backend sends **two SMS notifications to the driver**:

1. **Booking confirmed (OIC approved)** – immediately after OIC approves and the booking becomes `Assigned`.
2. **Trip reminder (4 hours before start)** – automatically, exactly once per booking.

## 1) Provider integration (Fast2SMS – current code)

This project already uses **Fast2SMS** in `src/services/smsService.js`.

### Required environment variables

Set these in your production `.env`:

- `SMS_API_KEY`: Fast2SMS API key

### What you must do in Fast2SMS

- Create a Fast2SMS account
- Generate an API key
- Ensure your account is enabled for transactional SMS (or the route you use)

### Notes for production

- Use a dedicated sender ID / route approved for your traffic type (transactional).
- Confirm DLT/template requirements (India) with your provider.

## 2) How the system avoids duplicate reminders

The backend creates a small table (if it doesn’t exist):

- `sms_notification_logs(booking_id, sms_type, ...)` with a **unique constraint** on `(booking_id, sms_type)`

This guarantees:

- “confirmed” SMS is sent once per booking
- “4 hours before” reminder is sent once per booking

## 3) Scheduler behavior (4-hour reminder)

- A cron job runs **every minute** (`src/jobs/tripReminder.js`)
- It selects `Assigned` trips that start in the window **[now + 240 minutes, now + 241 minutes)**
- For each match, it sends the reminder SMS (once)

## 4) Where the messages are sent from

- **On OIC approval**: `src/modules/bookings/booking.controller.js` calls
  `sendDriverBookingConfirmedSMS(...)`
- **4-hour reminder**: `src/jobs/tripReminder.js` calls
  `sendDriverTripReminder4hSMS(...)`

## 5) Going live checklist

- Set `SMS_API_KEY` in production environment (never commit secrets)
- Confirm driver phone numbers are valid 10-digit numbers in the database
- Ensure server timezone behavior matches your operational expectation (messages format uses `Asia/Kolkata`)
- Confirm your hosting keeps the Node process running continuously (cron runs inside the server process)

