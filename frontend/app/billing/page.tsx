"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { API_URL, fetchWithRefresh, readApiError } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/layout/GlassCard";
import { GameButton } from "@/components/game/GamePrimitives";
import { cn } from "@/lib/utils";

type PlanCard = {
  id: string;
  name: string;
  price_inr: number;
  daily_limit: number;
  current: boolean;
};

type PlansResponse = {
  plans: PlanCard[];
  subscription_id: string | null;
  configured: boolean;
  daily_limit?: number;
  daily_used?: number;
  daily_remaining?: number | null;
};

export default function BillingPage() {
  const [data, setData] = useState<PlansResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const res = await fetchWithRefresh(`${API_URL}/billing/plans`, { method: "GET" });
    if (!res.ok) throw new Error(await readApiError(res, "Could not load plans."));
    setData((await res.json()) as PlansResponse);
  };

  useEffect(() => {
    void load().catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load billing.");
    });
  }, []);

  const checkout = async (plan: string) => {
    setBusy(plan);
    try {
      const res = await fetchWithRefresh(`${API_URL}/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        toast.error(await readApiError(res, "Could not start checkout."));
        return;
      }
      const body = (await res.json()) as { checkout_url?: string };
      if (!body.checkout_url) {
        toast.error("Checkout URL missing.");
        return;
      }
      window.location.href = body.checkout_url;
    } catch (err) {
      if (err instanceof Error && err.message === "SESSION_EXPIRED") return;
      toast.error("Could not start checkout.");
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    setBusy("cancel");
    try {
      const res = await fetchWithRefresh(`${API_URL}/billing/cancel`, { method: "POST" });
      if (!res.ok) {
        toast.error(await readApiError(res, "Could not cancel."));
        return;
      }
      toast.success("Plan set to Free.");
      await load();
    } catch (err) {
      if (err instanceof Error && err.message === "SESSION_EXPIRED") return;
      toast.error("Could not cancel.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageShell universe="deus">
      <PageHeader
        universe="deus"
        title="Operator license"
        subtitle="UPI and cards via Razorpay. Plan is applied only after a signed webhook — never from this page."
        eyebrow="Billing"
      />

      {!data ? (
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="size-4 animate-spin" /> Loading plans…
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-zinc-400">
            Today:{" "}
            {data.daily_limit === 0
              ? "unlimited"
              : `${data.daily_remaining ?? 0} of ${data.daily_limit ?? 0} calls left (${data.daily_used ?? 0} used)`}
          </p>
          {!data.configured && (
            <p className="mb-6 rounded-xl border border-accent-practice/20 bg-accent-practice/10 px-4 py-3 text-sm text-accent-practice">
              Razorpay is not connected on the server. Plans are visible; checkout stays disabled until keys are set.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            {data.plans.map((plan) => (
              <GlassCard
                key={plan.id}
                className={cn("p-6", plan.current && "ring-1 ring-primary/40")}
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{plan.name}</p>
                <p className="mt-2 text-3xl font-black text-white">
                  {plan.price_inr === 0 ? "₹0" : `₹${plan.price_inr}`}
                  <span className="ml-1 text-sm font-medium text-zinc-500">/mo</span>
                </p>
                <p className="mt-2 text-sm text-zinc-400">{plan.daily_limit} AI calls / day</p>
                {plan.current ? (
                  <p className="mt-6 text-sm font-semibold text-primary">Current license</p>
                ) : plan.id === "free" ? (
                  <GameButton
                    type="button"
                    variant="ghost"
                    className="mt-6 w-full"
                    disabled={busy !== null || !data.subscription_id}
                    onClick={() => void cancel()}
                  >
                    {busy === "cancel" ? <Loader2 className="size-4 animate-spin" /> : null}
                    Drop to Free
                  </GameButton>
                ) : (
                  <GameButton
                    type="button"
                    className="mt-6 w-full"
                    disabled={busy !== null || !data.configured}
                    onClick={() => void checkout(plan.id)}
                  >
                    {busy === plan.id ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                    Pay with UPI / card
                  </GameButton>
                )}
              </GlassCard>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
