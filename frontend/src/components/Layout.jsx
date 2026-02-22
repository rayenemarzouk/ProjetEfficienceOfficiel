import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user } = useAuth();
  const isRayan = user?.email === 'maarzoukrayan3@gmail.com';

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${isRayan ? 'bg-[#0a1628]' : 'bg-[#f8fafc] dark:bg-[#0f172a]'}`}>
      <Sidebar />
      <main className="flex-1 ml-56">
        <Outlet />
      </main>
    </div>
  );
}
