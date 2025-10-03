import { Assignment } from './hooks/useAssignments';

interface AssignmentManagementHeaderProps {
  hasData: boolean;
  assignments: Assignment[];
}

export const AssignmentManagementHeader = ({
  hasData,
  assignments
}: AssignmentManagementHeaderProps) => {

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          My Assignments
        </h1>
      </div>
      
      {hasData && (
        <div className="text-sm text-muted-foreground">
          Showing all assignments
        </div>
      )}
    </div>
  );
};