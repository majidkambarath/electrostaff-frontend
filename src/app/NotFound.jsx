import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { buttonVariants } from '@/shared/ui/button';
import { EmptyState } from '@/shared/components/States';

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The page you’re looking for doesn’t exist or has moved."
      action={<Link to="/" className={buttonVariants({ size: 'sm' })}>Back to dashboard</Link>}
      className="mt-10"
    />
  );
}
