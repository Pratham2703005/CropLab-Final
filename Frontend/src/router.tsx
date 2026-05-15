import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import { CreateFarm } from './pages/CreateFarm';
import FarmDetail from './pages/FarmDetail';
import EditFarm from './pages/EditFarm';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/create-farm',
    element: <CreateFarm />,
  },
  {
    path: '/farm/:id',
    element: <FarmDetail />,
  },
  {
    path: '/farm/:id/edit',
    element: <EditFarm />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
