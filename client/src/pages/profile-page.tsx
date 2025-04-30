import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Menu, User, CreditCard, Sun, Moon, Globe, FileText, BellRing, HelpCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
});

export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("appearance");
  
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });

  const onProfileSubmit = async (data: z.infer<typeof profileFormSchema>) => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      const res = await apiRequest("PATCH", `/api/users/${user.id}`, data);
      const updatedUser = await res.json();
      
      // Update the user in the cache
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const updateTheme = async (isDark: boolean) => {
    if (!user) return;
    
    try {
      const res = await apiRequest("PATCH", `/api/users/${user.id}`, { 
        theme: isDark ? "dark" : "light" 
      });
      const updatedUser = await res.json();
      
      // Update the user in the cache
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      // Apply theme change
      document.documentElement.classList.toggle("dark", isDark);
      
      toast({
        title: "Theme updated",
        description: `Theme changed to ${isDark ? "dark" : "light"} mode.`,
      });
    } catch (error) {
      toast({
        title: "Theme update failed",
        description: error instanceof Error ? error.message : "Failed to update theme preference",
        variant: "destructive",
      });
    }
  };

  const updateCurrency = async (currency: string) => {
    if (!user) return;
    
    try {
      const res = await apiRequest("PATCH", `/api/users/${user.id}`, { currency });
      const updatedUser = await res.json();
      
      // Update the user in the cache
      queryClient.setQueryData(["/api/user"], updatedUser);
      
      toast({
        title: "Currency preference updated",
        description: `Your currency has been set to ${currency}.`,
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update currency preference",
        variant: "destructive",
      });
    }
  };

  const menuItems = [
    { id: "appearance", icon: <Sun size={18} />, label: "Appearance" },
    { id: "currency", icon: <CreditCard size={18} />, label: "Currency" },
    { id: "data", icon: <FileText size={18} />, label: "Data Management" },
    { id: "notifications", icon: <BellRing size={18} />, label: "Notifications" },
    { id: "account", icon: <User size={18} />, label: "Account" },
    { id: "help", icon: <HelpCircle size={18} />, label: "Help & Support" },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Appearance</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Customize how the application looks and feels
              </p>
              
              <h3 className="text-base font-medium mb-3">Theme</h3>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center space-x-4">
                  <Sun className="h-5 w-5 text-gray-500" />
                  <span className="text-sm">Light</span>
                </div>
                <Switch 
                  checked={user?.theme === "dark"}
                  onCheckedChange={updateTheme}
                />
                <div className="flex items-center space-x-4">
                  <span className="text-sm">Dark</span>
                  <Moon className="h-5 w-5 text-gray-500" />
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="text-base font-medium mb-3">Language</h3>
                <Select defaultValue="en">
                  <SelectTrigger className="w-full max-w-xs">
                    <div className="flex items-center">
                      <Globe className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Select language" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-2 text-sm text-gray-500">
                  Changes the language used throughout the application.
                </p>
              </div>
            </div>
          </div>
        );
      
      case "currency":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Currency</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Manage currency preferences and display format
              </p>
              
              <h3 className="text-base font-medium mb-3">Default Currency</h3>
              <Select 
                defaultValue={user?.currency || "USD"}
                onValueChange={updateCurrency}
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-2 text-sm text-gray-500">
                This will be used as the default currency for all transactions.
              </p>
            </div>
          </div>
        );
      
      case "account":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Account</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Manage your profile and account settings
              </p>
              
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="max-w-md" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} className="max-w-md" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-2">
                    <Button type="submit" disabled={isUpdating}>
                      {isUpdating ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
              
              <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-base font-medium mb-4">Account Role</h3>
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full text-blue-800 dark:text-blue-200 text-sm font-medium">
                    {user?.role === "super_admin" ? "Super Admin" : "User"}
                  </div>
                  <p className="text-sm text-gray-500">
                    {user?.role === "super_admin" 
                      ? "You have full administrative access to all features" 
                      : "Standard user access to personal data and features"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "data":
      case "notifications":
      case "help":
        return (
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="text-center p-6">
              <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-2">
                Coming Soon
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                This section is currently under development.
              </p>
            </div>
          </div>
        );
      
      default:
        return <div>Select a section from the menu</div>;
    }
  };

  return (
    <div className="min-h-screen dark:bg-gray-900 dark:text-gray-200">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 z-20 m-4">
        <button 
          onClick={() => setSidebarOpen(true)} 
          className="p-2 rounded-md bg-white dark:bg-gray-800 shadow"
        >
          <Menu className="h-6 w-6 text-gray-700 dark:text-gray-200" />
        </button>
      </div>
      
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen pb-16 lg:pb-0">
        <div className="p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Customize your expense tracker experience
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6">
            {/* Settings Navigation */}
            <Card className="md:w-56 shrink-0">
              <CardContent className="p-4">
                <nav>
                  <ul className="space-y-1">
                    {menuItems.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => setActiveSection(item.id)}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                            activeSection === item.id
                              ? "bg-gray-100 dark:bg-gray-800 font-medium"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <span className="text-gray-500 dark:text-gray-400">{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </CardContent>
            </Card>
            
            {/* Settings Content */}
            <Card className="flex-grow">
              <CardContent className="p-6">
                {renderSection()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}
