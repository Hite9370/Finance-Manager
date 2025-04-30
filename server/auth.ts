import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { compare, hash } from "bcrypt";
import { storage } from "./storage";
import { type User, insertUserSchema } from "@shared/schema";
import { z } from "zod";

declare global {
  namespace Express {
    // Use type alias instead of extending to avoid circular reference
    interface User {
      id: number;
      name: string;
      email: string;
      password: string;
      role: "super_admin" | "user";
      theme: "light" | "dark";
      currency: "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD";
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 10);
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return await compare(supplied, stored);
}

export function setupAuth(app: Express) {
  // Session setup
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "super-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      secure: process.env.NODE_ENV === "production"
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          console.log(`Attempting login for email: ${email}`);
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            console.log(`No user found with email: ${email}`);
            return done(null, false, { message: "Incorrect email or password" });
          }
          
          console.log(`User found: ${JSON.stringify({...user, password: "[REDACTED]"})}`);
          
          const isValidPassword = await comparePasswords(password, user.password);
          console.log(`Password validation result: ${isValidPassword}`);
          
          if (!isValidPassword) {
            return done(null, false, { message: "Incorrect email or password" });
          }

          return done(null, user);
        } catch (error) {
          console.error('Login error:', error);
          return done(error);
        }
      }
    )
  );

  // Serialize and deserialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication routes
  app.post("/api/register", async (req, res) => {
    try {
      // Validate the request body
      const validatedData = insertUserSchema.parse(req.body);
      
      console.log("Register request data:", { ...validatedData, password: "[REDACTED]" });
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash the password
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Create the user with default values if not provided
      const newUser = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
        role: validatedData.role || "user",
        theme: validatedData.theme || "light",
        currency: validatedData.currency || "USD"
      });

      console.log("New user created:", { ...newUser, password: "[REDACTED]" });

      // Remove password from response
      const { password, ...userWithoutPassword } = newUser;
      
      // Log the user in
      req.login(newUser, (err) => {
        if (err) {
          console.error("Error logging in after registration:", err);
          return res.status(500).json({ message: "Error logging in after registration" });
        }
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: User, info: { message: string }) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as User;
    res.json(userWithoutPassword);
  });
}
