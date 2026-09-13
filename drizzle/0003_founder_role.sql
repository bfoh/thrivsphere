-- A founder role above admin.
--
-- Someone has to own the service. Without a top role, any admin can demote or
-- block any other admin — including the person whose service it is — and there
-- is nothing preventing an organisation locking itself out entirely.
--
-- Postgres cannot add an enum value inside a transaction block that then uses
-- it, so this migration only adds the value. The promotion of the existing
-- admin runs separately in scripts/promote-founder.ts.

ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'founder';
