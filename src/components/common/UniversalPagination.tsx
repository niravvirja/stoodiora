import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft02Icon, 
  ArrowRight02Icon, 
  GridViewIcon
} from 'hugeicons-react';

interface UniversalPaginationProps {
  currentPage: number;
  totalCount: number;
  filteredCount: number;
  pageSize: number;
  allDataLoaded: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onPageChange?: (page: number) => void;
  showLoadMore?: boolean;
  onPageSizeChange?: (size: number) => void;
}

const UniversalPaginationComponent: React.FC<UniversalPaginationProps> = ({
  currentPage,
  totalCount,
  filteredCount,
  pageSize,
  allDataLoaded,
  loading,
  onLoadMore,
  onPageChange,
  showLoadMore = true,
  onPageSizeChange
}) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // Only show pagination if we have more than 50 items OR pagination is active
  if (totalCount === 0 || (totalCount <= 50 && currentPage === 0)) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-3 py-6">
      <Button
        variant="default"
        size="sm"
        onClick={() => {
          onPageChange?.(currentPage - 1);
          // Smooth scroll to top without jumping
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        disabled={currentPage === 0 || loading}
        className="h-10 w-10 rounded-full p-0"
      >
        <ArrowLeft02Icon className="h-5 w-5" />
      </Button>
      
      <span className="text-sm font-medium text-muted-foreground px-4">
        {currentPage + 1}/{totalPages}
      </span>
      
      <Button
        variant="default"
        size="sm"
        onClick={() => {
          onPageChange?.(currentPage + 1);
          // Smooth scroll to top without jumping
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        disabled={currentPage >= totalPages - 1 || loading}
        className="h-10 w-10 rounded-full p-0"
      >
        <ArrowRight02Icon className="h-5 w-5" />
      </Button>
      
      {onPageSizeChange && totalCount > pageSize && (
        <Button
          variant="default"
          size="sm"
          onClick={() => {
            onPageSizeChange?.(1000);
            // Smooth scroll to top when viewing all
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          disabled={pageSize >= 1000 || loading}
          className="h-10 w-10 rounded-full p-0 ml-2"
          title="View All"
        >
          <GridViewIcon className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export const UniversalPagination = memo(UniversalPaginationComponent);