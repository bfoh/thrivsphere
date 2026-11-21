import type { TaskKey, TaskOutput } from "@/lib/ai/tasks";

/** Ask for AI help. Results come back to the page; nothing is saved. */
export async function callAi<K extends TaskKey>(task: K, input: Record<string, unknown>): Promise<{ output: TaskOutput<K> } | { error: string }> {
  try {
    const res = await fetch(`/api/admin/ai/${task}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    const data = (await res.json().catch(() => ({}))) as { output?: TaskOutput<K>; error?: string };
    if (!res.ok || !data.output) return { error: data.error ?? "AI help didn't respond. Please try again." };
    return { output: data.output };
  } catch {
    return { error: "AI help didn't respond. Please check your connection." };
  }
}
