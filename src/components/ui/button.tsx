import React from 'react';
import clsx from 'clsx';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
};

export default function Button({ children, className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'px-3 py-2 rounded-xl bg-purple-700 hover:ring-1 hover:ring-white cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
