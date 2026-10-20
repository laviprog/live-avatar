import type React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  children,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`px-3 py-2 rounded-xl bg-purple-700 hover:ring-1 hover:ring-white cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
