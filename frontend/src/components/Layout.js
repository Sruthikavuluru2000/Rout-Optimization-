import { LayoutDashboard, Truck, Map, Settings } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();

  return (
    <div className="grid grid-cols-12 gap-0 h-screen overflow-hidden">
      <div className="col-span-2 h-full border-r bg-slate-900 text-white hidden md:block" data-testid="sidebar">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <Truck className="w-8 h-8 text-blue-400" />
            <h1 className="text-xl font-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>OPTIROUTE</h1>
          </div>
          
          <nav className="space-y-2">
            <a 
              href="/" 
              data-testid="nav-dashboard"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === '/' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-sm font-medium">Dashboard</span>
            </a>
            
            <a 
              href="/results" 
              data-testid="nav-results"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === '/results' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:bg-slate-800'
              }`}
            >
              <Map className="w-5 h-5" />
              <span className="text-sm font-medium">Results</span>
            </a>
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-700">
          <div className="flex items-center gap-3 text-gray-400 text-xs">
            <Settings className="w-4 h-4" />
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
      
      <div className="col-span-12 md:col-span-10 h-full overflow-y-auto bg-slate-50" data-testid="main-content">
        {children}
      </div>
    </div>
  );
};

export default Layout;