import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background animated-gradient-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10">
            <FileQuestion className="size-8 text-emerald-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">404</h1>
        <p className="text-muted-foreground mt-2">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center mt-6">
          <Button asChild className="bg-emerald-600 hover:bg-emerald-500 text-white">
            <Link href="/">Back to LeadFinder</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
