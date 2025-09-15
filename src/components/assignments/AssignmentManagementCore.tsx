import { useState, useMemo } from 'react';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import { useAssignments } from './hooks/useAssignments';
import { AssignmentManagementHeader } from './AssignmentManagementHeader';
import { AssignmentStatsCards } from './AssignmentStatsCards';
import { AssignmentContent } from './AssignmentContent';

const AssignmentManagementCore = () => {
  const {
    assignments,
    loading,
    isAdmin
  } = useAssignments();


  if (loading) {
    return <PageTableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <AssignmentManagementHeader
        hasData={assignments.length > 0}
        assignments={assignments}
      />

      <AssignmentStatsCards assignments={assignments} />

      <AssignmentContent
        assignments={assignments}
        isAdmin={isAdmin}
      />
    </div>
  );
};

export default AssignmentManagementCore;