import { createClient } from '@/utils/supabase/server'
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from 'next/font/google'
import "./globals.css";
import GlobalNav from './components/GlobalNav';
import GlobalFooter from './components/GlobalFooter';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-heading' })
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-mono' })

export const metadata = {
  title: "Velocity — The cheapest GPUs for AI",
  description: "Deploy A100s, H100s, and RTX 4090s at up to 80% off cloud pricing. Per-minute billing. No credit card required to start.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable}`}>
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
      </head>
      <body className="font-sans antialiased bg-[#0B0F19] text-[#E2E8F0] selection:bg-primary/30">
          <GlobalNav userEmail={user?.email} />
          {children}
          <GlobalFooter />
      </body>
    </html>
  );
}
