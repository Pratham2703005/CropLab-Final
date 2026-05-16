import { useNavigate } from 'react-router-dom';

export function useCropLabNavigation() {
  const navigate = useNavigate();

  const navigateToCreateFarm = () => {
    navigate('/create-farm');
  };

  const navigateToDashboard = () => {
    navigate('/dashboard');
  };

  const navigateToFarmDetails = (farmId: string) => {
    navigate(`/farms/${farmId}`);
  }
  return {
    navigateToCreateFarm,
    navigateToDashboard,
    navigateToFarmDetails
  };
}
