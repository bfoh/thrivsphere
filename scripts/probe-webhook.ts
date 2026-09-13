/**
 * Prove the Clerk webhook endpoint accepts what it should and refuses what it
 * should, against a running deployment.
 *
 * Sends one correctly signed request plus four forgeries: a tampered body, a
 * replay outside the tolerance window, a signature made with a different
 * secret, and no headers at all.
 *
 * The valid request names a user id that does not exist, so a passing
 * signature still writes nothing. The point is to test the door, not to put
 * synthetic sign-ins into a real access log.
 *
 *   npx dotenv -e .env.local -- npx tsx scripts/probe-webhook.ts
 *
 * CLERK_WEBHOOK_SECRET must belong to the instance serving the URL below.
 */

import { sign } from "../src/lib/svix-signature";

const URL_ = "https://thrivsphere.org/api/webhooks/clerk";
const SECRET = process.env.CLERK_WEBHOOK_SECRET!;

async function post(name: string, body: string, headers: Record<string, string>, expect: number) {
  const res = await fetch(URL_, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
  const text = (await res.text()).slice(0, 60);
  const ok = res.status === expect ? "PASS" : "FAIL";
  console.log(`${ok}  ${name.padEnd(38)} ${res.status} (expected ${expect})  ${text}`);
}

(async () => {
  const id = "msg_probe_" + Date.now();
  const ts = Math.floor(Date.now() / 1000);
  // A user id that does not exist: the endpoint should accept the signature
  // and then find nothing to act on, rather than writing anything.
  const body = JSON.stringify({
    type: "session.created",
    data: { id: "sess_probe", user_id: "user_does_not_exist_probe" },
  });

  await post("valid signature, unknown account", body,
    { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${sign(body, SECRET, id, ts)}` }, 200);

  const tampered = JSON.stringify({ type: "session.created", data: { id: "sess_probe", user_id: "user_someone_else" } });
  await post("tampered body", tampered,
    { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${sign(body, SECRET, id, ts)}` }, 400);

  const oldTs = ts - 20 * 60;
  await post("replayed, 20 minutes old", body,
    { "svix-id": id, "svix-timestamp": String(oldTs), "svix-signature": `v1,${sign(body, SECRET, id, oldTs)}` }, 400);

  const wrong = "whsec_" + Buffer.from("not-the-real-secret").toString("base64");
  await post("signed with the wrong secret", body,
    { "svix-id": id, "svix-timestamp": String(ts), "svix-signature": `v1,${sign(body, wrong, id, ts)}` }, 400);

  await post("no signature headers", body, {}, 400);
})();
