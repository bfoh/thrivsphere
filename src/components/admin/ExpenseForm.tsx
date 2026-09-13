"use client";

import * as React from "react";
import { useActionState } from "react";
import { recordExpense } from "@/app/actions/expenses";
import { initialExpenseState } from "@/lib/expense-state";
import { categoryLabel } from "@/lib/accounting";

const input: React.CSSProperties = {
  fontFamily: "inherit", fontSize: 14, padding: "9px 12px", borderRadius: 10,
  border: "1px solid rgba(31,58,95,0.18)", background: "#fff", width: "100%", boxSizing: "border-box",
};
const label: React.CSSProperties = {
  fontSize: 12, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 5,
};

const CATEGORIES = [
  "software", "insurance", "supervision", "training", "marketing",
  "professional_fees", "equipment", "premises", "travel", "bank_charges", "other",
];

export function ExpenseForm() {
  const [state, action, pending] = useActionState(recordExpense, initialExpenseState);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Clear on success, so the next entry starts from an empty form rather than
  // the previous supplier and amount — which is how a row gets entered twice.
  React.useEffect(() => {
    if (state.status === "ok") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, alignItems: "end" }}>
      <div>
        <label htmlFor="exp-date" style={label}>Date</label>
        <input id="exp-date" name="incurredOn" type="date" required style={input} />
      </div>
      <div>
        <label htmlFor="exp-category" style={label}>Category</label>
        <select id="exp-category" name="category" defaultValue="software" style={input}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
        </select>
      </div>
      <div style={{ gridColumn: "span 2" }}>
        <label htmlFor="exp-description" style={label}>What it was for</label>
        <input id="exp-description" name="description" required placeholder="Public liability insurance" style={input} />
      </div>
      <div>
        <label htmlFor="exp-supplier" style={label}>Supplier</label>
        <input id="exp-supplier" name="supplier" style={input} />
      </div>
      <div>
        <label htmlFor="exp-amount" style={label}>Amount (£)</label>
        <input id="exp-amount" name="amount" required inputMode="decimal" placeholder="24.99" style={input} />
      </div>
      <div>
        <label htmlFor="exp-vat" style={label}>VAT (£)</label>
        <input id="exp-vat" name="vat" inputMode="decimal" placeholder="0.00" style={input} />
      </div>
      <div style={{ gridColumn: "span 2" }}>
        <label htmlFor="exp-receipt" style={label}>Receipt (optional)</label>
        <input id="exp-receipt" name="receipt" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" style={{ ...input, padding: "7px 10px" }} />
      </div>
      <div>
        <button className="pill pill-teal" disabled={pending} style={{ padding: "10px 20px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}>
          {pending ? "Saving…" : "Record"}
        </button>
      </div>
      {state.status !== "idle" && state.message && (
        <p role="status" style={{ gridColumn: "1 / -1", margin: 0, fontSize: 13, fontWeight: 600, color: state.status === "error" ? "#b4553f" : "var(--teal-deep)" }}>
          {state.message}
        </p>
      )}
    </form>
  );
}
