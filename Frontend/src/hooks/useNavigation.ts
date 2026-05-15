import { useNavigate } from 'react-router-dom';

export function useFarmActions() {
  const navigate = useNavigate();

  const handleCreateFarm = () => {
    navigate('/create-farm');
  };

  const handleOpenDashboard = () => {
    navigate('/dashboard');
  };

  return {
    handleCreateFarm,
    handleOpenDashboard,
  };
}
