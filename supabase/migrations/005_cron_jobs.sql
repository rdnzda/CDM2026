-- Cron jobs for CDM2026 edge functions
-- Run this SQL in the Supabase Dashboard > SQL Editor
-- Replace YOUR_SERVICE_ROLE_KEY with the actual key from your .env.local

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname in (
  'sync-matches', 'resolve-bets', 'daily-challenge'
);

-- sync-matches: toutes les 15 minutes (96 req/jour, dans la limite free tier football-data.org)
select cron.schedule(
  'sync-matches',
  '*/15 * * * *',
  $$select net.http_post(url:='https://vfvbaucsrbwzhkhvfcrm.supabase.co/functions/v1/sync-matches',headers:='{"Authorization":"Bearer YOUR_SERVICE_ROLE_KEY","Content-Type":"application/json"}'::jsonb,body:='{}'::jsonb)$$
);

-- resolve-bets: toutes les 5 minutes (pas d'API externe)
select cron.schedule(
  'resolve-bets',
  '*/5 * * * *',
  $$select net.http_post(url:='https://vfvbaucsrbwzhkhvfcrm.supabase.co/functions/v1/resolve-bets',headers:='{"Authorization":"Bearer YOUR_SERVICE_ROLE_KEY","Content-Type":"application/json"}'::jsonb,body:='{}'::jsonb)$$
);

-- daily-challenge: 10h00 Paris = 08h00 UTC
select cron.schedule(
  'daily-challenge',
  '0 8 * * *',
  $$select net.http_post(url:='https://vfvbaucsrbwzhkhvfcrm.supabase.co/functions/v1/daily-challenge',headers:='{"Authorization":"Bearer YOUR_SERVICE_ROLE_KEY","Content-Type":"application/json"}'::jsonb,body:='{}'::jsonb)$$
);
