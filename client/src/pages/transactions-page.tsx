import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Menu, Plus, Loader2, ArrowUpCircle, ArrowDownCircle, Search, Download, CalendarIcon } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Transaction, Account } from "@shared/schema";

// Transaction form schema
const transactionFormSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  type: z.enum(["income", "expense"], {
    required_error: "Transaction type is required",
  }),
  description: z.string().min(2, "Description must be at least 2 characters"),
  category: z.string().min(1, "Category is required"),
  accountId: z.string().min(1, "Account is required"),
  date: z.date().optional().default(() => new Date()),
  isRecurring: z.boolean().optional().default(false),
});

// Define the type based on the schema
type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export default function TransactionsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<"all" | "income" | "expense">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });
  
  // Fetch accounts for the dropdown
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
    enabled: !!user,
  });
  
  // State for managing edit transaction
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Form for adding a transaction
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      amount: "",
      type: "expense",
      description: "",
      category: "",
      accountId: "",
      date: new Date(),
      isRecurring: false,
    },
  });
  
  // Mutation for creating a transaction
  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormValues) => {
      if (!user) throw new Error("User not authenticated");
      
      // Convert amount from string to number and multiply by 100 to store in cents
      const payload = {
        ...data,
        amount: parseInt(data.amount) * 100, // Convert to cents
        userId: user.id,
      };
      
      const res = await apiRequest("POST", "/api/transactions", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
      setTransactionDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add transaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for updating a transaction
  const updateTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormValues & { id: number }) => {
      if (!user) throw new Error("User not authenticated");
      
      const { id, ...updateData } = data;
      
      // Convert amount from string to number and multiply by 100 to store in cents
      const payload = {
        ...updateData,
        amount: parseInt(updateData.amount) * 100, // Convert to cents
        userId: user.id,
      };
      
      const res = await apiRequest("PATCH", `/api/transactions/${id}`, payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
      setTransactionDialogOpen(false);
      setEditingTransaction(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update transaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for deleting a transaction
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!user) throw new Error("User not authenticated");
      
      const res = await apiRequest("DELETE", `/api/transactions/${id}`);
      return res.ok;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete transaction",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Function to handle opening the dialog for editing
  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    form.reset({
      amount: (transaction.amount / 100).toString(), // Convert from cents
      type: transaction.type as any,
      description: transaction.description,
      category: transaction.category,
      accountId: transaction.accountId?.toString() || '',
      date: new Date(transaction.createdAt),
      isRecurring: transaction.isRecurring || false,
    });
    setTransactionDialogOpen(true);
  };
  
  // Function to handle deleting a transaction
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      deleteTransactionMutation.mutate(id);
    }
  };
  
  const onSubmit = (data: TransactionFormValues) => {
    if (editingTransaction) {
      updateTransactionMutation.mutate({
        ...data,
        id: editingTransaction.id,
      });
    } else {
      createTransactionMutation.mutate(data);
    }
  };

  // Filter transactions based on selected type
  const filteredTransactions = transactions.filter(transaction => {
    if (selectedType !== "all" && transaction.type !== selectedType) {
      return false;
    }
    
    if (searchQuery && !transaction.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Get account name by id
  const getAccountName = (accountId: number | null) => {
    if (!accountId) return "Unknown";
    const account = accounts.find(acc => acc.id === accountId);
    return account ? (account.name || account.accountType) : "Unknown";
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
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage and track all your income and expenses
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
            <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Transactions</h2>
              
              <div className="mt-4 sm:mt-0 flex space-x-2">
                <Button variant="outline" className="text-primary-600 dark:text-primary-400">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Transaction
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTransaction ? "Edit Transaction" : "Add New Transaction"}</DialogTitle>
                      <DialogDescription>
                        {editingTransaction 
                          ? "Update an existing transaction." 
                          : "Add a new income or expense to track your finances."}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Transaction Type</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={field.value === "expense" ? "default" : "outline"}
                                    className={cn(
                                      "flex-1 flex items-center gap-2",
                                      field.value === "expense" && "bg-red-600 hover:bg-red-500",
                                      "transition-colors"
                                    )}
                                    onClick={() => field.onChange("expense")}
                                  >
                                    <ArrowDownCircle className="h-4 w-4" />
                                    Expense
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={field.value === "income" ? "default" : "outline"}
                                    className={cn(
                                      "flex-1 flex items-center gap-2",
                                      field.value === "income" && "bg-green-600 hover:bg-green-500",
                                      "transition-colors"
                                    )}
                                    onClick={() => field.onChange("income")}
                                  >
                                    <ArrowUpCircle className="h-4 w-4" />
                                    Income
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount</FormLabel>
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
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter description" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="salary">Salary</SelectItem>
                                  <SelectItem value="food">Food</SelectItem>
                                  <SelectItem value="transport">Transport</SelectItem>
                                  <SelectItem value="entertainment">Entertainment</SelectItem>
                                  <SelectItem value="utilities">Utilities</SelectItem>
                                  <SelectItem value="rent">Rent</SelectItem>
                                  <SelectItem value="shopping">Shopping</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="accountId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select account" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {accounts.map((account) => (
                                    <SelectItem key={account.id} value={account.id.toString()}>
                                      {account.name || account.accountType} ({formatCurrency(account.balance, user?.currency)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className="w-full pl-3 text-left font-normal"
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                      date > new Date() || date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="isRecurring"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Make this a recurring transaction</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter>
                          <Button 
                            type="submit" 
                            disabled={createTransactionMutation.isPending || updateTransactionMutation.isPending}
                          >
                            {editingTransaction ? (
                              updateTransactionMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                "Update Transaction"
                              )
                            ) : (
                              createTransactionMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Adding...
                                </>
                              ) : (
                                "Add Transaction"
                              )
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {/* Filters */}
            <div className="p-4 flex flex-col md:flex-row gap-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  className="pl-10"
                  placeholder="Search transactions..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant={selectedType === "all" ? "default" : "outline"}
                  onClick={() => setSelectedType("all")}
                  className="flex-1 md:flex-none"
                >
                  All
                </Button>
                <Button 
                  variant={selectedType === "income" ? "default" : "outline"}
                  onClick={() => setSelectedType("income")}
                  className={cn(
                    "flex-1 md:flex-none",
                    selectedType === "income" && "bg-green-600 hover:bg-green-500"
                  )}
                >
                  Income
                </Button>
                <Button 
                  variant={selectedType === "expense" ? "default" : "outline"}
                  onClick={() => setSelectedType("expense")}
                  className={cn(
                    "flex-1 md:flex-none",
                    selectedType === "expense" && "bg-red-600 hover:bg-red-500"
                  )}
                >
                  Expenses
                </Button>
              </div>
            </div>
            
            {/* Transaction List */}
            {isLoading ? (
              <div className="p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="py-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTransactions.length > 0 ? (
              <div className="p-4">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr className="text-left">
                      <th className="py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transaction</th>
                      <th className="py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                      <th className="py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Amount</th>
                      <th className="py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full mr-3 flex items-center justify-center ${
                              transaction.type === "expense" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                            }`}>
                              {transaction.type === "expense" ? (
                                <ArrowDownCircle className="h-4 w-4" />
                              ) : (
                                <ArrowUpCircle className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {transaction.description}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {getAccountName(transaction.accountId)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            {transaction.category}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(transaction.createdAt)}
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-right">
                          <span className={
                            transaction.type === "expense" 
                              ? "text-red-600 dark:text-red-400" 
                              : "text-green-600 dark:text-green-400"
                          }>
                            {transaction.type === "expense" ? "−" : "+"}{formatCurrency(transaction.amount, user?.currency)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Completed
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEdit(transaction)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(transaction.id)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No transactions found</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  {searchQuery ? 
                    "No transactions match your search criteria. Try adjusting your filters." :
                    "You haven't added any transactions yet. Click the 'Add Transaction' button to get started."
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}