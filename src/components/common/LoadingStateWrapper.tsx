import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateWrapperProps {
  loading: boolean;
  dataReady: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  skeletonCount?: number;
}

/**
 * Enterprise-grade loading state wrapper component
 * Prevents rendering of components until data is fully loaded
 * Eliminates flickering and race conditions
 */
export const LoadingStateWrapper: React.FC<LoadingStateWrapperProps> = ({
  loading,
  dataReady,
  fallback,
  children,
  skeletonCount = 3
}) => {
  // Show loading state
  if (loading || !dataReady) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Default skeleton loading
    return (
      <div className="space-y-4">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render children only when data is ready
  return <>{children}</>;
};