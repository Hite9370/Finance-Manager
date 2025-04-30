import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Building, 
  UserCircle,
  PieChart,
  BarChart3,
} from "lucide-react";

export function MobileNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isAdmin = user?.role === "super_admin";

  const navItems = [
    { icon: <LayoutDashboard className="h-6 w-6" />, label: "Dashboard", href: "/" },
    ...(isAdmin ? [{
      icon: <Users className="h-6 w-6" />, 
      label: "Users", 
      href: "/users"
    }] : []),
    { icon: <CreditCard className="h-6 w-6" />, label: "Transactions", href: "/transactions" },
    { icon: <BarChart3 className="h-6 w-6" />, label: "Budgets", href: "/budgets" },
    { icon: <Building className="h-6 w-6" />, label: "Accounts", href: "/accounts" },
    { icon: <PieChart className="h-6 w-6" />, label: "Reports", href: "/reports" },
    { icon: <UserCircle className="h-6 w-6" />, label: "Profile", href: "/profile" },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a
              className={cn(
                "flex flex-col items-center py-3 px-4 text-gray-700 dark:text-gray-300",
                location === item.href && "text-primary dark:text-primary-400"
              )}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
