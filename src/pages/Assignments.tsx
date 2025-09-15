import { useAuth } from '@/components/auth/AuthProvider';
import FirmRequiredWrapper from '@/components/layout/FirmRequiredWrapper';
import TopNavbar from '@/components/layout/TopNavbar';
import AssignmentManagementCore from '@/components/assignments/AssignmentManagementCore';

const Assignments = () => {
  const { profile } = useAuth();

  return (
    <TopNavbar>
      <FirmRequiredWrapper>
        <AssignmentManagementCore />
      </FirmRequiredWrapper>
    </TopNavbar>
  );
};

export default Assignments;