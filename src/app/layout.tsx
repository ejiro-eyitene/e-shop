import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart/CartProvider";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "e-shop — Nigerian E-commerce",
  description: "e-shop: quality products, secure Paystack checkout, instant email receipts.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning is required here (not a hack): browser
    // extensions such as QuickBundle inject attributes onto <html> before
    // React hydrates, which otherwise triggers a mismatch error on every page.
    // React still warns about mismatches inside children -- only this
    // element's own attributes are exempted.
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className="min-h-screen bg-base-200 antialiased">
        <CartProvider>
          <Navbar />
          <main className="container mx-auto max-w-6xl px-4 py-8">
            {children}
          </main>
          <footer className="footer footer-center bg-base-300 p-6 text-sm">
            <p>
              © {new Date().getFullYear()} e-shop. Built with Next.js + daisyUI.
            </p>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}