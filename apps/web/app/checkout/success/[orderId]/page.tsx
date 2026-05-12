import Link from "next/link";

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-sm font-medium text-[var(--accent)]">Order placed</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Thank you</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-400">
        Your order ID is{" "}
        <span className="font-mono text-sm font-semibold text-[var(--foreground)]">{orderId}</span>
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm font-medium">
        <Link className="text-[var(--accent)] hover:underline" href={`/orders/${orderId}`}>
          View order
        </Link>
        <Link className="text-[var(--accent)] hover:underline" href="/orders">
          Order history
        </Link>
        <Link className="text-slate-600 hover:underline dark:text-slate-400" href="/">
          Back to store
        </Link>
      </div>
    </div>
  );
}
