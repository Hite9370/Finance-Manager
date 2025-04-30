import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import {
  Menu,
  Paintbrush,
  Sun,
  Moon,
  DollarSign,
  Database,
  Bell,
  User,
  HelpCircle,
  Download,
  Upload,
  Trash2,
  Languages,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "appearance",
    label: "Appearance",
    icon: <Paintbrush className="h-4 w-4" />,
  },
  {
    id: "currency",
    label: "Currency",
    icon: <DollarSign className="h-4 w-4" />,
  },
  {
    id: "data",
    label: "Data Management",
    icon: <Database className="h-4 w-4" />,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <Bell className="h-4 w-4" />,
  },
  { id: "account", label: "Account", icon: <User className="h-4 w-4" /> },
  {
    id: "help",
    label: "Help & Support",
    icon: <HelpCircle className="h-4 w-4" />,
  },
];

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("appearance");
  const { toast } = useToast();
  const { user, loginMutation } = useAuth();

  // User preferences state
  const [theme, setTheme] = useState(user?.theme || "light");
  const [currency, setCurrency] = useState<
    "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD"
  >((user?.currency as "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD") || "USD");
  const [language, setLanguage] = useState("english");

  // Notification preferences state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [newTransactionAlerts, setNewTransactionAlerts] = useState(true);
  const [recurringTransactionReminders, setRecurringTransactionReminders] =
    useState(true);
  const [monthlySummary, setMonthlySummary] = useState(true);

  // Theme mutation
  const updateThemeMutation = useMutation({
    mutationFn: async (newTheme: string) => {
      const res = await fetch("/api/user/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      });

      if (!res.ok) throw new Error("Failed to update theme");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Theme updated",
        description: `Theme has been set to ${
          theme === "light" ? "Light" : "Dark"
        }.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update theme",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Currency mutation
  const updateCurrencyMutation = useMutation({
    mutationFn: async (newCurrency: string) => {
      const res = await fetch("/api/user/currency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: newCurrency }),
      });

      if (!res.ok) throw new Error("Failed to update currency");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Currency updated",
        description: `Currency has been set to ${currency}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update currency",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Export data function
  const handleExportData = async () => {
    try {
      // Fetch all user data
      const accounts = await fetch("/api/accounts").then((res) => res.json());
      const transactions = await fetch("/api/transactions").then((res) =>
        res.json()
      );
      const budgets = await fetch("/api/budgets").then((res) => res.json());

      // Prepare the export data
      const exportData = {
        user: {
          name: user?.name,
          email: user?.email,
          currency: user?.currency,
          theme: user?.theme,
        },
        accounts,
        transactions,
        budgets,
        exportDate: new Date().toISOString(),
      };

      // Convert to JSON and create download link
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
        dataStr
      )}`;

      const exportFileDefaultName = `expense-tracker-export-${
        new Date().toISOString().split("T")[0]
      }.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();

      toast({
        title: "Data exported successfully",
        description: "Your data has been exported as a JSON file.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          "There was an error exporting your data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Import data function
  const handleImportData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);

          // This would actually import the data in a real implementation
          // For this demo, we'll just show a success toast

          toast({
            title: "Data import successful",
            description:
              "Your data has been imported. This is a demo and no actual import was performed.",
          });
        } catch (error) {
          toast({
            title: "Import failed",
            description:
              "There was an error reading your import file. Make sure it's a valid JSON file.",
            variant: "destructive",
          });
        }
      };

      reader.readAsText(file);
    };

    input.click();
  };

  // Delete all data function
  const handleDeleteAllData = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete all your data? This action cannot be undone."
      )
    ) {
      try {
        // This would actually delete the data in a real implementation
        // For this demo, we'll just show a success toast

        toast({
          title: "All data deleted",
          description:
            "This is a demo - your data has not actually been deleted.",
        });
      } catch (error) {
        toast({
          title: "Delete failed",
          description:
            "There was an error deleting your data. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    updateThemeMutation.mutate(newTheme);

    // Also update document class for immediate visual feedback
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Handle currency change
  const handleCurrencyChange = (value: string) => {
    setCurrency(value as "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD");
    updateCurrencyMutation.mutate(value);
  };

  // Render the selected tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "appearance":
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Appearance
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Customize how the application looks and feels
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Theme
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sun className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Light
                    </span>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={toggleTheme}
                  />
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Dark
                    </span>
                    <Moon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Language
                </h3>
                <Select defaultValue={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-full md:w-72">
                    <div className="flex items-center">
                      <Languages className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Select language" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="spanish">Spanish</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="german">German</SelectItem>
                    <SelectItem value="chinese">Chinese</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Changes the language used throughout the application.
                </p>
              </div>
            </div>
          </div>
        );

      case "currency":
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Currency
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Change the currency used throughout the application
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Currency
                </h3>
                <Select
                  defaultValue={currency}
                  onValueChange={handleCurrencyChange}
                >
                  <SelectTrigger className="w-full md:w-72">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Select currency" />
                    </div>
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
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  All financial values will be displayed in this currency.
                </p>
              </div>
            </div>
          </div>
        );

      case "data":
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Data Management
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Import, export, or delete your financial data
            </p>

            <div className="space-y-6">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-start">
                  <Download className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                      Export Data
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Download all your accounts, transactions, and budget data
                      as a JSON file.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleExportData}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      Export Data
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-start">
                  <Upload className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                      Import Data
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Import accounts, transactions, and budgets from a
                      previously exported file.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleImportData}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      Import Data
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-start">
                  <Trash2 className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                      Delete All Data
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Permanently delete all your financial data. This action
                      cannot be undone.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleDeleteAllData}
                      variant="destructive"
                    >
                      Delete All Data
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Notifications
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Configure how and when you receive notifications
            </p>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">
                    Enable Notifications
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive alerts for important events
                  </p>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Notification Preferences
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="budget-alerts" className="flex-1">
                      Budget Alerts
                    </Label>
                    <Switch
                      id="budget-alerts"
                      checked={budgetAlerts && notificationsEnabled}
                      onCheckedChange={setBudgetAlerts}
                      disabled={!notificationsEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-transactions" className="flex-1">
                      New Transactions
                    </Label>
                    <Switch
                      id="new-transactions"
                      checked={newTransactionAlerts && notificationsEnabled}
                      onCheckedChange={setNewTransactionAlerts}
                      disabled={!notificationsEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="recurring-reminders" className="flex-1">
                      Recurring Transaction Reminders
                    </Label>
                    <Switch
                      id="recurring-reminders"
                      checked={
                        recurringTransactionReminders && notificationsEnabled
                      }
                      onCheckedChange={setRecurringTransactionReminders}
                      disabled={!notificationsEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="monthly-summary" className="flex-1">
                      Monthly Summary
                    </Label>
                    <Switch
                      id="monthly-summary"
                      checked={monthlySummary && notificationsEnabled}
                      onCheckedChange={setMonthlySummary}
                      disabled={!notificationsEnabled}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "account":
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Account
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Manage your account settings and profile information
            </p>

            <div className="space-y-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Profile Information
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Name
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Email
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Role
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Button variant="destructive" className="w-full sm:w-auto">
                  Delete Account
                </Button>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  This will permanently delete your account and all associated
                  data.
                </p>
              </div>
            </div>
          </div>
        );

      case "help":
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Help & Support
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Get help with using the expense tracker
            </p>

            <div className="space-y-6">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-4 mt-4">
                  <div>
                    <h4 className="text-base font-medium text-gray-900 dark:text-white">
                      How do I add a new transaction?
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Go to the Transactions page and click the "Add
                      Transaction" button in the top-right corner.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-gray-900 dark:text-white">
                      How do I create a budget?
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Navigate to the Budget page and click "Add Budget". Then
                      select a category and enter your budget amount.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-gray-900 dark:text-white">
                      Can I export my data?
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Yes! Go to Settings, then Data Management, then Export
                      Data to download all your financial data.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Contact Support
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  If you need further assistance, please contact our support
                  team.
                </p>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    (window.location.href = "mailto:support@expensetracker.com")
                  }
                >
                  Email Support
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-gray-200">
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
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Settings
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Customize your expense tracker experience
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Settings Navigation */}
              <div className="col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                  <nav className="flex flex-col p-2 space-y-1">
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex items-center px-3 py-2 rounded-md transition-colors",
                          activeTab === tab.id
                            ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750"
                        )}
                      >
                        <span className="mr-3 text-gray-500 dark:text-gray-400">
                          {tab.icon}
                        </span>
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Settings Content */}
              <div className="col-span-1 md:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  {renderTabContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}
