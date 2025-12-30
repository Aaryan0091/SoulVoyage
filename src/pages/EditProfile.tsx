import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check, Lock, Key } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileMenu } from "@/components/ProfileMenu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { fetchSignInMethodsForEmail, linkWithCredential, EmailAuthProvider, updatePassword, reauthenticateWithCredential } from "firebase/auth";

const EditProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentProfile } = useAuth();
  const [userId, setUserId] = useState("");
  const [copied, setCopied] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [checkingProvider, setCheckingProvider] = useState(true);

  // Password dialog states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    location: "",
    phone: "",
  });

  useEffect(() => {
    if (currentProfile) {
      setUserId(currentProfile.userId || currentProfile.id);
      setFormData({
        name: currentProfile.name || "",
        email: currentProfile.email || "",
        bio: "",
        location: "",
        phone: "",
      });

      // Check if user has password sign-in method
      const checkSignInMethod = async () => {
        if (currentProfile.email && auth.currentUser) {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, currentProfile.email);
            setHasPassword(methods.includes("password"));
          } catch (error) {
            console.error("Error checking sign-in methods:", error);
          } finally {
            setCheckingProvider(false);
          }
        } else {
          setCheckingProvider(false);
        }
      };

      checkSignInMethod();
    }
  }, [currentProfile]);

  const handleCopyUserId = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(userId);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = userId;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast({
        title: "Copied!",
        description: "User ID copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
      toast({
        title: "Error",
        description: "Failed to copy ID",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
    });
  };

  const openPasswordDialog = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordDialog(true);
  };

  const handlePasswordSubmit = async () => {
    // Validation
    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirm password must be the same.",
        variant: "destructive",
      });
      return;
    }

    setPasswordLoading(true);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error("No authenticated user found");
      }

      if (hasPassword) {
        // User already has password - need to reauthenticate first, then update
        if (!currentPassword) {
          toast({
            title: "Current Password Required",
            description: "Please enter your current password to verify.",
            variant: "destructive",
          });
          setPasswordLoading(false);
          return;
        }

        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);

        toast({
          title: "Password Changed",
          description: "Your password has been successfully updated.",
        });
      } else {
        // User doesn't have password yet (Google user) - link email/password credential
        const credential = EmailAuthProvider.credential(user.email, newPassword);
        await linkWithCredential(user, credential);

        setHasPassword(true);
        toast({
          title: "Password Set",
          description: "You can now sign in with your email and password, or continue using Google.",
        });
      }

      setShowPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      let errorMessage = "Failed to update password";
      if (error.code === "auth/wrong-password") {
        errorMessage = "Current password is incorrect.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already linked to another account.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Profile and Theme Toggle in top right corner */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <ProfileMenu />
        <ThemeToggle />
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/main")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Main
        </Button>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Main Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Edit Profile</CardTitle>
              <CardDescription>
                Update your personal information and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                {/* User ID Section */}
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 space-y-2">
                  <Label className="text-sm font-semibold">Your User ID</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={userId}
                      readOnly
                      className="flex-1 bg-background"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={handleCopyUserId}
                      className={copied ? "bg-primary text-primary-foreground" : ""}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share this ID with friends to add you. Each ID is unique and permanent.
                  </p>
                </div>

                {/* Profile Picture */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-2xl">U</AvatarFallback>
                  </Avatar>
                  <Button type="button" variant="outline">
                    Change Photo
                  </Button>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder="City, Country"
                    value={formData.location}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    placeholder="Tell us about yourself..."
                    rows={4}
                    value={formData.bio}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button type="submit" className="flex-1">
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/main")}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Password & Security Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Password & Security
              </CardTitle>
              <CardDescription>
                Manage your password and sign-in options
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checkingProvider ? (
                <p className="text-sm text-muted-foreground">Checking sign-in methods...</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Key className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {hasPassword ? "Email & Password Sign-in" : "Set Password Sign-in"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {hasPassword
                            ? "You can sign in using your email and password"
                            : "Add a password to sign in without Google"}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={openPasswordDialog}
                      variant={hasPassword ? "outline" : "default"}
                    >
                      {hasPassword ? "Change Password" : "Set Password"}
                    </Button>
                  </div>

                  {!hasPassword && (
                    <p className="text-xs text-muted-foreground">
                      Note: You can continue using Google sign-in even after setting a password. Both methods will work.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {hasPassword ? "Change Your Password" : "Set a Password"}
            </DialogTitle>
            <DialogDescription>
              {hasPassword
                ? "Enter your current password and choose a new one"
                : "Create a password to sign in without using Google"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {hasPassword && (
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password">{hasPassword ? "New Password" : "Password"}</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {newPassword && newPassword.length < 6 && (
              <p className="text-xs text-destructive">Password must be at least 6 characters long</p>
            )}

            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordDialog(false)}
              disabled={passwordLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordSubmit}
              disabled={passwordLoading || !newPassword || !confirmPassword || newPassword.length < 6 || newPassword !== confirmPassword || (hasPassword && !currentPassword)}
            >
              {passwordLoading ? "Processing..." : hasPassword ? "Change Password" : "Set Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditProfile;
