import { useQuery } from "@tanstack/react-query";
import { Account, Transaction } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, CreditCard, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BalanceSummaryProps {
  currency?: string;
  transactions?: Transaction[];
  filterInfo?: {
    timePeriod: string;
    accountId: number | null;
  };
}

export function BalanceSummary({ 
  currency = 'USD', 
  transactions: providedTransactions,
  filterInfo 
}: BalanceSummaryProps) {
  // Fetch accounts and transactions
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });
  
  const { data: allTransactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });
  
  // Use provided transactions if available (filtered from parent), otherwise use all transactions
  const transactions = providedTransactions || allTransactions;
  
  // Calculate total balance across all accounts (or filter to selected account)
  const totalBalance = accounts.reduce((sum, account) => {
    if (filterInfo?.accountId === null || filterInfo?.accountId === account.id) {
      return sum + account.balance;
    }
    return sum;
  }, 0);
  
  // Calculate recent income and expenses based on time period
  let startDate = new Date();
  
  if (filterInfo?.timePeriod) {
    // Use the time period from filter if provided
    const now = new Date();
    
    switch (filterInfo.timePeriod) {
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
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate.setMonth(now.getMonth() - 1); // Default to month
    }
  } else {
    // Default to last 30 days if no filter provided
    startDate.setDate(startDate.getDate() - 30);
  }
  
  const recentTransactions = transactions.filter(
    transaction => new Date(transaction.createdAt) >= startDate
  );
  
  const totalIncome = recentTransactions
    .filter(transaction => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
    
  const totalExpenses = recentTransactions
    .filter(transaction => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
    
  // Generate the time period label for the income/expense cards
  const getTimePeriodLabel = () => {
    if (!filterInfo?.timePeriod) return "(30 days)";
    
    switch (filterInfo.timePeriod) {
      case "week":
        return "(Last Week)";
      case "month":
        return "(This Month)";
      case "quarter":
        return "(This Quarter)";
      case "year":
        return "(This Year)";
      case "all":
        return "(All Time)";
      default:
        return "(30 days)";
    }
  };
  
  // Loading state
  if (isLoadingAccounts || isLoadingTransactions) {
    return (
      <div>
        {/* Skeleton for prominent balance banner */}
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-600/80 to-blue-800/80 rounded-lg text-white shadow-lg animate-pulse">
          <div className="flex justify-between items-center">
            <div>
              <div className="h-5 w-32 bg-white/30 rounded mb-3"></div>
              <div className="h-10 w-48 bg-white/40 rounded mb-2"></div>
              <div className="h-4 w-32 bg-white/30 rounded"></div>
            </div>
            <div className="bg-white/20 p-4 rounded-full">
              <div className="h-8 w-8 bg-white/40 rounded-full"></div>
            </div>
          </div>
        </div>
      
        {/* Skeleton for income/expense cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-32 bg-green-200 dark:bg-green-700 rounded"></div>
              <div className="bg-green-200 dark:bg-green-800 p-2 rounded-full">
                <div className="h-4 w-4 bg-green-300 dark:bg-green-600 rounded-full"></div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-36 mb-2 bg-green-200 dark:bg-green-700" />
              <Skeleton className="h-4 w-24 bg-green-100 dark:bg-green-800" />
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-32 bg-red-200 dark:bg-red-700 rounded"></div>
              <div className="bg-red-200 dark:bg-red-800 p-2 rounded-full">
                <div className="h-4 w-4 bg-red-300 dark:bg-red-600 rounded-full"></div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-36 mb-2 bg-red-200 dark:bg-red-700" />
              <Skeleton className="h-4 w-24 bg-red-100 dark:bg-red-800" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      {/* Prominent Current Balance Banner */}
      <div className="mb-6 p-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg text-white shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium opacity-90">Current Balance</h3>
            <div className="text-4xl font-bold mt-2">{formatCurrency(totalBalance, currency)}</div>
            <p className="text-sm opacity-80 mt-1">
              Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="bg-white/20 p-4 rounded-full">
            <Wallet className="h-8 w-8" />
          </div>
        </div>
      </div>
      
      {/* Income and Expenses Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-400">
              Income {getTimePeriodLabel()}
            </CardTitle>
            <div className="bg-green-200 dark:bg-green-800 p-2 rounded-full">
              <ArrowUp className="h-4 w-4 text-green-700 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(totalIncome, currency)}</div>
            <p className="text-xs text-green-700/70 dark:text-green-400/70">
              {recentTransactions.filter(t => t.type === 'income').length} transaction{recentTransactions.filter(t => t.type === 'income').length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800 dark:text-red-400">
              Expenses {getTimePeriodLabel()}
            </CardTitle>
            <div className="bg-red-200 dark:bg-red-800 p-2 rounded-full">
              <ArrowDown className="h-4 w-4 text-red-700 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{formatCurrency(totalExpenses, currency)}</div>
            <p className="text-xs text-red-700/70 dark:text-red-400/70">
              {recentTransactions.filter(t => t.type === 'expense').length} transaction{recentTransactions.filter(t => t.type === 'expense').length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}