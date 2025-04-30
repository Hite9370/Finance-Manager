import { useQuery } from "@tanstack/react-query";
import { Transaction, Account } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  ChevronRight, 
  Coffee, 
  Home, 
  ShoppingCart, 
  Utensils, 
  Zap, 
  Car, 
  Gift, 
  Monitor, 
  Heart, 
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

// Category icons
const CATEGORY_ICONS: Record<string, any> = {
  food: Utensils,
  groceries: ShoppingCart,
  entertainment: Monitor,
  utilities: Zap,
  housing: Home,
  transportation: Car,
  coffee: Coffee,
  health: Heart,
  gift: Gift,
  income: Briefcase,
};

interface RecentTransactionsProps {
  limit?: number;
  currency?: string;
  transactions?: Transaction[];
}

export function RecentTransactions({ 
  limit = 5, 
  currency = 'USD',
  transactions: providedTransactions 
}: RecentTransactionsProps) {
  const [, navigate] = useLocation();
  
  // Fetch transactions and accounts
  const { data: allTransactions = [], isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });
  
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });
  
  // Use provided transactions if available (filtered from parent), otherwise use all transactions
  const transactions = providedTransactions || allTransactions;
  
  // Get transaction account names
  const getAccountName = (accountId: number | null) => {
    if (!accountId) return "N/A";
    
    const account = accounts.find(acc => acc.id === accountId);
    return account ? (account.name || `${account.accountType} Account`) : "Unknown Account";
  };
  
  // Get most recent transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
  
  // Loading state
  if (isLoadingTransactions || isLoadingAccounts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest financial activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="flex items-center">
                <Skeleton className="h-12 w-12 rounded-full mr-4" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your latest financial activity</CardDescription>
      </CardHeader>
      <CardContent>
        {recentTransactions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>No transactions yet.</p>
            <p className="text-sm mt-2">Add transactions to see your activity here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {recentTransactions.map(transaction => {
              const Icon = transaction.type === 'income' 
                ? ArrowUpRight 
                : ArrowDownRight;
                
              const CategoryIcon = CATEGORY_ICONS[transaction.category.toLowerCase()] || ShoppingCart;
              
              return (
                <div key={transaction.id} className="flex items-center">
                  <div className={`mr-4 rounded-full p-2 ${
                    transaction.type === 'income' 
                      ? 'bg-green-100 dark:bg-green-900' 
                      : 'bg-red-100 dark:bg-red-900'
                  }`}>
                    <CategoryIcon className={`h-6 w-6 ${
                      transaction.type === 'income' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize">
                      {transaction.description}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span>{formatDate(transaction.createdAt)}</span>
                      <span className="mx-1">•</span>
                      <span>{getAccountName(transaction.accountId)}</span>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${
                    transaction.type === 'income' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount, currency)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      {transactions.length > limit && (
        <CardFooter>
          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={() => navigate('/transactions')}
          >
            View all transactions
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}