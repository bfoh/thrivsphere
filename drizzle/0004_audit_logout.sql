-- Record sign-outs as well as sign-ins.
--
-- The access log already records what people did once inside. Session
-- bookends turn that into an account of when someone was present, which is
-- what an information-governance review actually asks for.

ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'logout';
