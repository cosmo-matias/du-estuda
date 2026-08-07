import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlanProvider } from "@/contexts/PlanContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DuEstuda",
  description: "Plataforma inteligente de estudos para concursos públicos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="h-full">
        <AuthProvider>
          <PlanProvider>
            <DashboardLayout>{children}</DashboardLayout>
          </PlanProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
