"use client";

import * as React from "react";
import { useActionState } from "react";
import { startCheckout } from "@/app/actions/payments";
import { initialPaymentState } from "@/lib/payment-state";
import { Icon } from "@/components/icons";

export function PlanButton({ planSlug, cta, featured }: { planSlug: string; cta: string; featured?: boolean }) {
  const [state, action, pending] = useActionState(startCheckout, initialPaymentState);
  return (
    <form action={action} style={{ marginTop: "auto" }}>
      <input type="hidden" name="planSlug" value={planSlug} />
      <button
        className={`pill ${featured ? "pill-gold" : "pill-teal"}`}
        disabled={pending}
        style={{ width: "100%", padding: "12px 18px", fontSize: 13.5, opacity: pending ? 0.6 : 1 }}
      >
        {pending ? "Taking you to payment…" : cta} {!pending && <Icon name="arrow" size={16} />}
      </button>
      {state.status === "error" && (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: 12.5, fontWeight: 600, color: "#a1421c" }}>
          {state.message}
        </p>
      )}
    </form>
  );
}
