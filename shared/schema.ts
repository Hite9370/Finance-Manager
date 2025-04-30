import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["super_admin", "user"] }).notNull().default("user"),
  theme: text("theme", { enum: ["light", "dark"] }).notNull().default("light"),
  currency: text("currency", { enum: ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"] }).notNull().default("USD"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(), // Storing in cents/smallest unit to avoid floating point issues
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  accountId: integer("account_id"),
  isRecurring: boolean("is_recurring").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(), // Storing in cents/smallest unit
  category: text("category").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  accountType: text("account_type", { enum: ["bank", "cash"] }).notNull(),
  name: text("name"),
  description: text("description"),
  balance: integer("balance").notNull(), // Storing in cents/smallest unit
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
  })
  .transform((data) => ({
    ...data,
    role: data.role || "user",
    theme: data.theme || "light",
    currency: data.currency || "USD"
  }));

export const insertTransactionSchema = createInsertSchema(transactions)
  .omit({
    id: true,
    createdAt: true,
  })
  .superRefine((data, ctx) => {
    // Process accountId to ensure it's a number or null
    if (data.accountId !== undefined && data.accountId !== null) {
      if (typeof data.accountId === 'string') {
        const parsed = parseInt(data.accountId, 10);
        if (isNaN(parsed)) {
          ctx.addIssue({
            code: "invalid_type",
            expected: "number",
            received: "string",
            path: ["accountId"],
            message: "accountId must be a valid number"
          });
          return;
        }
        data.accountId = parsed;
      }
    } else {
      data.accountId = null;
    }
  });

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Account = typeof accounts.$inferSelect;
