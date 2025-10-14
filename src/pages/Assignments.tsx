import { useAuth } from '@/components/auth/AuthProvider';
import FirmRequiredWrapper from '@/components/layout/FirmRequiredWrapper';
import TopNavbar from '@/components/layout/TopNavbar';
import AssignmentManagement from '@/components/assignments/AssignmentManagement';

const Assignments = () => {
  const { profile } = useAuth();

  return (
    <TopNavbar>
      <FirmRequiredWrapper>
        <AssignmentManagement />
      </FirmRequiredWrapper>
    </TopNavbar>
  );
};

export default Assignments;
