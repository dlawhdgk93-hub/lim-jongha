const DEBUG_ENDPOINT =
  'http://127.0.0.1:7313/ingest/24d29639-0495-4bac-ae6b-c827fec233b0';
const DEBUG_SESSION_ID = '902235';

export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown> = {},
  hypothesisId?: string,
  runId = 'pre-fix',
) {
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      location,
      message,
      data,
      hypothesisId,
      runId,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}
