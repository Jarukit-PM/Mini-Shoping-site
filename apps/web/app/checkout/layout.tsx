import { requireSignedIn } from "@/lib/require-signed-in";

export default async function CheckoutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireSignedIn();
  return <>{children}</>;
}
