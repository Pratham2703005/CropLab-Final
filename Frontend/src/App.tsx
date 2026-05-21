import { RouterProvider } from 'react-router-dom';
import { ServerStatusProvider } from '@/contexts/ServerStatusContext';
import { router } from './router';

function App() {
  return (
    <ServerStatusProvider>
      <RouterProvider router={router} />
    </ServerStatusProvider>
  );
}

export default App;
