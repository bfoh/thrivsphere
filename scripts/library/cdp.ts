/**
 * A minimal Chrome DevTools Protocol driver for the library build.
 *
 * Starts the Google Chrome already installed on the build machine in headless
 * mode and talks to it over its debugging WebSocket, so the build needs no
 * browser-automation dependency. Used to print documents to PDF and to
 * photograph slides.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter((p): p is string => !!p);

type Message = { id?: number; method?: string; sessionId?: string; result?: unknown; error?: { message: string; data?: string } };

export type Page = {
  call: <T = Record<string, unknown>>(method: string, params?: Record<string, unknown>) => Promise<T>;
  goto: (url: string) => Promise<void>;
  eval: <T = unknown>(expression: string) => Promise<T>;
  close: () => Promise<unknown>;
};

export type Browser = { newPage: () => Promise<Page>; close: () => Promise<void> };

export async function launchChrome(): Promise<Browser> {
  const chrome = CANDIDATES.find((p) => existsSync(p));
  if (!chrome) throw new Error("Google Chrome was not found. Set CHROME_PATH to its executable.");
  const profile = mkdtempSync(join(tmpdir(), "library-chrome-"));
  const proc = spawn(chrome, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--allow-file-access-from-files",
    "--hide-scrollbars",
    "--font-render-hinting=none",
    "about:blank",
  ]);

  const wsUrl = await new Promise<string>((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => reject(new Error("Chrome did not start")), 30_000);
    proc.stderr.on("data", (d: Buffer) => {
      buf += d.toString();
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]);
      }
    });
    proc.on("exit", (code) => reject(new Error(`Chrome exited with ${code}`)));
  });

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let nextId = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  const listeners = new Set<(m: Message) => void>();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(String(ev.data)) as Message;
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id)!;
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(`${msg.error.message} ${msg.error.data ?? ""}`));
      else p.resolve(msg.result);
    } else for (const l of listeners) l(msg);
  };

  const send = (method: string, params: Record<string, unknown> = {}, sessionId?: string) =>
    new Promise<unknown>((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });

  async function newPage(): Promise<Page> {
    const { targetId } = (await send("Target.createTarget", { url: "about:blank" })) as { targetId: string };
    const { sessionId } = (await send("Target.attachToTarget", { targetId, flatten: true })) as { sessionId: string };
    const call = <T,>(method: string, params?: Record<string, unknown>) => send(method, params, sessionId) as Promise<T>;
    await call("Page.enable");
    await call("Runtime.enable");

    const evaluate = async <T,>(expression: string): Promise<T> => {
      const r = await call<{ result: { value: T }; exceptionDetails?: { text: string; exception?: { description?: string } } }>(
        "Runtime.evaluate",
        { expression, awaitPromise: true, returnByValue: true }
      );
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    };

    return {
      call,
      eval: evaluate,
      async goto(url: string) {
        const loaded = new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            listeners.delete(onMsg);
            reject(new Error(`Timed out loading ${url}`));
          }, 120_000);
          const onMsg = (msg: Message) => {
            if (msg.sessionId === sessionId && msg.method === "Page.loadEventFired") {
              clearTimeout(timer);
              listeners.delete(onMsg);
              resolve();
            }
          };
          listeners.add(onMsg);
        });
        await call("Page.navigate", { url });
        await loaded;
        // Web fonts and images can finish after the load event.
        await evaluate(
          `document.fonts.ready.then(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))))`
        );
      },
      close: () => send("Target.closeTarget", { targetId }),
    };
  }

  return {
    newPage,
    async close() {
      try {
        await send("Browser.close");
      } catch {
        // Already gone.
      }
      proc.kill();
      try {
        rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch {
        // Chrome can hold the profile briefly after exit; it is in the temp folder.
      }
    },
  };
}
