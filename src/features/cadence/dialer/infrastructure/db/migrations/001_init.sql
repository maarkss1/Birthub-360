-- Migration 001: esquema inicial do discador

CREATE TABLE IF NOT EXISTS campaigns (
    id          UUID PRIMARY KEY,
    name        TEXT NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'finished')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
    id                UUID PRIMARY KEY,
    campaign_id       UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name              TEXT NOT NULL,
    phone             TEXT NOT NULL, -- E.164
    status            TEXT NOT NULL CHECK (
                          status IN ('pending', 'in_progress', 'contacted', 'exhausted', 'do_not_call', 'invalid_number')
                      ),
    attempts          INTEGER NOT NULL DEFAULT 0,
    next_attempt_at   TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (campaign_id, phone)
);

-- Acelera a busca de "próximos leads elegíveis" feita a cada ciclo do discador.
CREATE INDEX IF NOT EXISTS idx_leads_eligibility
    ON leads (campaign_id, status, next_attempt_at);

CREATE TABLE IF NOT EXISTS call_attempts (
    id                 UUID PRIMARY KEY,
    lead_id            UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    campaign_id        UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    agent_dn           TEXT NOT NULL,
    status             TEXT NOT NULL CHECK (
                           status IN ('dialing', 'ringing_agent', 'connected', 'completed', 'no_answer', 'busy', 'agent_unavailable', 'failed')
                       ),
    provider_call_id   TEXT,
    started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_call_attempts_campaign_status
    ON call_attempts (campaign_id, status);

-- Acelera "quais DNs estão ocupados agora" (status ainda não terminal).
CREATE INDEX IF NOT EXISTS idx_call_attempts_agent_dn_status
    ON call_attempts (agent_dn, status);

CREATE TABLE IF NOT EXISTS dnc_list (
    phone       TEXT PRIMARY KEY, -- E.164
    reason      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
