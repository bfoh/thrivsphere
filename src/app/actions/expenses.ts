"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { expenses } from "@/db/schema";
import { requireCapability } from "@/lib/guard";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz";
import { buildReceiptPath, checkUpload } from "@/lib/upload-rules";
import { parseDate } from "@/lib/hr-rules";
import { poundsToPence } from "@/lib/money";
import type { ExpenseFormState } from "@/lib/expense-state";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function mapGuardError(err: unknown): ExpenseFormState | null {
  if (err instanceof UnauthenticatedError) {
    return { status: "error", message: "Your session has expired. Please sign in again." };
  }
  if (err instanceof ForbiddenError) {
    return { status: "error", message: "You do not have access to the ledger." };
  }
  return null;
}

export async function recordExpense(
  _prev: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  let actor;
  try {
    actor = await requireCapability("accounting:manage", {
      entity: "expenses",
      action: "create",
      detail: "recorded an expense",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  const incurredOn = str(formData, "incurredOn");
  const description = str(formData, "description");
  const amountPence = poundsToPence(str(formData, "amount"));
  const vatPence = str(formData, "vat") ? poundsToPence(str(formData, "vat")) : 0;

  if (!parseDate(incurredOn)) return { status: "error", message: "Give the date it was incurred." };
  if (!description) return { status: "error", message: "Describe what it was for." };
  if (amountPence === null) return { status: "error", message: "Give the amount, e.g. 24.99." };
  if (amountPence <= 0) return { status: "error", message: "The amount must be more than zero." };
  if (vatPence === null) return { status: "error", message: "The VAT amount is not a number." };
  if (vatPence > amountPence) {
    return { status: "error", message: "VAT cannot be more than the total." };
  }

  // Receipt, if one was attached. Private storage: an invoice carries supplier
  // details and sometimes bank details, and nothing here should be public.
  let receiptPath: string | null = null;
  const file = formData.get("receipt");
  if (file instanceof File && file.size > 0) {
    const check = checkUpload({ name: file.name, type: file.type, size: file.size });
    if (!check.ok) return { status: "error", message: check.reason };

    try {
      const blob = await put(buildReceiptPath(file.name, randomUUID()), file, {
        access: "private",
        contentType: file.type,
        addRandomSuffix: false,
      });
      receiptPath = blob.pathname;
    } catch (err) {
      console.error("[expenses] receipt upload failed", err);
      return { status: "error", message: "The receipt could not be stored. Try again." };
    }
  }

  await getDb().insert(expenses).values({
    incurredOn,
    category: (str(formData, "category") || "other") as "other",
    description,
    supplier: str(formData, "supplier") || null,
    amountPence,
    vatPence,
    receiptPath,
    notes: str(formData, "notes") || null,
    recordedBy: actor.userId,
  });

  revalidatePath("/admin/accounting");
  return { status: "ok", message: "Expense recorded." };
}

/**
 * Remove an expense.
 *
 * Deleted outright rather than marked, unlike a care record: a mistyped
 * supplier invoice is a data-entry error, not part of anyone's history. The
 * audit row keeps what was removed and by whom.
 */
export async function deleteExpense(
  _prev: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  const id = str(formData, "id");

  try {
    await requireCapability("accounting:manage", {
      entity: "expenses",
      entityId: id,
      action: "delete",
      detail: "deleted an expense",
    });
  } catch (err) {
    const mapped = mapGuardError(err);
    if (mapped) return mapped;
    throw err;
  }

  const db = getDb();
  const [row] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  if (!row) return { status: "error", message: "That entry no longer exists." };

  await db.delete(expenses).where(eq(expenses.id, id));

  revalidatePath("/admin/accounting");
  return { status: "ok", message: `Removed ${row.description}.` };
}
