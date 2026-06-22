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

export function createGoAlertClient(baseUrl = process.env.GOALERT_URL): GoAlertClient {
  return baseUrl ? new HttpGoAlertClient(baseUrl) : new NoopGoAlertClient();
}

// --- provisioning (GoAlert GraphQL admin API) -------------------------------
//
// At registration each user gets a dedicated GoAlert Service with a generic
// Integration Key (its id is the token used by the Generic API / this app's
// trigger client). The escalation policy is created empty; its steps are
// synced from the user's trusted contacts separately.

export interface ProvisionUserParams {
  userId: string;
  displayName: string;
}

export interface ProvisionResult {
  serviceId: string;
  integrationKey: string;
}

export interface GoAlertProvisioner {
  // Returns the new generic integration key, or null when GoAlert is not
  // configured (dev/test) so registration can proceed without a key.
  provisionUserService(params: ProvisionUserParams): Promise<ProvisionResult | null>;
}

const CREATE_ESCALATION_POLICY = `
  mutation CreateEP($input: CreateEscalationPolicyInput!) {
    createEscalationPolicy(input: $input) { id }
  }`;

const CREATE_SERVICE = `
  mutation CreateService($input: CreateServiceInput!) {
    createService(input: $input) {
      id
      integrationKeys { id type name }
    }
  }`;

export class HttpGoAlertProvisioner implements GoAlertProvisioner {
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  private async gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`GoAlert GraphQL HTTP ${response.status}: ${text}`);
    }
    const payload = (await response.json()) as { data?: T; errors?: { message: string }[] };
    if (payload.errors?.length) {
      throw new Error(`GoAlert GraphQL error: ${payload.errors.map((e) => e.message).join('; ')}`);
    }
    if (!payload.data) throw new Error('GoAlert GraphQL returned no data');
    return payload.data;
  }

  async provisionUserService({ userId, displayName }: ProvisionUserParams): Promise<ProvisionResult> {
    const label = `DoingOK ${displayName} (${userId})`;

    const ep = await this.gql<{ createEscalationPolicy: { id: string } }>(CREATE_ESCALATION_POLICY, {
      input: {
        name: label,
        description: 'DoingOK wellness escalation policy',
        repeat: 1,
      },
    });

    const svc = await this.gql<{
      createService: { id: string; integrationKeys: { id: string; type: string; name: string }[] };
    }>(CREATE_SERVICE, {
      input: {
        name: label,
        description: 'DoingOK wellness monitoring service',
        escalationPolicyID: ep.createEscalationPolicy.id,
        newIntegrationKeys: [{ type: 'generic', name: 'DoingOK Wellness' }],
      },
    });

    const keys = svc.createService.integrationKeys;
    const generic = keys.find((k) => k.type === 'generic') ?? keys[0];
    if (!generic) throw new Error('GoAlert created a service without an integration key');

    return { serviceId: svc.createService.id, integrationKey: generic.id };
  }
}

export class NoopGoAlertProvisioner implements GoAlertProvisioner {
  async provisionUserService({ userId }: ProvisionUserParams): Promise<ProvisionResult | null> {
    console.log(`[goalert:noop] would provision service for user ${userId}`);
    return null;
  }
}

export function createGoAlertProvisioner(
  baseUrl = process.env.GOALERT_URL,
  apiKey = process.env.GOALERT_API_KEY
): GoAlertProvisioner {
  return baseUrl && apiKey ? new HttpGoAlertProvisioner(baseUrl, apiKey) : new NoopGoAlertProvisioner();
}
