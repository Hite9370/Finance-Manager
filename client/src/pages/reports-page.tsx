import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Menu, BarChart3, PieChart, Filter, Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Transaction, Account } from "@shared/schema";
import {
  PieChart as RechartsArcChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

export default function ReportsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  
  // State for report filters
  const [reportType, setReportType] = useState("expense");
  const [timeFrame, setTimeFrame] = useState("month");
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(1))); // First day of current month
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  
  // Fetch transactions data
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });
  
  // Fetch accounts data for filtering
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
    enabled: !!user,
  });
  
  // Filter transactions based on selected criteria
  const filteredTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.createdAt);
    const isInDateRange = transactionDate >= startDate && transactionDate <= endDate;
    const matchesType = transaction.type === reportType;
    const matchesAccount = selectedAccountId 
      ? transaction.accountId === parseInt(selectedAccountId)
      : true;
    
    return isInDateRange && matchesType && matchesAccount;
  });
  
  // Group transactions by category for pie chart
  const categoryData = filteredTransactions.reduce((acc, transaction) => {
    const existingCategory = acc.find(item => item.name === transaction.category);
    
    if (existingCategory) {
      existingCategory.value += transaction.amount;
    } else {
      acc.push({
        name: transaction.category,
        value: transaction.amount
      });
    }
    
    return acc;
  }, [] as { name: string; value: number }[]);
  
  // Generate monthly data for bar chart
  const getMonthlyData = () => {
    const monthlyData: { name: string; amount: number }[] = [];
    const months: Record<string, number> = {};
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.createdAt);
      const monthKey = format(date, 'MMM yyyy');
      
      if (months[monthKey]) {
        months[monthKey] += transaction.amount;
      } else {
        months[monthKey] = transaction.amount;
      }
    });
    
    Object.entries(months).forEach(([month, amount]) => {
      monthlyData.push({ name: month, amount });
    });
    
    return monthlyData.sort((a, b) => {
      // Sort the months chronologically
      const dateA = new Date(a.name);
      const dateB = new Date(b.name);
      return dateA.getTime() - dateB.getTime();
    });
  };
  
  // Generate daily data for bar chart (for shorter time periods)
  const getDailyData = () => {
    const dailyData: { name: string; amount: number }[] = [];
    const days: Record<string, number> = {};
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.createdAt);
      const dayKey = format(date, 'dd MMM');
      
      if (days[dayKey]) {
        days[dayKey] += transaction.amount;
      } else {
        days[dayKey] = transaction.amount;
      }
    });
    
    Object.entries(days).forEach(([day, amount]) => {
      dailyData.push({ name: day, amount });
    });
    
    return dailyData.sort((a, b) => {
      // Sort the days chronologically
      const monthA = new Date(a.name + ' ' + new Date().getFullYear());
      const monthB = new Date(b.name + ' ' + new Date().getFullYear());
      return monthA.getTime() - monthB.getTime();
    });
  };
  
  // Get total amount
  const totalAmount = filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  
  // Pie chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#4CAF50', '#E91E63', '#9C27B0'];
  
  // Generate report title
  const getReportTitle = () => {
    const type = reportType.charAt(0).toUpperCase() + reportType.slice(1);
    const account = selectedAccountId 
      ? accounts.find(a => a.id.toString() === selectedAccountId)?.name || 'Selected Account'
      : 'All Accounts';
    
    return `${type} Report for ${account} (${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')})`;
  };
  
  // Handle preset time frame selection
  const handleTimeFrameChange = (value: string) => {
    setTimeFrame(value);
    const endDate = new Date();
    let startDate = new Date();
    
    switch (value) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(endDate.getFullYear(), Math.floor(endDate.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      case 'custom':
        // Don't change dates for custom
        return;
    }
    
    setStartDate(startDate);
    setEndDate(endDate);
  };
  
  // Download report as CSV
  const downloadCSV = () => {
    // Prepare CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Category,Description,Amount\n";
    
    filteredTransactions.forEach(transaction => {
      const date = formatDate(transaction.createdAt);
      const amount = (transaction.amount / 100).toFixed(2);
      csvContent += `${date},${transaction.category},${transaction.description},${amount}\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportType}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Reports</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Generate and analyze your financial data
            </p>
          </div>
          
          {/* Report Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Report Type
                  </label>
                  <Select
                    value={reportType}
                    onValueChange={setReportType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income Report</SelectItem>
                      <SelectItem value="expense">Expense Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time Period
                  </label>
                  <Select
                    value={timeFrame}
                    onValueChange={handleTimeFrameChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="quarter">This Quarter</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account
                  </label>
                  <Select
                    value={selectedAccountId || ""}
                    onValueChange={(value) => setSelectedAccountId(value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      {accounts.map(account => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name || account.accountType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {timeFrame === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {format(startDate, "PPP")}
                          <Calendar className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => date && setStartDate(date)}
                          disabled={(date) => date > new Date() || date > endDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {format(endDate, "PPP")}
                          <Calendar className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => date && setEndDate(date)}
                          disabled={(date) => date > new Date() || date < startDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
              
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={downloadCSV}
                  className="ml-2"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export to CSV
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {isLoadingTransactions || isLoadingAccounts ? (
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardContent className="p-6 flex items-center justify-center" style={{ height: "400px" }}>
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="space-y-6">
              {/* Report Header */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">{getReportTitle()}</h2>
                  <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Total {reportType}:</span>
                        <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                          {formatCurrency(totalAmount, user?.currency)}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Number of transactions:</span>
                        <div className="text-xl font-semibold">{filteredTransactions.length}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Charts */}
              <Tabs defaultValue="category" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="category">Category Breakdown</TabsTrigger>
                  <TabsTrigger value="trend">Time Trend</TabsTrigger>
                </TabsList>
                
                <TabsContent value="category">
                  <Card>
                    <CardHeader>
                      <CardTitle>Category Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {categoryData.length > 0 ? (
                        <div className="w-full" style={{ height: "400px" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsArcChart>
                              <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {categoryData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value: number) => formatCurrency(value, user?.currency)} 
                              />
                              <Legend />
                            </RechartsArcChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="text-center p-10">
                          <p>No data available for selected filters</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="trend">
                  <Card>
                    <CardHeader>
                      <CardTitle>Time Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(timeFrame === 'week' ? getDailyData() : getMonthlyData()).length > 0 ? (
                        <div className="w-full" style={{ height: "400px" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={timeFrame === 'week' ? getDailyData() : getMonthlyData()}
                              margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 5,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis tickFormatter={(value) => 
                                formatCurrency(value, user?.currency, false)
                              } />
                              <Tooltip 
                                formatter={(value: number) => formatCurrency(value, user?.currency)} 
                              />
                              <Legend />
                              <Bar 
                                dataKey="amount" 
                                name={reportType === 'income' ? 'Income' : 'Expenses'} 
                                fill={reportType === 'income' ? '#4CAF50' : '#FF5722'} 
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="text-center p-10">
                          <p>No data available for selected filters</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              
              {/* Transactions Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b dark:border-gray-700">
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Description</th>
                          <th className="py-3 px-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((transaction) => (
                          <tr key={transaction.id} className="border-b dark:border-gray-700">
                            <td className="py-3 px-4">{formatDate(transaction.createdAt)}</td>
                            <td className="py-3 px-4">
                              <span className="inline-block px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800">
                                {transaction.category}
                              </span>
                            </td>
                            <td className="py-3 px-4">{transaction.description}</td>
                            <td className="py-3 px-4 text-right font-medium">
                              {formatCurrency(transaction.amount, user?.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No data available
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  There are no {reportType} transactions for the selected time period and account.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}