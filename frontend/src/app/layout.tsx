import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import AuthModal from "@/components/AuthModal";
import "./globals.css";

export const metadata: Metadata = {
  title: "OPTOM.BG - B2B Зареждане на магазини",
  description: "B2B Платформа за презареждане на хранителни стоки с Net 60 дни условия",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bg">
      <body>
        <AuthProvider>
          <AuthModal />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
