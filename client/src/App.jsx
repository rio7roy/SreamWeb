import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import router from './routes';
import PublicFormPage from './pages/PublicFormPage';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
