import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, App } from 'antd';
import enUS from 'antd/locale/en_US';
import AppLayout from '../components/AppLayout';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FM24 LNC',
  description: 'FM24 LNC - Football Manager Database Management & Explorer',
  icons: {
    icon: [
      { url: '/fm/favicon.ico', sizes: 'any' },
      { url: '/fm/favicon.png', type: 'image/png', sizes: '32x32' },
      { url: '/fm/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/fm/favicon.ico',
    apple: '/fm/icons/apple-touch-icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.className} ${inter.variable}`}>
      <body className={`${inter.className} ${inter.variable} antialiased desktop-bg`}>
        <AntdRegistry>
          <ConfigProvider
            locale={enUS}
            theme={{
              token: {
                colorPrimary: '#1d70b8',
                borderRadius: 6,
                fontFamily: `var(--font-inter, 'Inter'), Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
              },
            }}
          >
            <App className="h-full w-full">
              <div id="mobile-frame-root" className="h-full w-full flex flex-col overflow-hidden">
                <AppLayout>{children}</AppLayout>
              </div>
            </App>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
