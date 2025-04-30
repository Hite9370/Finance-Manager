import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Menu, Plus, Loader2, Building, CreditCard, Wallet, 
  ArrowUpRight, ArrowDownRight, PenLine, X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Transaction, Account } from "@shared/schema";

// Account form schema
const accountFormSchema = z.object({
  name: z.string().min(2, "Account name must be at least 2 characters"),
  accountType: z.string().min(1, "Account type is required"),
  balance: z.string().min(1, "Balance is required"),
  description: z.string().optional(),
});

// Define type based on schema
type AccountFormValues = z.infer<typeof accountFormSchema>;

export default function AccountsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editAccountDialogOpen, setEditAccountDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<number | null>(null);
  const [viewAccountId, setViewAccountId] = useState<number | null>(null);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [activeTabType, setActiveTabType] = useState<string>("all");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
    enabled: !!user,
  });
  
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });
  
  // Total balance across all accounts
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  
  // Function to get the account icon based on type
  const getAccountIcon = (type: string) => {
    switch (type) {
      case "bank":
        return <Building className="h-6 w-6" />;
      case "cash":
        return <Wallet className="h-6 w-6" />;
      default:
        return <Building className="h-6 w-6" />;
    }
  };
  
  // Form for adding an account
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: "",
      accountType: "bank",
      balance: "",
      description: "",
    },
  });
  
  // Form for editing an account
  const editForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: accountToEdit?.name || "",
      accountType: accountToEdit?.accountType || "bank",
      balance: accountToEdit ? String(accountToEdit.balance / 100) : "",
      description: accountToEdit?.description || "",
    }
  });
  
  // Mutation for creating an account
  const createAccountMutation = useMutation({
    mutationFn: async (data: AccountFormValues) => {
      if (!user) throw new Error("User not authenticated");
      
      // Convert balance from string to number and multiply by 100 to store in cents
      const payload = {
        ...data,
        balance: parseInt(data.balance) * 100, // Convert to cents
        userId: user.id,
      };
      
      const res = await apiRequest("POST", "/api/accounts", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account added successfully",
      });
      setAccountDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add account",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for updating an account
  const updateAccountMutation = useMutation({
    mutationFn: async (data: { id: number, account: Partial<AccountFormValues> }) => {
      if (!user) throw new Error("User not authenticated");
      
      // Convert balance from string to number if provided
      const payload: any = { ...data.account };
      if (payload.balance) {
        payload.balance = parseInt(payload.balance) * 100; // Convert to cents
      }
      
      const res = await apiRequest("PATCH", `/api/accounts/${data.id}`, payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account updated successfully",
      });
      setEditAccountDialogOpen(false);
      setAccountToEdit(null);
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update account",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for deleting an account
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      const res = await apiRequest("DELETE", `/api/accounts/${accountId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get transactions for a specific account
  const getAccountTransactions = (accountId: number) => {
    return transactions.filter(transaction => transaction.accountId === accountId);
  };
  
  const handleViewTransactions = (accountId: number) => {
    setViewAccountId(accountId);
    setTransactionDialogOpen(true);
  };
  
  const handleManageAccount = (account: Account) => {
    setAccountToEdit(account);
    editForm.reset({
      name: account.name || "",
      accountType: account.accountType,
      balance: String(account.balance / 100), // Convert from cents to dollars for display
      description: account.description || "",
    });
    setEditAccountDialogOpen(true);
  };
  
  const handleDeleteAccount = (accountId: number) => {
    setAccountToDelete(accountId);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (accountToDelete) {
      deleteAccountMutation.mutate(accountToDelete);
    }
  };
  
  const onSubmit = (data: AccountFormValues) => {
    createAccountMutation.mutate(data);
  };
  
  const onEditSubmit = (data: AccountFormValues) => {
    if (accountToEdit) {
      updateAccountMutation.mutate({
        id: accountToEdit.id,
        account: data
      });
    }
  };

  // Filter accounts based on active tab type
  const filteredAccounts = activeTabType === "all" 
    ? accounts 
    : accounts.filter(account => account.accountType === activeTabType);

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
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Accounts</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage your bank, cash, and other accounts
            </p>
          </div>

          {/* Account Summary Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 md:mb-0">Your Accounts</h2>
                
                <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Account</DialogTitle>
                      <DialogDescription>
                        Add a new financial account to track your balances.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="E.g., Primary Checking" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="accountType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Type</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select account type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="bank">Bank</SelectItem>
                                  <SelectItem value="cash">Cash</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="balance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Balance</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter amount" 
                                  type="number" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description (Optional)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Additional details" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter>
                          <Button 
                            type="submit" 
                            disabled={createAccountMutation.isPending}
                          >
                            {createAccountMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              "Add Account"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
              
              {/* Account Type Tabs */}
              <div className="mt-6">
                <div className="inline-flex rounded-md shadow-sm">
                  <Button 
                    variant={activeTabType === "all" ? "default" : "outline"}
                    className={`rounded-l-md ${activeTabType === "all" ? "" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                    onClick={() => setActiveTabType("all")}
                  >
                    All
                  </Button>
                  <Button 
                    variant={activeTabType === "bank" ? "default" : "outline"}
                    className={`-ml-px ${activeTabType === "bank" ? "" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                    onClick={() => setActiveTabType("bank")}
                  >
                    Bank
                  </Button>
                  <Button 
                    variant={activeTabType === "cash" ? "default" : "outline"}
                    className={`-ml-px rounded-r-md ${activeTabType === "cash" ? "" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                    onClick={() => setActiveTabType("cash")}
                  >
                    Cash
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Accounts List */}
            <div className="p-6">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="overflow-hidden shadow border border-gray-100 dark:border-gray-800">
                      <CardContent className="p-0">
                        <div className="p-4">
                          <Skeleton className="h-8 w-32" />
                          <Skeleton className="h-8 w-48 mt-3" />
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                          <Skeleton className="h-5 w-24" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredAccounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {filteredAccounts.map((account) => (
                    <Card key={account.id} className="overflow-hidden shadow border border-gray-100 dark:border-gray-800">
                      <CardContent className="p-0">
                        {/* Account Card Header */}
                        <div className="flex items-center p-4">
                          <div className="w-10 h-10 rounded-md bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                            {account.accountType === 'bank' ? (
                              <Building className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                            ) : (
                              <Wallet className="h-5 w-5 text-green-600 dark:text-green-300" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {account.name || `${account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)} Account`}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {account.accountType === 'bank' ? 'Bank' : 'Cash'} {account.id ? `•••• ${account.id.toString().slice(-4)}` : ''}
                            </p>
                          </div>
                          <div className="ml-auto text-right">
                            <div className="text-xl font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(account.balance , user?.currency)}
                            </div>
                            <div className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 cursor-pointer"
                                onClick={() => handleManageAccount(account)}>
                              •••
                            </div>
                          </div>
                        </div>
                        
                        {/* Account Card Actions */}
                        <div className="border-t border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between">
                          <button 
                            onClick={() => handleViewTransactions(account.id)}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            View Transactions
                          </button>
                          <button 
                            onClick={() => handleManageAccount(account)}
                            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            Edit Account
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No accounts found</h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-2 mb-4">
                    You haven't added any {activeTabType !== "all" ? activeTabType : ""} accounts yet. Add your first account to start tracking your finances.
                  </p>
                  <Button onClick={() => setAccountDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Account
                  </Button>
                </div>
              )}
              
              {/* Total Balance Section */}
              {filteredAccounts.length > 0 && (
                <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="mb-4 sm:mb-0">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Balance</span>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(totalBalance / 100, user?.currency)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* View Account Transactions Dialog */}
          <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>
                    {viewAccountId !== null && accounts.find(a => a.id === viewAccountId)?.name || 'Account'} Transactions
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setTransactionDialogOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              
              {viewAccountId !== null && (
                <div>
                  <div className="mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Current Balance:</span>
                        <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                          {formatCurrency(accounts.find(a => a.id === viewAccountId)?.balance || 0, user?.currency)}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const account = accounts.find(a => a.id === viewAccountId);
                          if (account) handleManageAccount(account);
                        }}
                      >
                        Edit Account
                      </Button>
                    </div>
                  </div>
                  
                  <h3 className="font-medium mb-4">Recent Transactions</h3>
                  
                  {getAccountTransactions(viewAccountId).length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transaction</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                          {getAccountTransactions(viewAccountId).map((transaction) => (
                            <tr key={transaction.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                                    transaction.type === 'expense' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                  }`}>
                                    {transaction.type === 'expense' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {transaction.description}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                  {transaction.category}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {formatDate(transaction.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                <span className={transaction.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                                  {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount / 100, user?.currency)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  Completed
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">No transactions found for this account.</p>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Account Dialog */}
          <Dialog open={editAccountDialogOpen} onOpenChange={setEditAccountDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Account</DialogTitle>
                <DialogDescription>
                  Update your account details below.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="accountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="bank">Bank</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="balance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Balance</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter className="flex justify-between items-center">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => handleDeleteAccount(accountToEdit?.id || 0)}
                      className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
                    >
                      Delete Account
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateAccountMutation.isPending}
                    >
                      {updateAccountMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Delete Account Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}