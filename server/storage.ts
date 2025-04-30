import { 
  users, type User, type InsertUser,
  transactions, type Transaction, type InsertTransaction,
  budgets, type Budget, type InsertBudget,
  accounts, type Account, type InsertAccount 
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq } from "drizzle-orm";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, data: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  getTransactionsByUserId(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  
  // Budget methods
  createBudget(budget: InsertBudget): Promise<Budget>;
  getBudgetsByUserId(userId: number): Promise<Budget[]>;
  getAllBudgets(): Promise<Budget[]>;
  updateBudget(id: number, data: Partial<InsertBudget>): Promise<Budget | undefined>;
  deleteBudget(id: number): Promise<boolean>;
  
  // Account methods
  createAccount(account: InsertAccount): Promise<Account>;
  getAccountsByUserId(userId: number): Promise<Account[]>;
  getAllAccounts(): Promise<Account[]>;
  updateAccount(id: number, data: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<boolean>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  private budgets: Map<number, Budget>;
  private accounts: Map<number, Account>;
  sessionStore: session.Store;

  private userIdCounter: number;
  private transactionIdCounter: number;
  private budgetIdCounter: number;
  private accountIdCounter: number;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.budgets = new Map();
    this.accounts = new Map();
    
    this.userIdCounter = 1;
    this.transactionIdCounter = 1;
    this.budgetIdCounter = 1;
    this.accountIdCounter = 1;

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Add super admin for testing
    this.createUser({
      name: "Admin User",
      email: "admin@example.com",
      password: "$2b$10$PuVFZ9gXu1FSSG6sJiMAuOXMJ7jRRVmWJAuAoErm/2BKcvLFlAFi6", // hashed "password123"
      role: "super_admin",
      theme: "light",
      currency: "USD"
    });

    // Add regular user for testing
    this.createUser({
      name: "Regular User",
      email: "user@example.com",
      password: "$2b$10$PuVFZ9gXu1FSSG6sJiMAuOXMJ7jRRVmWJAuAoErm/2BKcvLFlAFi6", // hashed "password123"
      role: "user",
      theme: "light",
      currency: "USD"
    });

    // Add some sample transactions
    this.createTransaction({
      userId: 1,
      amount: 340000, // $3,400.00
      type: "income",
      description: "Salary Deposit",
      category: "Income",
      accountId: null // or 1 if you want to link it to the sample account
    });

    this.createTransaction({
      userId: 1,
      amount: 120000, // $1,200.00
      type: "expense",
      description: "Apartment Rent",
      category: "Housing",
      accountId: null // or 1 if you want to link it to the sample account
    });

    // Add some sample budgets
    this.createBudget({
      userId: 1,
      amount: 100000, // $1,000.00
      category: "Food"
    });

    // Add some sample accounts
    this.createAccount({
      userId: 1,
      accountType: "bank",
      balance: 2000000 // $20,000.00
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    // Ensure all required fields have values
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || "user",
      theme: insertUser.theme || "light",
      currency: insertUser.currency || "USD"
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const updatedUser: User = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Transaction methods
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionIdCounter++;
    const createdAt = new Date();
    
    // Ensure accountId and isRecurring are properly handled
    const transaction: Transaction = { 
      ...insertTransaction, 
      id, 
      createdAt,
      // Convert accountId to number if it's a string
      accountId: insertTransaction.accountId !== undefined ? 
        (typeof insertTransaction.accountId === 'string' ? 
          parseInt(insertTransaction.accountId as string, 10) : 
          insertTransaction.accountId
        ) : null,
      // Ensure isRecurring is never undefined
      isRecurring: insertTransaction.isRecurring === undefined ? false : insertTransaction.isRecurring
    };
    
    this.transactions.set(id, transaction);
    return transaction;
  }

  async updateTransaction(id: number, data: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    
    const updatedTransaction = { ...transaction, ...data };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      (transaction) => transaction.userId === userId
    );
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  // Budget methods
  async createBudget(insertBudget: InsertBudget): Promise<Budget> {
    const id = this.budgetIdCounter++;
    const createdAt = new Date();
    const budget: Budget = { 
      ...insertBudget, 
      id, 
      createdAt,
      description: insertBudget.description || null
    };
    this.budgets.set(id, budget);
    return budget;
  }

  async getBudgetsByUserId(userId: number): Promise<Budget[]> {
    return Array.from(this.budgets.values()).filter(
      (budget) => budget.userId === userId
    );
  }

  async getAllBudgets(): Promise<Budget[]> {
    return Array.from(this.budgets.values());
  }

  async updateBudget(id: number, data: Partial<InsertBudget>): Promise<Budget | undefined> {
    const budget = this.budgets.get(id);
    if (!budget) return undefined;
    
    const updatedBudget = { ...budget, ...data };
    this.budgets.set(id, updatedBudget);
    return updatedBudget;
  }

  async deleteBudget(id: number): Promise<boolean> {
    return this.budgets.delete(id);
  }

  // Account methods
  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const id = this.accountIdCounter++;
    const createdAt = new Date();
    const account: Account = { 
      ...insertAccount, 
      id, 
      createdAt,
      name: insertAccount.name || null,
      description: insertAccount.description || null
    };
    this.accounts.set(id, account);
    return account;
  }

  async getAccountsByUserId(userId: number): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter(
      (account) => account.userId === userId
    );
  }

  async getAllAccounts(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  async updateAccount(id: number, data: Partial<InsertAccount>): Promise<Account | undefined> {
    const account = this.accounts.get(id);
    if (!account) return undefined;
    
    const updatedAccount = { ...account, ...data };
    this.accounts.set(id, updatedAccount);
    return updatedAccount;
  }

  async deleteAccount(id: number): Promise<boolean> {
    return this.accounts.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [insertedUser] = await db.insert(users).values(user).returning();
    return insertedUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return !!result.rowCount;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    // Start a transaction to ensure both operations succeed or fail together
    return await db.transaction(async (tx) => {
      // Insert the transaction and ensure isRecurring is never undefined
      const transactionData = {
        ...transaction,
        isRecurring: transaction.isRecurring === undefined ? false : transaction.isRecurring
      };
      
      const [insertedTransaction] = await tx
        .insert(transactions)
        .values(transactionData)
        .returning();
        
      // Update account balance if an account is specified
      if (transaction.accountId) {
        // First get the current account
        const [account] = await tx
          .select()
          .from(accounts)
          .where(eq(accounts.id, transaction.accountId));
          
        if (account) {
          // Calculate new balance based on transaction type
          const balanceChange = transaction.type === 'expense' ? -transaction.amount : transaction.amount;
          const newBalance = account.balance + balanceChange;
          
          // Update the account balance
          await tx
            .update(accounts)
            .set({ balance: newBalance })
            .where(eq(accounts.id, transaction.accountId));
        }
      }
      
      return insertedTransaction;
    });
  }

  async updateTransaction(id: number, data: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    return await db.transaction(async (tx) => {
      // First get the current transaction
      const [oldTransaction] = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, id));
        
      if (!oldTransaction) {
        return undefined;
      }
      
      // Revert the old transaction's effect on account if it had an accountId
      if (oldTransaction.accountId) {
        const [account] = await tx
          .select()
          .from(accounts)
          .where(eq(accounts.id, oldTransaction.accountId));
          
        if (account) {
          // Revert the old transaction's effect
          const reverseChange = oldTransaction.type === 'expense' 
            ? oldTransaction.amount  // Add the expense amount back (it was subtracted before)
            : -oldTransaction.amount; // Subtract the income amount (it was added before)
            
          await tx
            .update(accounts)
            .set({ balance: account.balance + reverseChange })
            .where(eq(accounts.id, oldTransaction.accountId));
        }
      }
      
      // Update the transaction, ensuring isRecurring is properly handled
      const updatedData = { ...data };
      
      // Handle isRecurring explicitly if it's being updated
      if (updatedData.isRecurring === undefined && 'isRecurring' in updatedData) {
        updatedData.isRecurring = false;
      }
      
      const [updatedTransaction] = await tx
        .update(transactions)
        .set(updatedData)
        .where(eq(transactions.id, id))
        .returning();
        
      // Apply the new transaction's effect on account if needed
      const newAccountId = data.accountId !== undefined ? data.accountId : oldTransaction.accountId;
      const newAmount = data.amount !== undefined ? data.amount : oldTransaction.amount;
      const newType = data.type !== undefined ? data.type : oldTransaction.type;
      
      if (newAccountId) {
        const [account] = await tx
          .select()
          .from(accounts)
          .where(eq(accounts.id, newAccountId));
          
        if (account) {
          // Apply the new transaction's effect
          const newChange = newType === 'expense' ? -newAmount : newAmount;
          
          await tx
            .update(accounts)
            .set({ balance: account.balance + newChange })
            .where(eq(accounts.id, newAccountId));
        }
      }
      
      return updatedTransaction;
    });
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // First get the transaction to revert its effect
      const [transaction] = await tx
        .select()
        .from(transactions)
        .where(eq(transactions.id, id));
        
      if (!transaction) {
        return false;
      }
      
      // Revert the transaction's effect on account if it had an accountId
      if (transaction.accountId) {
        const [account] = await tx
          .select()
          .from(accounts)
          .where(eq(accounts.id, transaction.accountId));
          
        if (account) {
          // Revert the transaction's effect
          const reverseChange = transaction.type === 'expense' 
            ? transaction.amount  // Add the expense amount back (it was subtracted before)
            : -transaction.amount; // Subtract the income amount (it was added before)
            
          await tx
            .update(accounts)
            .set({ balance: account.balance + reverseChange })
            .where(eq(accounts.id, transaction.accountId));
        }
      }
      
      // Delete the transaction
      const result = await tx.delete(transactions).where(eq(transactions.id, id));
      return !!result.rowCount;
    });
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId));
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return db.select().from(transactions);
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const [insertedBudget] = await db
      .insert(budgets)
      .values(budget)
      .returning();
    return insertedBudget;
  }

  async getBudgetsByUserId(userId: number): Promise<Budget[]> {
    return db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId));
  }

  async getAllBudgets(): Promise<Budget[]> {
    return db.select().from(budgets);
  }

  async updateBudget(id: number, data: Partial<InsertBudget>): Promise<Budget | undefined> {
    const [updatedBudget] = await db
      .update(budgets)
      .set(data)
      .where(eq(budgets.id, id))
      .returning();
    return updatedBudget;
  }

  async deleteBudget(id: number): Promise<boolean> {
    const result = await db.delete(budgets).where(eq(budgets.id, id));
    return !!result.rowCount;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    // Ensure name and description are not undefined
    const accountData = {
      ...account,
      name: account.name || null,
      description: account.description || null
    };
    
    const [insertedAccount] = await db
      .insert(accounts)
      .values(accountData)
      .returning();
    return insertedAccount;
  }

  async getAccountsByUserId(userId: number): Promise<Account[]> {
    return db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId));
  }

  async getAllAccounts(): Promise<Account[]> {
    return db.select().from(accounts);
  }

  async updateAccount(id: number, data: Partial<InsertAccount>): Promise<Account | undefined> {
    const [updatedAccount] = await db
      .update(accounts)
      .set(data)
      .where(eq(accounts.id, id))
      .returning();
    return updatedAccount;
  }

  async deleteAccount(id: number): Promise<boolean> {
    const result = await db.delete(accounts).where(eq(accounts.id, id));
    return !!result.rowCount;
  }
}

export const storage = new DatabaseStorage();
