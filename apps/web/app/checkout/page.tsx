"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { apiBaseUrl } from "@/lib/api";

type CartItem = {
  productId: string;
  name: string;
  qty: number;
  lineTotalCents: number;
};

type CartData = { items: CartItem[]; grandTotalCents: number };

function formatMoney(cents: number): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} THB`;
  }
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 text-sm text-slate-600">Loading checkout…</div>}>
      <CheckoutPageContent />
    </Suspense>
  );
}

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [cart, setCart] = useState<CartData | null>(null);
  const [name, setName] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("TH");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [details, setDetails] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCart = useCallback(async () => {
    const res = await fetch(`${apiBaseUrl()}/v1/cart`, { credentials: "include" });
    if (res.ok) {
      setCart((await res.json()) as CartData);
    }
  }, []);

  useEffect(() => {
    void loadCart();
    const m = searchParams.get("msg");
    if (m) setErr(m);
  }, [loadCart, searchParams]);

  async function placeOrder() {
    setErr(null);
    setDetails(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBaseUrl()}/v1/orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress: {
            name,
            line1,
            city,
            postal,
            country,
          },
          payment: { cardNumber, expiry, cvv },
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        orderId?: string;
        error?: { code?: string; message?: string; details?: string[] };
      } | null;
      if (res.status === 201 && body?.orderId) {
        router.push(`/checkout/success/${body.orderId}`);
        return;
      }
      if (res.status === 402) {
        setErr(body?.error?.message ?? "Payment was declined");
        setStep(2);
        return;
      }
      if (res.status === 409) {
        const d = body?.error?.details ?? [];
        const msg =
          d.length > 0
            ? `Stock issue: ${d.join("; ")}`
            : body?.error?.message ?? "Not enough stock";
        router.push(`/cart?msg=${encodeURIComponent(msg)}`);
        return;
      }
      if (res.status === 400 && body?.error?.code === "empty_cart") {
        router.push("/cart?msg=" + encodeURIComponent("Your cart is empty."));
        return;
      }
      setErr(body?.error?.message ?? "Checkout failed");
      setDetails(body?.error?.details ?? null);
    } catch {
      setErr("Could not reach the API");
    } finally {
      setSubmitting(false);
    }
  }

  if (!cart) {
    return <p className="px-4 py-10 text-sm text-slate-600">Loading…</p>;
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-slate-600">Your cart is empty.</p>
        <Link className="mt-4 inline-block text-[var(--accent)] hover:underline" href="/cart">
          Back to cart
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
      <ol className="mt-4 flex gap-2 text-xs font-medium text-slate-500">
        {["Summary", "Address", "Payment"].map((label, i) => (
          <li key={label}>
            <button
              className={i === step ? "text-[var(--accent)]" : ""}
              disabled={i > step}
              onClick={() => setStep(i)}
              type="button"
            >
              {i + 1}. {label}
            </button>
            {i < 2 ? <span className="mx-1">·</span> : null}
          </li>
        ))}
      </ol>

      {err ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {err}
          {details?.length ? (
            <span className="mt-1 block text-xs">{details.join(" · ")}</span>
          ) : null}
        </p>
      ) : null}

      {step === 0 ? (
        <div className="mt-6 space-y-3">
          <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--card)]">
            {cart.items.map((it) => (
              <li className="flex justify-between px-3 py-2 text-sm" key={it.productId}>
                <span>
                  {it.name} × {it.qty}
                </span>
                <span>{formatMoney(it.lineTotalCents)}</span>
              </li>
            ))}
            <li className="flex justify-between px-3 py-3 font-semibold">
              <span>Total</span>
              <span>{formatMoney(cart.grandTotalCents)}</span>
            </li>
          </ul>
          <button
            className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white hover:opacity-90"
            onClick={() => setStep(1)}
            type="button"
          >
            Continue
          </button>
          <Link className="block text-center text-sm text-[var(--accent)] hover:underline" href="/cart">
            Edit cart
          </Link>
        </div>
      ) : null}

      {step === 1 ? (
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setStep(2);
          }}
        >
          <div>
            <label className="text-sm font-medium" htmlFor="shipName">
              Full name
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              id="shipName"
              onChange={(e) => setName(e.target.value)}
              required
              value={name}
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="line1">
              Address line 1
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              id="line1"
              onChange={(e) => setLine1(e.target.value)}
              required
              value={line1}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium" htmlFor="city">
                City
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                id="city"
                onChange={(e) => setCity(e.target.value)}
                required
                value={city}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="postal">
                Postal
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                id="postal"
                onChange={(e) => setPostal(e.target.value)}
                required
                value={postal}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="country">
              Country
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
              id="country"
              onChange={(e) => setCountry(e.target.value)}
              value={country}
            />
          </div>
          <button className="w-full rounded-lg bg-[var(--accent)] py-2.5 font-medium text-white" type="submit">
            Continue to payment
          </button>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Stub processor: use a card starting with <code className="font-mono text-xs">4242</code> to
            succeed, or <code className="font-mono text-xs">4000000000000002</code> to simulate decline.
          </p>
          <div>
            <label className="text-sm font-medium" htmlFor="card">
              Card number
            </label>
            <input
              autoComplete="cc-number"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-mono text-sm"
              id="card"
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="4242424242424242"
              required
              value={cardNumber}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium" htmlFor="exp">
                Expiry
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                id="exp"
                onChange={(e) => setExpiry(e.target.value)}
                placeholder="12/30"
                value={expiry}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="cvv">
                CVV
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                id="cvv"
                onChange={(e) => setCvv(e.target.value)}
                value={cvv}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-sm font-medium"
              onClick={() => setStep(1)}
              type="button"
            >
              Back
            </button>
            <button
              className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 text-sm font-medium text-white disabled:opacity-60"
              disabled={submitting}
              onClick={() => void placeOrder()}
              type="button"
            >
              {submitting ? "Placing order…" : "Place order"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
