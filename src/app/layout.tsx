import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'ScrubBuddy - Your AI-Powered Clinical Year Command Center',
  description:
    'Built for third-year medical students who refuse to burn out. Maximize shelf scores, track clinical growth, and let AI tell you exactly what to study next.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased bg-slate-900 text-slate-100`}
      >
        {children}
      </body>
    </html>
  )
}
