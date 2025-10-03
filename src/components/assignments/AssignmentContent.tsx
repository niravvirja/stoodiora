import { Assignment } from './hooks/useAssignments';
import { AssignmentTableView } from './AssignmentTableView';

interface AssignmentContentProps {
  assignments: Assignment[];
  isAdmin: boolean;
}

export const AssignmentContent = ({ assignments, isAdmin }: AssignmentContentProps) => {
  return <AssignmentTableView assignments={assignments} isAdmin={isAdmin} />;
};