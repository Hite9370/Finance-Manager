import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { formatCurrency } from "@/lib/utils";
import { Menu, Home, Building, Car, Tv, Lightbulb, Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Budget } from "@shared/schema";
import { cn } from "@/lib/utils";

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

// Budget form schema
const budgetFormSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().optional(),
});

// Define type based on schema
type BudgetFormValues = z.infer<typeof budgetFormSchema>;

// Get the category icon
const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'housing':
      return <Home className="h-6 w-6 text-blue-500" />;
    case 'food':
      return <div className="h-6 w-6 flex items-center justify-center text-amber-500">🍔</div>;
    case 'transportation':
      return <Car className="h-6 w-6 text-rose-500" />;
    case 'entertainment':
      return <Tv className="h-6 w-6 text-purple-500" />;
    case 'utilities':
      return <Lightbulb className="h-6 w-6 text-pink-500" />;
    default:
      return <Home className="h-6 w-6 text-gray-500" />;
  }
};

// Format a month name
const formatMonth = (monthNumber: number) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber];
};

export default function BudgetsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [editBudgetDialogOpen, setEditBudgetDialogOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(formatMonth(currentMonth));
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  const { data: budgets = [], isLoading: isLoadingBudgets } = useQuery<Budget[]>({
    queryKey: ["/api/budgets"],
    enabled: !!user,
  });
  
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });
  
  // Form for adding a budget
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      category: "",
      amount: "",
      description: "",
    },
  });
  
  // Mutation for creating a budget
  const createBudgetMutation = useMutation({
    mutationFn: async (data: BudgetFormValues) => {
      if (!user) throw new Error("User not authenticated");
      
      // Convert amount from string to number and multiply by 100 to store in cents
      const payload = {
        ...data,
        amount: parseInt(data.amount) * 100, // Convert to cents
        userId: user.id,
      };
      
      const res = await apiRequest("POST", "/api/budgets", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Budget added successfully",
      });
      setBudgetDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add budget",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Edit form
  const editForm = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      category: budgetToEdit?.category || "",
      amount: budgetToEdit ? String(budgetToEdit.amount / 100) : "",
      description: budgetToEdit?.description || "",
    },
  });

  // Mutation for updating a budget
  const updateBudgetMutation = useMutation({
    mutationFn: async (data: { id: number, budget: Partial<BudgetFormValues> }) => {
      if (!user) throw new Error("User not authenticated");
      
      // Convert amount from string to number if provided
      const payload: any = { ...data.budget };
      if (payload.amount) {
        payload.amount = parseInt(payload.amount) * 100; // Convert to cents
      }
      
      const res = await apiRequest("PATCH", `/api/budgets/${data.id}`, payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Budget updated successfully",
      });
      setEditBudgetDialogOpen(false);
      setBudgetToEdit(null);
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update budget",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a budget
  const deleteBudgetMutation = useMutation({
    mutationFn: async (budgetId: number) => {
      const res = await apiRequest("DELETE", `/api/budgets/${budgetId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Budget deleted successfully",
      });
      setDeleteConfirmOpen(false);
      setBudgetToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete budget",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BudgetFormValues) => {
    createBudgetMutation.mutate(data);
  };

  const onEditSubmit = (data: BudgetFormValues) => {
    if (budgetToEdit) {
      updateBudgetMutation.mutate({
        id: budgetToEdit.id,
        budget: data
      });
    }
  };

  const handleEditBudget = (budget: Budget) => {
    setBudgetToEdit(budget);
    editForm.reset({
      category: budget.category,
      amount: String(budget.amount / 100), // Convert from cents to dollars for display
      description: budget.description || "",
    });
    setEditBudgetDialogOpen(true);
  };

  const handleDeleteBudget = (budgetId: number) => {
    setBudgetToDelete(budgetId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (budgetToDelete) {
      deleteBudgetMutation.mutate(budgetToDelete);
    }
  };

  // Helper to calculate spending by category for the current month
  const getSpendingByCategory = (category: string) => {
    if (!transactions) return 0;
    
    // Filter transactions for the current month
    return transactions
      .filter(t => {
        const transactionDate = new Date(t.createdAt);
        return (
          t.type === "expense" &&
          t.category.toLowerCase() === category.toLowerCase() &&
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Helper to calculate progress percentage
  const getProgressPercentage = (budgetAmount: number, spentAmount: number) => {
    return Math.min(Math.round((spentAmount / budgetAmount) * 100), 100);
  };

  // Calculate total budget and total spent across all categories
  const totalBudget = useMemo(() => {
    return budgets.reduce((total, budget) => total + budget.amount, 0);
  }, [budgets]);
  
  const totalSpent = useMemo(() => {
    return budgets.reduce((total, budget) => total + getSpendingByCategory(budget.category), 0);
  }, [budgets, transactions]);
  
  const overallProgressPercentage = useMemo(() => {
    return totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;
  }, [totalBudget, totalSpent]);

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
          {/* Header Section */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Planning</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Set spending limits and track your budget
            </p>
          </div>
          
          {/* Monthly Budget Section */}
          <div className="mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Monthly Budget</h2>
              <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                <Select defaultValue={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(12)].map((_, i) => (
                      <SelectItem key={i} value={formatMonth(i)}>{formatMonth(i)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select defaultValue={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button onClick={() => setBudgetDialogOpen(true)} className="ml-2">
                  Add Budget
                </Button>
              </div>
            </div>
            
            {/* Progress Bar */}
            {!isLoadingBudgets && !isLoadingTransactions && budgets.length > 0 && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">Overall Budget Progress</h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Spent: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(totalSpent, user?.currency)}</span> | 
                    Budget: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(totalBudget, user?.currency)}</span>
                  </div>
                </div>
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                  <div 
                    className={`h-full ${overallProgressPercentage >= 100 ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${overallProgressPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {/* Loading State */}
            {(isLoadingBudgets || isLoadingTransactions) && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="shadow-md">
                    <CardContent className="p-0">
                      <div className="p-6">
                        <div className="flex items-center mb-4">
                          <Skeleton className="h-6 w-6 rounded-full mr-3" />
                          <Skeleton className="h-5 w-1/3" />
                        </div>
                        <Skeleton className="h-5 w-2/3 mb-2" />
                        <Skeleton className="h-4 w-full rounded-full mt-4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Empty State */}
            {!isLoadingBudgets && !isLoadingTransactions && budgets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mt-4">
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                  <Building className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Budget Categories</h3>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                  You haven't set up any budget categories yet. Create one to start tracking your spending.
                </p>
                <Button 
                  onClick={() => setBudgetDialogOpen(true)}
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" /> Create Budget
                </Button>
              </div>
            )}
            
            {/* Budget Cards */}
            {!isLoadingBudgets && !isLoadingTransactions && budgets.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {budgets.map(budget => {
                  const spentAmount = getSpendingByCategory(budget.category);
                  const progress = getProgressPercentage(budget.amount, spentAmount);
                  const isOverBudget = spentAmount > budget.amount;
                  
                  return (
                    <Card key={budget.id} className="shadow-md overflow-hidden">
                      <CardContent className="p-0">
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <div className="mr-3">
                                {getCategoryIcon(budget.category)}
                              </div>
                              <h3 className="font-medium text-gray-900 dark:text-white capitalize">
                                {budget.category}
                              </h3>
                            </div>
                            <div className="flex space-x-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEditBudget(budget)}
                                className="h-8 w-8 text-gray-500 hover:text-blue-500"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteBudget(budget.id)}
                                className="h-8 w-8 text-gray-500 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {budget.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                              {budget.description}
                            </p>
                          )}
                          
                          <div className="flex justify-between mb-2 text-sm">
                            <span className="text-gray-500 dark:text-gray-400">
                              Spent: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(spentAmount, user?.currency)}</span>
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              Budget: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(budget.amount, user?.currency)}</span>
                            </span>
                          </div>
                          
                          <div className={`h-2 w-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700`}>
                            <div 
                              className={`h-full ${isOverBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Add Budget Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Budget</DialogTitle>
            <DialogDescription>
              Create a new budget category to track your spending.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="housing">Housing</SelectItem>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="transportation">Transportation</SelectItem>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ({user?.currency || 'USD'})</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00" {...field} />
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
                      <Input placeholder="Monthly budget for..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={createBudgetMutation.isPending}>
                  {createBudgetMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Budget"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Budget Dialog */}
      <Dialog open={editBudgetDialogOpen} onOpenChange={setEditBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>
              Update your budget category settings.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
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
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="housing">Housing</SelectItem>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="transportation">Transportation</SelectItem>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ({user?.currency || 'USD'})</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00" {...field} />
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
                      <Input placeholder="Monthly budget for..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" disabled={updateBudgetMutation.isPending}>
                  {updateBudgetMutation.isPending ? (
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

      {/* Delete Budget Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your budget and remove it from our servers.
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
  );
}