import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h2 className="text-2xl font-bold">404 - Page not found</h2>
      <p className="text-gray-500">The page you are looking for does not exist.</p>
      <Link href="/" className="text-blue-500 hover:underline">
        Back to home
      </Link>
    </div>
  );
}

