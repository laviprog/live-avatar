'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col h-screen gap-5 items-center justify-center">
      <h2 className="text-5xl">Что-то пошло не так</h2>
      <Button className="text-2xl px-5 py-3" onClick={() => reset()}>
        Попробовать снова
      </Button>
    </div>
  );
}
