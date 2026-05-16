"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Placeholder } from "@/components/Placeholder";
import { useCart } from "@/components/CartProvider";
import { apiBaseUrl, formatPriceUSD } from "@/lib/api";
import { productTone } from "@/lib/tone";

interface Address {
  name: string;
  line1: string;
  city: string;
  postal: string;
  country: string;
}

interface Payment {
  cardNumber: string;
  expiry: string;
  cvv: string;
  name: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, clearCart } = useCart();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [address, setAddress] = useState<Address>({
    name: "Alex Mercer",
    line1: "224 Bowery, Apt 5",
    city: "New York",
    postal: "10012",
    country: "United States",
  });
  const [payment, setPayment] = useState<Payment>({
    cardNumber: "4242 4242 4242 4242",
    expiry: "12/27",
    cvv: "123",
    name: "Alex Mercer",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  if (!cart) {
    return (
      <div className="fade-in" style={{ padding: "80px 40px" }}>
        <div className="muted">Loading…</div>
      </div>
    );
  }

  const items = cart.items;

  if (items.length === 0) {
    return (
      <div className="empty" style={{ padding: "120px 0" }}>
        <Icon name="bag" className="xl" />
        <div className="h-3">Your bag is empty</div>
        <button className="btn ghost" onClick={() => router.push("/")}>
          Back to shop
        </button>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + i.lineTotalCents, 0);
  const shipping = subtotal >= 15000 ? 0 : 800;
  const total = subtotal + shipping;

  const validateAddress = () => {
    const e: Record<string, string> = {};
    if (!address.name.trim()) e.name = "Required";
    if (!address.line1.trim()) e.line1 = "Required";
    if (!address.city.trim()) e.city = "Required";
    if (!address.postal.trim()) e.postal = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePayment = () => {
    const e: Record<string, string> = {};
    const digits = payment.cardNumber.replace(/\s/g, "");
    if (digits.length < 13) e.cardNumber = "Enter a valid card number";
    if (!/^\d\d\/\d\d$/.test(payment.expiry)) e.expiry = "MM/YY";
    if (!/^\d{3,4}$/.test(payment.cvv)) e.cvv = "3–4 digits";
    if (!payment.name.trim()) e.name = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePlace = async () => {
    setPaymentError(null);
    setProcessing(true);
    const cardDigits = payment.cardNumber.replace(/\s/g, "");
    try {
      const res = await fetch(`${apiBaseUrl()}/v1/orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress: {
            name: address.name,
            line1: address.line1,
            city: address.city,
            postal: address.postal,
            country: address.country,
          },
          payment: { cardNumber: cardDigits, expiry: payment.expiry, cvv: payment.cvv },
        }),
      });

      if (res.status === 402) {
        setPaymentError(
          "การชําระเงินถูกปฏิเสธ · Your card was declined. Try card 4242 4242 4242 4242 to simulate a successful charge."
        );
        setStep(1);
        setProcessing(false);
        return;
      }

      if (res.status === 409) {
        setPaymentError("Some items are out of stock. Please review your cart.");
        setProcessing(false);
        router.push("/cart");
        return;
      }

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        setPaymentError(err?.error?.message ?? "Something went wrong. Please try again.");
        setProcessing(false);
        return;
      }

      const { orderId } = (await res.json()) as { orderId: string };
      await clearCart();
      router.push(`/checkout/success/${orderId}`);
    } catch {
      setPaymentError("Network error. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <div className="fade-in">
      <section className="page-head" style={{ paddingBottom: 20 }}>
        <button className="btn link" onClick={() => router.push("/")}>
          <Icon name="arrowL" /> Continue shopping
        </button>
        <h1 className="h-1" style={{ margin: "14px 0 0" }}>
          Checkout
        </h1>
      </section>

      <div className="checkout">
        <div className="checkout-main">
          {/* STEP 1 — ADDRESS */}
          <div
            className={`step ${
              step === 0 ? "active" : step > 0 ? "done" : "collapsed"
            }`}
          >
            <div
              className="step-head"
              onClick={() => step > 0 && setStep(0)}
            >
              <div className="num">
                {step > 0 ? <Icon name="check" /> : "1"}
              </div>
              <div className="title">Shipping address</div>
              {step > 0 && (
                <button
                  className="btn link"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStep(0);
                  }}
                >
                  Edit
                </button>
              )}
            </div>
            {step === 0 && (
              <div className="step-body">
                <div className="field">
                  <label>Full name</label>
                  <input
                    className={`input ${errors.name ? "error" : ""}`}
                    value={address.name}
                    onChange={(e) =>
                      setAddress({ ...address, name: e.target.value })
                    }
                  />
                  {errors.name && (
                    <span className="err">
                      <Icon name="alert" /> {errors.name}
                    </span>
                  )}
                </div>
                <div className="field">
                  <label>Street address</label>
                  <input
                    className={`input ${errors.line1 ? "error" : ""}`}
                    value={address.line1}
                    onChange={(e) =>
                      setAddress({ ...address, line1: e.target.value })
                    }
                  />
                  {errors.line1 && (
                    <span className="err">
                      <Icon name="alert" /> {errors.line1}
                    </span>
                  )}
                </div>
                <div className="field-row cols-3">
                  <div className="field">
                    <label>City</label>
                    <input
                      className={`input ${errors.city ? "error" : ""}`}
                      value={address.city}
                      onChange={(e) =>
                        setAddress({ ...address, city: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Postal code</label>
                    <input
                      className={`input ${errors.postal ? "error" : ""}`}
                      value={address.postal}
                      onChange={(e) =>
                        setAddress({ ...address, postal: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Country</label>
                    <input
                      className="input"
                      value={address.country}
                      onChange={(e) =>
                        setAddress({ ...address, country: e.target.value })
                      }
                    />
                  </div>
                </div>
                <button
                  className="btn accent"
                  style={{ alignSelf: "flex-start", marginTop: 8 }}
                  onClick={() => {
                    if (validateAddress()) setStep(1);
                  }}
                >
                  Continue to payment <Icon name="arrowR" />
                </button>
              </div>
            )}
            {step > 0 && (
              <div className="step-body summary">
                {address.name} · {address.line1}, {address.city}{" "}
                {address.postal}, {address.country}
              </div>
            )}
          </div>

          {/* STEP 2 — PAYMENT */}
          <div
            className={`step ${
              step === 1 ? "active" : step > 1 ? "done" : "collapsed"
            }`}
          >
            <div
              className="step-head"
              onClick={() => step > 1 && setStep(1)}
            >
              <div className="num">
                {step > 1 ? <Icon name="check" /> : "2"}
              </div>
              <div className="title">Payment</div>
              {step > 1 && (
                <button
                  className="btn link"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStep(1);
                  }}
                >
                  Edit
                </button>
              )}
            </div>
            {step === 1 && (
              <div className="step-body">
                {paymentError && (
                  <div className="banner bad">
                    <Icon name="alert" />
                    <div>{paymentError}</div>
                  </div>
                )}
                <div className="banner">
                  <Icon name="info" />
                  <div>
                    <strong>Test mode.</strong> Use{" "}
                    <span className="mono">4242 4242 4242 4242</span> for a
                    successful charge, or{" "}
                    <span className="mono">4000 0000 0000 0002</span> to
                    simulate a decline.
                  </div>
                </div>
                <div className="field">
                  <label>Card number</label>
                  <input
                    className={`input mono ${
                      errors.cardNumber ? "error" : ""
                    }`}
                    value={payment.cardNumber}
                    onChange={(e) => {
                      const v = e.target.value
                        .replace(/[^\d]/g, "")
                        .slice(0, 16)
                        .replace(/(\d{4})(?=\d)/g, "$1 ");
                      setPayment({ ...payment, cardNumber: v });
                    }}
                    placeholder="4242 4242 4242 4242"
                  />
                  {errors.cardNumber && (
                    <span className="err">
                      <Icon name="alert" /> {errors.cardNumber}
                    </span>
                  )}
                </div>
                <div className="field-row cols-2">
                  <div className="field">
                    <label>Expiry</label>
                    <input
                      className={`input mono ${
                        errors.expiry ? "error" : ""
                      }`}
                      value={payment.expiry}
                      onChange={(e) =>
                        setPayment({ ...payment, expiry: e.target.value })
                      }
                      placeholder="MM/YY"
                    />
                    {errors.expiry && (
                      <span className="err">
                        <Icon name="alert" /> {errors.expiry}
                      </span>
                    )}
                  </div>
                  <div className="field">
                    <label>CVV</label>
                    <input
                      className={`input mono ${errors.cvv ? "error" : ""}`}
                      value={payment.cvv}
                      onChange={(e) =>
                        setPayment({
                          ...payment,
                          cvv: e.target.value.replace(/[^\d]/g, "").slice(0, 4),
                        })
                      }
                    />
                    {errors.cvv && (
                      <span className="err">
                        <Icon name="alert" /> {errors.cvv}
                      </span>
                    )}
                  </div>
                </div>
                <div className="field">
                  <label>Cardholder name</label>
                  <input
                    className={`input ${errors.name ? "error" : ""}`}
                    value={payment.name}
                    onChange={(e) =>
                      setPayment({ ...payment, name: e.target.value })
                    }
                  />
                  {errors.name && (
                    <span className="err">
                      <Icon name="alert" /> {errors.name}
                    </span>
                  )}
                </div>
                <button
                  className="btn accent"
                  style={{ alignSelf: "flex-start", marginTop: 8 }}
                  onClick={() => {
                    if (validatePayment()) setStep(2);
                  }}
                >
                  Review order <Icon name="arrowR" />
                </button>
              </div>
            )}
            {step > 1 && (
              <div className="step-body summary">
                Card ending in{" "}
                {payment.cardNumber.replace(/\s/g, "").slice(-4)} ·{" "}
                {payment.name}
              </div>
            )}
          </div>

          {/* STEP 3 — REVIEW */}
          <div className={`step ${step === 2 ? "active" : "collapsed"}`}>
            <div className="step-head">
              <div className="num">3</div>
              <div className="title">Review &amp; place order</div>
            </div>
            {step === 2 && (
              <div className="step-body">
                <div className="muted tiny">
                  By placing this order, you agree to our terms and privacy
                  policy. Your card will be charged{" "}
                  {formatPriceUSD(total)}.
                </div>
                <button
                  className="btn lg accent"
                  disabled={processing}
                  onClick={handlePlace}
                >
                  {processing ? (
                    "Processing payment…"
                  ) : (
                    <span
                      style={{
                        display: "flex",
                        width: "100%",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <span>Place order</span>
                      <span style={{ opacity: 0.7, fontVariantNumeric: "tabular-nums" }}>
                        {formatPriceUSD(total)}
                      </span>
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SIDE SUMMARY */}
        <aside className="summary-panel">
          <h3>Order summary</h3>
          {items.map((li) => (
            <div key={li.productId} className="summary-line">
              <Placeholder
                label={li.productId}
                tone={productTone(li.productId)}
              />
              <div>
                <div className="sl-name">{li.name}</div>
                <div className="sl-qty">Qty {li.qty}</div>
              </div>
              <div className="sl-price">
                {formatPriceUSD(li.lineTotalCents)}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <div className="totals-row">
              <span>Subtotal</span>
              <span>{formatPriceUSD(subtotal)}</span>
            </div>
            <div className="totals-row">
              <span>Shipping</span>
              <span>{shipping === 0 ? "Free" : formatPriceUSD(shipping)}</span>
            </div>
            <div className="totals-row grand">
              <span>Total</span>
              <span className="val">{formatPriceUSD(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
