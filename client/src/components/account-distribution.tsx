import { useQuery } from "@tanstack/react-query";
import { Account } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, CreditCard, PiggyBank, Landmark, Wallet, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

const ACCOUNT_ICONS: Record<string, any> = {
  checking: Landmark,
  savings: PiggyBank,
  credit: CreditCard,
  investment: DollarSign,
  cash: Wallet,
  other: Building,
};

interface AccountDistributionProps {
  currency?: string;
  accountId?: number | null;
}

export function AccountDistribution({ currency = 'USD', accountId = null }: AccountDistributionProps) {
  // Fetch accounts
  const { data: allAccounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });
  
  // Filter accounts if accountId is provided
  const accounts = useMemo(() => {
    if (accountId === null) {
      return allAccounts;
    }
    return allAccounts.filter(account => account.id === accountId);
  }, [allAccounts, accountId]);
  
  // Calculate total balance
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  
  // Group accounts by type
  const accountsByType = useMemo(() => {
    const grouped: Record<string, { total: number, count: number }> = {};
    
    accounts.forEach(account => {
      if (!grouped[account.accountType]) {
        grouped[account.accountType] = { total: 0, count: 0 };
      }
      
      grouped[account.accountType].total += account.balance;
      grouped[account.accountType].count += 1;
    });
    
    return grouped;
  }, [accounts]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center">
                <Skeleton className="h-10 w-10 rounded-full mr-4" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-2 w-full" />
                </div>
                <Skeleton className="h-4 w-16 ml-2" />
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
        <CardTitle>Account Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>No accounts added yet.</p>
            <p className="text-sm mt-2">Add accounts to see your distribution.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(accountsByType).map(([type, data]) => {
              const percentage = totalBalance ? Math.round((data.total / totalBalance) * 100) : 0;
              const Icon = ACCOUNT_ICONS[type] || Building;
              
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mr-2 rounded-full bg-primary/10 p-2">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {type} ({data.count})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatCurrency(data.total, currency)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-primary/10">
                    <div 
                      className="h-2 rounded-full bg-primary" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}