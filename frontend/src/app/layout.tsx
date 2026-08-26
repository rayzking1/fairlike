import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import AuthModal from "@/components/AuthModal";
import CartReminderToast from "@/components/CartReminderToast";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "OPTOM.BG - B2B Платформа за презареждане на търговски обекти",
  description: "Директни доставки на едро от производители и официални вносители към магазини.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg">
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            {children}
            <AuthModal />
            <CartReminderToast />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
