'use client';

import { Toaster } from 'sonner';

export function ToasterProvider(): JSX.Element {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      toastOptions={{
        duration: 4000,
      }}
    />
  );
}
