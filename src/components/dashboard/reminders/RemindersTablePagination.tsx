'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RemindersTablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalCount: number;
}

export function RemindersTablePagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalCount,
}: RemindersTablePaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-muted-foreground">
        Afișare {startItem}-{endItem} din {totalCount} reminder-e
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              // Show first, last, current, and pages around current
              return (
                page === 1 ||
                page === totalPages ||
                Math.abs(page - currentPage) <= 1
              );
            })
            .map((page, index, arr) => {
              const prevPage = arr[index - 1];
              const showEllipsis = prevPage && page - prevPage > 1;

              return (
                <>
                  {showEllipsis && (
                    <span key={`ellipsis-${page}`} className="px-2 text-muted-foreground">
                      ...
                    </span>
                  )}
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    className="min-w-[2.5rem]"
                  >
                    {page}
                  </Button>
                </>
              );
            })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Următor
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
