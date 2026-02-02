-- Fase 5: Google Calendar Bidirecional - Adicionar colunas de sincronização

-- Adicionar coluna de ultima sincronizacao
ALTER TABLE ff_integrations_google
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- Adicionar coluna de sync_token para incremental sync
ALTER TABLE ff_integrations_google
ADD COLUMN IF NOT EXISTS sync_token TEXT;