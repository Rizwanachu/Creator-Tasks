import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0B0B0F] px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold text-white mb-4">404</div>
        <h1 className="text-2xl font-semibold text-white mb-3">Page not found</h1>
        <p className="text-zinc-400 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <Button asChild className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl">
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}
