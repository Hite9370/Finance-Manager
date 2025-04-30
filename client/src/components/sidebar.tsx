import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  BarChart3, 
  Building, 
  UserCircle,
  PieChart,
  LogOut
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const isAdmin = user?.role === "super_admin";

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    { icon: <LayoutDashboard className="h-5 w-5 mr-3" />, label: "Dashboard", href: "/" },
    ...(isAdmin ? [{
      icon: <Users className="h-5 w-5 mr-3" />, 
      label: "User Management", 
      href: "/users"
    }] : []),
    { icon: <CreditCard className="h-5 w-5 mr-3" />, label: "Transactions", href: "/transactions" },
    { icon: <BarChart3 className="h-5 w-5 mr-3" />, label: "Budgets", href: "/budgets" },
    { icon: <Building className="h-5 w-5 mr-3" />, label: "Accounts", href: "/accounts" },
    { icon: <PieChart className="h-5 w-5 mr-3" />, label: "Reports", href: "/reports" },
    { icon: <UserCircle className="h-5 w-5 mr-3" />, label: "My Profile", href: "/profile" },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-10 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside 
        className={cn(
          "fixed top-0 left-0 z-20 h-full w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-150 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-6 pt-8 pb-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold text-primary">Finance Manager</h1>
            <button 
              onClick={() => setIsOpen(false)} 
              className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <nav className="flex-1 space-y-1">
            {navItems.map(item => (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setIsOpen(false)}
              >
                <a 
                  className={cn(
                    "flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 group",
                    location === item.href && "bg-primary-50 dark:bg-gray-700 text-primary dark:text-white"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              </Link>
            ))}
          </nav>
          
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Dark Mode</span>
              <ThemeToggle />
            </div>
            
            <Button
              variant="ghost"
              className="w-full justify-start mt-2 px-4 py-2 text-gray-700 dark:text-gray-300"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
