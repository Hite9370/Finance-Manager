import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function ThemeToggle() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [theme, setTheme] = useState<"light" | "dark">(
    user?.theme as "light" | "dark" || "light"
  );

  useEffect(() => {
    // Update preference in localstorage
    localStorage.setItem("theme", theme);
    
    // Update on document
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    // Sync with user preference when user data loads
    if (user?.theme) {
      setTheme(user.theme as "light" | "dark");
    }
  }, [user?.theme]);

  const toggleTheme = async () => {
    if (!user) return;
    
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    
    try {
      const res = await apiRequest("PATCH", `/api/users/${user.id}`, {
        theme: newTheme
      });
      
      const updatedUser = await res.json();
      queryClient.setQueryData(["/api/user"], updatedUser);
    } catch (error) {
      // Revert if there was an error
      setTheme(theme);
      toast({
        title: "Failed to update theme preference",
        variant: "destructive",
      });
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
    >
      {theme === "light" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
