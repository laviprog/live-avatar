// Set from BASE_PATH in next.config.ts — client fetches to our own API
// routes aren't rewritten automatically by Next.js like <Link>/useRouter are.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
