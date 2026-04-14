# SMS Notifications (Twilio)

This backend sends **two SMS notifications to the driver**:

1. **Booking confirmed (OIC approved)** – immediately after OIC approves and the booking becomes `Assigned`.
2. **Trip reminder (4 hours before start)** – automatically, exactly once per booking.

## 1) Provider integration (Twilio – current code)

This project uses **Twilio** in `src/services/smsService.js`.

### Required environment variables

Set these in your production `.env`:

- `TWILIO_ACCOUNT_SID`: Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Twilio Auth Token
- **Either**
  - `TWILIO_MESSAGING_SERVICE_SID`: Messaging Service SID (recommended)
  - **or** `TWILIO_FROM_NUMBER`: Twilio phone number (E.164), e.g. `+14155552671`

### Optional environment variables

- `TWILIO_DEFAULT_COUNTRY_CODE`: Defaults to `91`. If you store 10-digit numbers in DB (India), the backend converts them to E.164 using this country code.

### What you must do in Twilio

- Create a Twilio account
- Get your **Account SID** and **Auth Token**
- Create a **Messaging Service** (recommended) and copy its SID
  - or buy/configure a Twilio phone number to use as `TWILIO_FROM_NUMBER`

### Notes for production

- If you’re sending in India, ensure you comply with **DLT** requirements (templates / sender IDs) as applicable for your use-case.
- Prefer a Messaging Service if you may add multiple sender numbers later.

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

- Set Twilio env vars in production (never commit secrets)
- Confirm driver phone numbers are valid 10-digit numbers in the database
- Ensure server timezone behavior matches your operational expectation (messages format uses `Asia/Kolkata`)
- Confirm your hosting keeps the Node process running continuously (cron runs inside the server process)

