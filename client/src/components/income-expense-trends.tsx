import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface IncomeTrendsProps {
  currency?: string;
  initialPeriod?: "week" | "month" | "quarter" | "year" | "all";
  transactions?: Transaction[];
  accountId?: number | null;
}

type TimePeriod = "month" | "quarter" | "year";
type ChartData = Array<{
  name: string;
  income: number;
  expense: number;
  net: number;
}>;

export function IncomeExpenseTrends({ 
  currency = "USD", 
  initialPeriod, 
  transactions: providedTransactions,
  accountId = null
}: IncomeTrendsProps) {
  // Initialize timePeriod with initialPeriod if provided, otherwise use "month"
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(
    initialPeriod === "quarter" || initialPeriod === "year" 
      ? initialPeriod 
      : "month"
  );
  
  // Fetch transactions
  const { data: allTransactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });
  
  // Use provided transactions if available (filtered from parent), otherwise use all transactions
  const rawTransactions = providedTransactions || allTransactions;
  
  // Apply account filter if provided
  const transactions = useMemo(() => {
    if (accountId === null) {
      return rawTransactions;
    }
    return rawTransactions.filter(t => t.accountId === accountId);
  }, [rawTransactions, accountId]);
  
  // Get current date for calculating periods
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Process data based on selected time period
  const chartData = useMemo(() => {
    if (!transactions.length) return [];

    if (timePeriod === "month") {
      // Group by days of current month
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const dayData: ChartData = Array.from({ length: daysInMonth }, (_, i) => ({
        name: `${i + 1}`,
        income: 0,
        expense: 0,
        net: 0,
      }));
      
      // Filter for current month transactions
      const monthTransactions = transactions.filter(t => {
        const date = new Date(t.createdAt);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });
      
      // Aggregate by day
      monthTransactions.forEach(t => {
        const day = new Date(t.createdAt).getDate() - 1;
        if (t.type === "income") {
          dayData[day].income += t.amount / 100; // Convert cents to dollars for better visualization
          dayData[day].net += t.amount / 100;
        } else {
          dayData[day].expense += t.amount / 100;
          dayData[day].net -= t.amount / 100;
        }
      });
      
      // Return only days with data to avoid cluttering
      return dayData.filter((day, index) => {
        // Always include first day, every fifth day, and days with transactions
        return index === 0 || index % 5 === 0 || day.income > 0 || day.expense > 0;
      });
    }
    
    if (timePeriod === "quarter") {
      // Group by months of current quarter
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const monthData: ChartData = Array.from({ length: 3 }, (_, i) => {
        const monthIndex = quarterStartMonth + i;
        return {
          name: new Date(currentYear, monthIndex, 1).toLocaleString('default', { month: 'short' }),
          income: 0,
          expense: 0,
          net: 0,
        };
      });
      
      // Filter for current quarter transactions
      const quarterTransactions = transactions.filter(t => {
        const date = new Date(t.createdAt);
        const month = date.getMonth();
        return date.getFullYear() === currentYear && 
               month >= quarterStartMonth && 
               month < quarterStartMonth + 3;
      });
      
      // Aggregate by month
      quarterTransactions.forEach(t => {
        const date = new Date(t.createdAt);
        const monthIndex = date.getMonth() - quarterStartMonth;
        if (monthIndex >= 0 && monthIndex < 3) {
          if (t.type === "income") {
            monthData[monthIndex].income += t.amount / 100;
            monthData[monthIndex].net += t.amount / 100;
          } else {
            monthData[monthIndex].expense += t.amount / 100;
            monthData[monthIndex].net -= t.amount / 100;
          }
        }
      });
      
      return monthData;
    }
    
    if (timePeriod === "year") {
      // Group by months of current year
      const monthData: ChartData = Array.from({ length: 12 }, (_, i) => ({
        name: new Date(currentYear, i, 1).toLocaleString('default', { month: 'short' }),
        income: 0,
        expense: 0,
        net: 0,
      }));
      
      // Filter for current year transactions
      const yearTransactions = transactions.filter(t => {
        return new Date(t.createdAt).getFullYear() === currentYear;
      });
      
      // Aggregate by month
      yearTransactions.forEach(t => {
        const month = new Date(t.createdAt).getMonth();
        if (t.type === "income") {
          monthData[month].income += t.amount / 100;
          monthData[month].net += t.amount / 100;
        } else {
          monthData[month].expense += t.amount / 100;
          monthData[month].net -= t.amount / 100;
        }
      });
      
      return monthData;
    }
    
    return [];
  }, [transactions, timePeriod, currentMonth, currentYear]);
  
  // Calculate totals for the period
  const totals = useMemo(() => {
    if (!chartData.length) {
      return { income: 0, expense: 0, net: 0 };
    }
    
    return chartData.reduce(
      (acc, item) => ({
        income: acc.income + item.income,
        expense: acc.expense + item.expense,
        net: acc.net + item.net,
      }),
      { income: 0, expense: 0, net: 0 }
    );
  }, [chartData]);
  
  const formatTooltipValue = (value: number) => {
    return formatCurrency(value * 100, currency);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Income vs Expense Trends</CardTitle>
          <Skeleton className="h-8 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Income vs Expense Trends</CardTitle>
        </div>
        <Tabs value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
          <TabsList className="grid w-full grid-cols-3 max-w-[300px]">
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="quarter">Quarter</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="px-4 py-2 bg-green-50 dark:bg-green-900/30 rounded-md">
            <p className="text-xs text-green-700 dark:text-green-400">Income</p>
            <p className="text-lg font-semibold text-green-700 dark:text-green-400">
              {formatCurrency(totals.income * 100, currency)}
            </p>
          </div>
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 rounded-md">
            <p className="text-xs text-red-700 dark:text-red-400">Expenses</p>
            <p className="text-lg font-semibold text-red-700 dark:text-red-400">
              {formatCurrency(totals.expense * 100, currency)}
            </p>
          </div>
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-md">
            <p className="text-xs text-blue-700 dark:text-blue-400">Net</p>
            <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
              {formatCurrency(totals.net * 100, currency)}
            </p>
          </div>
        </div>
        
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p>No transaction data available for this period</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={formatTooltipValue}
                  contentStyle={{ 
                    backgroundColor: 'var(--background)', 
                    borderColor: 'var(--border)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone"
                  dataKey="income" 
                  name="Income" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone"
                  dataKey="expense" 
                  name="Expense" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone"
                  dataKey="net" 
                  name="Net" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}