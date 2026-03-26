# Scheduled Export Webhook Contract

When `/api/analytics/collapse/schedules/run` processes due jobs, it emits a webhook.

## Endpoint behavior
- Method: `POST`
- Header `content-type`: `application/json`
- Header `x-pitchiq-event`: `scheduled_export.ready`
- Header `x-pitchiq-version`: `v1`
- Header `x-pitchiq-signature`: hex HMAC-SHA256 of request body using `SCHEDULED_EXPORT_WEBHOOK_SECRET`

## Payload (`v1`)
```json
{
  "event": "scheduled_export.ready",
  "version": "v1",
  "scheduleId": "uuid",
  "destinationEmail": "analyst@team.com",
  "format": "csv",
  "exportUrl": "https://app.example.com/api/analytics/collapse/export?...",
  "seasonId": "season-id",
  "teamId": "optional-team-id-or-null",
  "generatedAt": "2026-03-18T12:00:00.000Z"
}
```

## Verification
- Compute `HMAC_SHA256(secret, rawBody)` and compare with `x-pitchiq-signature`.
- If secret is not configured, signature may be empty.

## Receiver Skeleton
- Example receiver/provider-adapter endpoint:
  - `POST /api/integrations/email-provider/scheduled-export`
- It validates contract version + signature and returns an accepted response.
- Replace the placeholder response with your real email provider API call.
