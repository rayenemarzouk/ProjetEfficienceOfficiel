import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 ml-56">
        <Outlet />
      </main>
    </div>
  );
}
