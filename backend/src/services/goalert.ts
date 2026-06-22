// GoAlert integration.
//
// DoingOK triggers wellness alerts via GoAlert's Generic API. Each registered
// user has a GoAlert Service with an Integration Key stored in
// users.goalert_service_key. We POST form-encoded payloads with a stable
// dedup key so retries and repeated detection runs collapse into one alert.
//
// In environments without a configured GoAlert instance (local dev, tests,
// CI) createGoAlertClient() returns a NoopGoAlertClient that logs instead of
// making network calls, so the rest of the loop still runs end-to-end.

export interface TriggerAlertParams {
  serviceKey: string;
  summary: string;
  details?: string;
  dedupKey: string;
}

export interface CloseAlertParams {
  serviceKey: string;
  summary: string;
  dedupKey: string;
}

export interface GoAlertClient {
  triggerAlert(params: TriggerAlertParams): Promise<void>;
  closeAlert(params: CloseAlertParams): Promise<void>;
}

// Builds the dedup key for a user's check-in alert. Stable across detection
// runs so GoAlert deduplicates rather than firing repeatedly.
export function checkinDedupKey(userId: string, checkinEventId: string): string {
  return `user-${userId}-checkin-${checkinEventId}`;
}

export class HttpGoAlertClient implements GoAlertClient {
  constructor(private readonly baseUrl: string) {}

  private endpoint(): string {
    return `${this.baseUrl.replace(/\/$/, '')}/api/v2/generic/incoming`;
  }

  async triggerAlert({ serviceKey, summary, details, dedupKey }: TriggerAlertParams): Promise<void> {
    const body = new URLSearchParams({ token: serviceKey, summary, dedup: dedupKey });
    if (details) body.set('details', details);
    await this.post(body);
  }

  async closeAlert({ serviceKey, summary, dedupKey }: CloseAlertParams): Promise<void> {
    const body = new URLSearchParams({
      token: serviceKey,
      summary,
      action: 'close',
      dedup: dedupKey,
    });
    await this.post(body);
  }

  private async post(body: URLSearchParams): Promise<void> {
    const response = await fetch(this.endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`GoAlert request failed (${response.status}): ${text}`);
    }
  }
}

// Used when GoAlert is not configured. Logs the action so the alert path is
// observable in dev/test without a live GoAlert instance.
export class NoopGoAlertClient implements GoAlertClient {
  async triggerAlert({ dedupKey, summary }: TriggerAlertParams): Promise<void> {
    console.log(`[goalert:noop] would TRIGGER alert dedup=${dedupKey} summary="${summary}"`);
  }

  async closeAlert({ dedupKey }: CloseAlertParams): Promise<void> {
    console.log(`[goalert:noop] would CLOSE alert dedup=${dedupKey}`);
  }
}

export function createGoAlertClient(baseUrl = process.env.GOALERT_BASE_URL): GoAlertClient {
  return baseUrl ? new HttpGoAlertClient(baseUrl) : new NoopGoAlertClient();
}
