import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "GenieAi",
  description:
    "Build something great with GenieAi that works the way you want.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#3b82f6",
        },
      }}
    >
      <html lang="en" className={cn(inter.variable, "scroll-smooth")}>
        <body className="flex min-h-screen w-full items-center justify-center">
          {children}
          <Toaster richColors />
        </body>
      </html>
    </ClerkProvider>
  )
}
