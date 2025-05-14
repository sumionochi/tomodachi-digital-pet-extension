// app/layout.tsx
import type { Metadata } from "next";
import { Nunito, PT_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Providers } from "@/components/Providers";
import "@mysten/dapp-kit/dist/index.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const ptSans = PT_Sans({
  variable: "--font-pt-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Tomodachi · a digital pet game",
  description: "Your SuiPet companion in the Sui ecosystem.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={nunito.className} suppressHydrationWarning>
      <body
        className={` font-sans antialiased relative`}
      >
        <div className="texture" />
        <ThemeProvider attribute="class" defaultTheme="light">
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}