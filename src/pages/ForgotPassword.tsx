import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { sendPasswordResetEmail, fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Sun, Moon, Mail, CheckCircle } from "lucide-react";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { previousAccounts } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const trimmedEmail = email.trim().toLowerCase();

    // Check if this email exists in previous accounts (Google users)
    const matchedAccount = previousAccounts.find(acc => acc.email?.toLowerCase() === trimmedEmail);
    console.log("Matched account from previousAccounts:", matchedAccount);

    if (matchedAccount) {
      // This email exists but was registered via Google
      toast({
        title: "Cannot Reset Password",
        description: "This email was registered using Google Sign Up. Please sign in with Google and set a password in Edit Profile first.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // Also check Firebase sign-in methods
      const signInMethods = await fetchSignInMethodsForEmail(auth, trimmedEmail);
      console.log("Sign-in methods from Firebase:", signInMethods);

      // If only Google (no password), show error
      if (signInMethods.includes('google.com') && !signInMethods.includes('password')) {
        toast({
          title: "Cannot Reset Password",
          description: "This email was registered using Google Sign Up. Please sign in with Google and set a password in Edit Profile first.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Otherwise, send the reset email
      await sendPasswordResetEmail(auth, trimmedEmail);
      setEmailSent(true);
      toast({
        title: "Email Sent",
        description: "Password reset email has been sent to your inbox",
      });
    } catch (error: unknown) {
      let errorMessage = "Failed to send reset email";

      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`h-screen w-screen flex items-center justify-center p-4 relative overflow-hidden ${theme === "dark" ? "bg-gradient-to-br from-slate-950 to-slate-900" : "bg-gradient-to-br from-slate-50 to-slate-100"}`}>
      {/* Content */}
      <div className="relative z-10 w-full max-w-sm md:max-w-md">
        <div className={`w-full space-y-4 rounded-lg p-8 shadow-lg relative backdrop-blur-sm ${theme === "dark" ? "bg-slate-900/50 border border-slate-700" : "bg-white/80 border border-slate-200"}`}>
          {/* Back to Login Button */}
          <button
            onClick={() => navigate("/login-auth")}
            className="absolute -top-12 left-0 z-20 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">Back to Login</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="absolute -top-12 right-0 z-20 flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            <span className="text-sm">{theme === "dark" ? "Light" : "Dark"}</span>
          </button>

          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold">Forgot Password?</h1>
            <p className="text-muted-foreground text-sm">
              {emailSent
                ? "Check your email for the reset link"
                : "Enter your email and we'll send you a reset link"}
            </p>
          </div>

          {/* Success Message */}
          {emailSent && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
              <p className="text-sm text-primary">
                Email sent to <strong>{email}</strong>. Check your inbox (and spam folder).
              </p>
            </div>
          )}

          {/* Email Form */}
          {!emailSent ? (
            <form onSubmit={handleSendResetEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email Address</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="h-10 text-sm pl-10"
                  />
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 h-10 text-sm"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Click the link in the email to create a new password. The link will expire in a few hours.
              </p>
              <Button
                onClick={() => navigate("/login-auth")}
                className="w-full bg-primary hover:bg-primary/90 h-10 text-sm"
              >
                Back to Login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
