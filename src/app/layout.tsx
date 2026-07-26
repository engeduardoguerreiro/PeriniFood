import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { NumberInputWheelGuard } from "@/components/number-input-wheel-guard";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-brand",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PeriniFood",
  description: "Software de gestão para restaurantes e deliveries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${jakarta.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NumberInputWheelGuard />
        {children}
      </body>
    </html>
  );
}
