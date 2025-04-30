import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { formatCurrency } from "@/lib/utils";
import { 
  Menu, TrendingUp, TrendingDown, 
  Plus, CreditCard, Download, PieChart,
  ArrowUpRight, ArrowDownRight, Wallet, Building,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IncomeExpenseTrends } from "@/components/income-expense-trends";
import { Account, Transaction, Budget } from "@shared/schema";
import { Link } from "wouter";

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState("month");
  const [expenseChartPeriod, setExpenseChartPeriod] = useState("month");

  const { user } = useAuth();

  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
    enabled: !!user,
  });
  
  const { data: budgets = [], isLoading: isLoadingBudgets } = useQuery<Budget[]>({
    queryKey: ["/api/budgets"],
    enabled: !!user,
  });

  // Filter transactions based on time period
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    
    // Apply time period filter
    const now = new Date();
    let startDate = new Date();
    
    switch (selectedTimePeriod) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "all":
        // No date filtering
        return filtered;
      default:
        startDate.setMonth(now.getMonth() - 1); // Default to month
    }
    
    return filtered.filter((t: Transaction) => new Date(t.createdAt) >= startDate);
  }, [transactions, selectedTimePeriod]);

  // Calculate totals
  const totalBalance = accounts.reduce((sum: number, account: Account) => sum + account.balance, 0);
  
  const incomeTransactions = filteredTransactions.filter(t => t.type === "income");
  const expenseTransactions = filteredTransactions.filter(t => t.type === "expense");
  
  const totalIncome = incomeTransactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
  const totalExpenses = expenseTransactions.reduce((sum: number, t: Transaction) => sum + t.amount, 0);

  // Calculate budget remaining
  const totalBudgetAmount = budgets.reduce((sum: number, budget: Budget) => sum + budget.amount, 0);
  const budgetRemaining = totalBudgetAmount - totalExpenses;
  
  // Group expenses by category for the pie chart
  const expensesByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();
    
    expenseTransactions.forEach(t => {
      const currentAmount = categoryMap.get(t.category) || 0;
      categoryMap.set(t.category, currentAmount + t.amount);
    });
    
    return Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);
  }, [expenseTransactions]);
  
  // Get the color for a category
  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      "food": "#F59E0B",
      "housing": "#3B82F6",
      "transportation": "#EF4444",
      "entertainment": "#8B5CF6",
      "utilities": "#EC4899",
      "healthcare": "#10B981",
      "subscription": "#6366F1",
      "shopping": "#F97316",
      "other": "#6B7280"
    };
    
    return colorMap[category.toLowerCase()] || "#6B7280";
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
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Dashboard */}
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Welcome back! Here's your financial summary.
              </p>
            </div>
            
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Income Card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Income</span>
                    <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                      {isLoadingTransactions ? (
                        <Skeleton className="h-8 w-32" />
                      ) : (
                        formatCurrency(totalIncome, user?.currency)
                      )}
                    </div>
                    <div className="mt-1 flex items-center">
                      <span className="text-xs flex items-center text-green-500">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        8.1%
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        vs last month
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 bg-green-100 dark:bg-green-900/30 rounded-full p-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              {/* Expenses Card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Expenses</span>
                    <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                      {isLoadingTransactions ? (
                        <Skeleton className="h-8 w-32" />
                      ) : (
                        formatCurrency(totalExpenses, user?.currency)
                      )}
                    </div>
                    <div className="mt-1 flex items-center">
                      <span className="text-xs flex items-center text-red-500">
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                        2.3%
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        vs last month
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 bg-red-100 dark:bg-red-900/30 rounded-full p-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              
              {/* Savings Card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Savings</span>
                    <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                      {isLoadingTransactions ? (
                        <Skeleton className="h-8 w-32" />
                      ) : (
                        formatCurrency(totalIncome - totalExpenses, user?.currency)
                      )}
                    </div>
                    <div className="mt-1 flex items-center">
                      <span className="text-xs flex items-center text-green-500">
                        <Plus className="h-3 w-3 mr-1" />
                        12.5%
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        vs last month
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                    <Download className="h-4 w-4 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              
              {/* Budget Remaining Card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Budget Remaining</span>
                    <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                      {isLoadingBudgets ? (
                        <Skeleton className="h-8 w-32" />
                      ) : (
                        formatCurrency(budgetRemaining, user?.currency)
                      )}
                    </div>
                    <div className="mt-1 flex items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {isLoadingBudgets ? (
                          <Skeleton className="h-4 w-20" />
                        ) : (
                          totalBudgetAmount > 0 
                            ? `${Math.round((budgetRemaining / totalBudgetAmount) * 100)}% remaining` 
                            : "No budget set"
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full p-2">
                    <CreditCard className="h-4 w-4 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Income vs Expense Trends Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Income vs Expense Trends</h3>
                      <Tabs defaultValue="month" value={expenseChartPeriod} onValueChange={setExpenseChartPeriod} className="w-auto">
                        <TabsList className="bg-gray-100 dark:bg-gray-800">
                          <TabsTrigger value="month" className="text-xs px-3">Month</TabsTrigger>
                          <TabsTrigger value="quarter" className="text-xs px-3">Quarter</TabsTrigger>
                          <TabsTrigger value="year" className="text-xs px-3">Year</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                    <IncomeExpenseTrends 
                      currency={user?.currency} 
                      initialPeriod={expenseChartPeriod as "month" | "quarter" | "year"}
                      transactions={filteredTransactions}
                    />
                  </CardContent>
                </Card>
              </div>
              
              {/* Accounts Overview */}
              <div>
                <Card className="border-0 shadow-sm h-full">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Accounts Overview</h3>
                      <Button variant="ghost" size="sm" asChild className="text-xs text-blue-500 hover:text-blue-700 p-0">
                        <Link to="/accounts">Add Account</Link>
                      </Button>
                    </div>
                    
                    {isLoadingAccounts ? (
                      <div className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : accounts.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400">No accounts added yet</p>
                        <Button asChild className="mt-4" variant="outline">
                          <Link to="/accounts">Add your first account</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {accounts.map((account) => (
                          <div key={account.id} className="p-3 border dark:border-gray-700 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  account.accountType === 'bank' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'
                                }`}>
                                  {account.accountType === 'bank' ? (
                                    <Building className={`h-4 w-4 text-blue-500`} />
                                  ) : (
                                    <Wallet className={`h-4 w-4 text-green-500`} />
                                  )}
                                </div>
                                <div className="ml-3">
                                  <p className="font-medium text-gray-900 dark:text-white">{account.name || `${account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)} Account`}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)} 
                                    {account.description ? ` • ${account.description.substring(0, 15)}${account.description.length > 15 ? '...' : ''}` : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(account.balance, user?.currency)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {accounts.length > 0 && (
                          <div className="pt-3 mt-4 border-t dark:border-gray-700">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Total Balance</span>
                              <span className="font-bold text-lg text-gray-900 dark:text-white">
                                {formatCurrency(totalBalance, user?.currency)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Recent Transactions and Expenses by Category */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Transactions */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Transactions</h3>
                    <Button variant="ghost" size="sm" asChild className="text-xs text-blue-500 hover:text-blue-700 p-0">
                      <Link to="/transactions">View All</Link>
                    </Button>
                  </div>
                  
                  {isLoadingTransactions ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">No transactions recorded yet</p>
                      <Button asChild className="mt-4" variant="outline">
                        <Link to="/transactions">Add your first transaction</Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-1">
                        <div className="col-span-2">Transaction</div>
                        <div className="text-center">Category</div>
                        <div className="text-right">Amount</div>
                      </div>
                      
                      <div className="space-y-4">
                        {transactions.slice(0, 5).map((transaction) => {
                          const account = accounts.find(a => a.id === transaction.accountId);
                          return (
                            <div key={transaction.id} className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 col-span-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  transaction.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                                }`}>
                                  {transaction.type === 'income' ? (
                                    <ArrowUpRight className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <ArrowDownRight className="h-5 w-5 text-red-500" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {transaction.description}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(transaction.createdAt).toLocaleDateString()} • {account?.name || 'Unknown Account'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-center">
                                <Badge variant="outline" className="capitalize">
                                  {transaction.category}
                                </Badge>
                              </div>
                              <div className={`text-right font-medium ${
                                transaction.type === 'income' ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {transaction.type === 'income' ? '+' : '-'}
                                {formatCurrency(transaction.amount, user?.currency)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {transactions.length > 5 && (
                        <div className="mt-6 text-center">
                          <Button asChild variant="outline">
                            <Link to="/transactions">View All Transactions</Link>
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* Expenses by Category */}
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Expenses by Category</h3>
                    <Select 
                      defaultValue={selectedTimePeriod}
                      onValueChange={setSelectedTimePeriod}
                    >
                      <SelectTrigger className="w-[110px] h-8 text-xs">
                        <SelectValue placeholder="Time Period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {isLoadingTransactions ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <Skeleton className="h-64 w-64 rounded-full" />
                    </div>
                  ) : expensesByCategory.length === 0 ? (
                    <div className="text-center py-16">
                      <PieChart className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No expense data available</p>
                      <Button asChild className="mt-4" variant="outline">
                        <Link to="/transactions">Add an expense</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row items-center space-y-8 md:space-y-0">
                      {/* Donut chart visualization */}
                      <div className="relative w-48 h-48">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          {/* Create the donut chart segments */}
                          {expensesByCategory.map((item, index, array) => {
                            let previousEndAngle = 0;
                            
                            // Calculate the previous segments' angles
                            for (let i = 0; i < index; i++) {
                              previousEndAngle += (array[i].percentage / 100) * 360;
                            }
                            
                            const startAngle = previousEndAngle;
                            const angle = (item.percentage / 100) * 360;
                            const endAngle = startAngle + angle;
                            
                            // Convert angles to radians for calculation
                            const startRad = (startAngle - 90) * (Math.PI / 180);
                            const endRad = (endAngle - 90) * (Math.PI / 180);
                            
                            // Calculate the SVG path for the arc
                            const x1 = 50 + 40 * Math.cos(startRad);
                            const y1 = 50 + 40 * Math.sin(startRad);
                            const x2 = 50 + 40 * Math.cos(endRad);
                            const y2 = 50 + 40 * Math.sin(endRad);
                            
                            // Large arc flag determines if the arc should be greater than or less than 180 degrees
                            const largeArcFlag = angle > 180 ? 1 : 0;
                            
                            // Path construction for the arc
                            const path = [
                              `M 50 50`,
                              `L ${x1} ${y1}`,
                              `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                              `Z`
                            ].join(' ');
                            
                            return (
                              <path
                                key={item.category}
                                d={path}
                                fill={getCategoryColor(item.category)}
                                stroke="#fff"
                                strokeWidth="0.5"
                              />
                            );
                          })}
                          {/* Inner circle to create the donut hole */}
                          <circle cx="50" cy="50" r="25" fill="white" className="dark:fill-gray-900" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Total</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(totalExpenses, user?.currency)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Legend */}
                      <div className="flex-1 pl-0 md:pl-8 w-full">
                        <div className="space-y-3">
                          {expensesByCategory.map((item) => (
                            <div key={item.category} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span 
                                  className="w-3 h-3 rounded-full mr-2" 
                                  style={{ backgroundColor: getCategoryColor(item.category) }}
                                ></span>
                                <span className="text-sm capitalize text-gray-700 dark:text-gray-300">
                                  {item.category}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(item.amount, user?.currency)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {item.percentage}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}