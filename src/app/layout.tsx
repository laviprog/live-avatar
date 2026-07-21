import React from 'react';
import './globals.css';
import { Slide, ToastContainer } from 'react-toastify';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={cn('h-full font-sans', inter.variable)}>
      <body className="h-full flex flex-col justify-center items-center antialiased">
        <ToastContainer
          position="top-left"
          autoClose={2000}
          limit={1}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          transition={Slide}
        />
        {children}
      </body>
    </html>
  );
}
