import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertTransactionSchema, insertBudgetSchema, insertAccountSchema } from "@shared/schema";
import { z } from "zod";

// Authorization middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  if (req.user && req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Forbidden: Requires super admin role" });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up auth routes (/api/register, /api/login, /api/logout, /api/user)
  setupAuth(app);
  
  // User management routes (Super Admin only)
  // Get all users
  app.get("/api/users", requireSuperAdmin, async (req, res) => {
    try {
      console.log("Fetching all users");
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...rest }) => rest);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  // Create a new user (Admin only)
  app.post("/api/users", requireSuperAdmin, async (req, res) => {
    try {
      console.log("Creating user:", req.body);
      
      // Check if user with the same email already exists
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash the password
      const { hashPassword } = await import('./auth');
      const userData = {
        ...req.body,
        password: await hashPassword(req.body.password),
        // Set defaults if not provided
        role: req.body.role || "user",
        theme: req.body.theme || "light",
        currency: req.body.currency || "USD"
      };
      
      const newUser = await storage.createUser(userData);
      const { password, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  // Get a specific user
  app.get("/api/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      console.log(`Fetching user with ID: ${userId}`);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Update a user - Super Admin API (no auth check in the route)
  app.put("/api/admin/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      console.log(`Admin updating user with ID: ${userId}`, req.body);
      
      // Handle password updates separately to hash them
      let userData = { ...req.body };
      if (userData.password) {
        const { hashPassword } = await import('./auth');
        userData.password = await hashPassword(userData.password);
      }
      
      const updatedUser = await storage.updateUser(userId, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  // Delete a user - Super Admin API (no auth check in the route)
  app.delete("/api/admin/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      console.log(`Admin attempting to delete user with ID: ${userId}`);
      
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  
  // Delete a user - Regular API with auth check
  app.delete("/api/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      console.log(`Attempting to delete user with ID: ${userId}`);
      
      // Don't allow deleting your own account
      if (userId === req.user!.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  
  // Update user profile
  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      console.log(`Updating user with ID: ${userId}, data:`, req.body);
      
      // Regular users can only update their own profile
      if (req.user!.role !== "super_admin" && userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
      }
      
      // Don't allow changing the role unless you're a super admin
      if (req.body.role && req.user!.role !== "super_admin") {
        delete req.body.role;
      }
      
      // Handle password updates separately to hash them
      let userData = { ...req.body };
      if (userData.password) {
        const { hashPassword } = await import('./auth');
        userData.password = await hashPassword(userData.password);
      }
      
      const updatedUser = await storage.updateUser(userId, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  // Transactions routes
  app.post("/api/transactions", requireAuth, async (req, res) => {
    try {
      // Debug logging
      console.log("Transaction request body:", JSON.stringify(req.body));
      
      // Ensure accountId is converted to number if it's a string
      if (req.body.accountId && typeof req.body.accountId === 'string') {
        req.body.accountId = parseInt(req.body.accountId, 10);
      }
      
      const validatedData = insertTransactionSchema.parse(req.body);
      console.log("Validated transaction data:", JSON.stringify(validatedData));
      
      // Regular users can only create transactions for themselves
      if (req.user!.role !== "super_admin" && validatedData.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden: You can only create transactions for your own account" });
      }
      
      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Transaction creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });
  
  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      let transactions;
      
      // Super admins can see all transactions, regular users only see their own
      if (req.user!.role === "super_admin") {
        transactions = await storage.getAllTransactions();
      } else {
        transactions = await storage.getTransactionsByUserId(req.user!.id);
      }
      
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });
  
  // Add update transaction endpoint
  app.patch("/api/transactions/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Pre-process accountId if it's a string
      if (req.body.accountId && typeof req.body.accountId === 'string') {
        req.body.accountId = parseInt(req.body.accountId, 10);
      }
      
      // First get the transaction to check ownership
      const transactions = await storage.getTransactionsByUserId(req.user!.id);
      const transaction = transactions.find(t => t.id === id);
      
      // Check if transaction exists and belongs to user (or user is admin)
      if (!transaction && req.user!.role !== "super_admin") {
        return res.status(404).json({ message: "Transaction not found or access denied" });
      }
      
      // Update the transaction
      const updatedTransaction = await storage.updateTransaction(id, req.body);
      if (!updatedTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json(updatedTransaction);
    } catch (error) {
      console.error("Transaction update error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });
  
  // Add delete transaction endpoint
  app.delete("/api/transactions/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // First get the transaction to check ownership
      const transactions = await storage.getTransactionsByUserId(req.user!.id);
      const transaction = transactions.find(t => t.id === id);
      
      // Check if transaction exists and belongs to user (or user is admin)
      if (!transaction && req.user!.role !== "super_admin") {
        return res.status(404).json({ message: "Transaction not found or access denied" });
      }
      
      const success = await storage.deleteTransaction(id);
      if (!success) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json({ message: "Transaction deleted successfully" });
    } catch (error) {
      console.error("Transaction delete error:", error);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });
  
  // Budgets routes
  app.post("/api/budgets", requireAuth, async (req, res) => {
    try {
      console.log("Creating budget, request body:", JSON.stringify(req.body));
      
      // Ensure description is properly handled
      if (req.body.description === "") {
        req.body.description = null;
      }
      
      const validatedData = insertBudgetSchema.parse(req.body);
      console.log("Validated budget data:", JSON.stringify(validatedData));
      
      // Regular users can only create budgets for themselves
      if (req.user!.role !== "super_admin" && validatedData.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden: You can only create budgets for your own account" });
      }
      
      const budget = await storage.createBudget(validatedData);
      console.log("Budget created successfully:", JSON.stringify(budget));
      res.status(201).json(budget);
    } catch (error) {
      console.error("Budget creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create budget" });
    }
  });
  
  app.get("/api/budgets", requireAuth, async (req, res) => {
    try {
      console.log("Fetching budgets for user:", req.user?.id);
      let budgets;
      
      // Super admins can see all budgets, regular users only see their own
      if (req.user!.role === "super_admin") {
        budgets = await storage.getAllBudgets();
      } else {
        budgets = await storage.getBudgetsByUserId(req.user!.id);
      }
      
      console.log("Fetched budgets:", JSON.stringify(budgets));
      res.json(budgets);
    } catch (error) {
      console.error("Budget fetch error:", error);
      res.status(500).json({ message: "Failed to fetch budgets" });
    }
  });

  // Update budget
  app.patch("/api/budgets/:id", requireAuth, async (req, res) => {
    try {
      console.log("Updating budget, ID:", req.params.id, "Request body:", JSON.stringify(req.body));
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      // Ensure description is properly handled
      if (req.body.description === "") {
        req.body.description = null;
      }

      // Get the budget to check ownership
      const budgets = req.user!.role === "super_admin" 
        ? await storage.getAllBudgets() 
        : await storage.getBudgetsByUserId(req.user!.id);
      
      const budget = budgets.find(b => b.id === id);
      
      if (!budget) {
        return res.status(404).json({ message: "Budget not found or access denied" });
      }
      
      // Update the budget
      const updatedBudget = await storage.updateBudget(id, req.body);
      if (!updatedBudget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      console.log("Budget updated successfully:", JSON.stringify(updatedBudget));
      res.json(updatedBudget);
    } catch (error) {
      console.error("Budget update error:", error);
      res.status(500).json({ message: "Failed to update budget" });
    }
  });

  // Delete budget
  app.delete("/api/budgets/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      // Get the budget to check ownership
      const budgets = req.user!.role === "super_admin" 
        ? await storage.getAllBudgets() 
        : await storage.getBudgetsByUserId(req.user!.id);
      
      const budget = budgets.find(b => b.id === id);
      
      if (!budget) {
        return res.status(404).json({ message: "Budget not found or access denied" });
      }
      
      const success = await storage.deleteBudget(id);
      if (!success) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      res.json({ message: "Budget deleted successfully" });
    } catch (error) {
      console.error("Budget delete error:", error);
      res.status(500).json({ message: "Failed to delete budget" });
    }
  });
  
  // Accounts routes
  app.post("/api/accounts", requireAuth, async (req, res) => {
    try {
      const validatedData = insertAccountSchema.parse(req.body);
      
      // Regular users can only create accounts for themselves
      if (req.user!.role !== "super_admin" && validatedData.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden: You can only create accounts for your own account" });
      }
      
      const account = await storage.createAccount(validatedData);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create account" });
    }
  });
  
  app.get("/api/accounts", requireAuth, async (req, res) => {
    try {
      let accounts;
      
      // Super admins can see all accounts, regular users only see their own
      if (req.user!.role === "super_admin") {
        accounts = await storage.getAllAccounts();
      } else {
        accounts = await storage.getAccountsByUserId(req.user!.id);
      }
      
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  // Update account
  app.patch("/api/accounts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      // Get the account to check ownership
      const accounts = req.user!.role === "super_admin" 
        ? await storage.getAllAccounts() 
        : await storage.getAccountsByUserId(req.user!.id);
      
      const account = accounts.find(a => a.id === id);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found or access denied" });
      }
      
      // Update the account
      const updatedAccount = await storage.updateAccount(id, req.body);
      if (!updatedAccount) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      res.json(updatedAccount);
    } catch (error) {
      console.error("Account update error:", error);
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  // Delete account
  app.delete("/api/accounts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      // Get the account to check ownership
      const accounts = req.user!.role === "super_admin" 
        ? await storage.getAllAccounts() 
        : await storage.getAccountsByUserId(req.user!.id);
      
      const account = accounts.find(a => a.id === id);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found or access denied" });
      }
      
      const success = await storage.deleteAccount(id);
      if (!success) {
        return res.status(404).json({ message: "Account not found" });
      }
      
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Account delete error:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
