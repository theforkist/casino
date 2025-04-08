import { useState } from "react";
import { Redirect } from "wouter";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, CheckCircle, Headphones } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema.extend({
  passwordConfirm: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ["passwordConfirm"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");
  
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      passwordConfirm: "",
    },
  });
  
  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };
  
  const onRegisterSubmit = (data: RegisterFormData) => {
    const { passwordConfirm, ...userData } = data;
    registerMutation.mutate(userData);
  };
  
  // Redirect if user is already logged in
  if (user) {
    return <Redirect to="/dashboard" />;
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="bg-dark-secondary p-8 rounded-xl">
              <h1 className="text-3xl font-bold mb-6">
                {activeTab === "login" ? "Welcome Back" : "Create Account"}
              </h1>
              
              <Tabs 
                defaultValue="login" 
                value={activeTab} 
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your username" 
                                className="bg-dark-primary border-gray-700" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter your password" 
                                className="bg-dark-primary border-gray-700" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-accent-green hover:bg-accent-green/90"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Logging in..." : "Login"}
                      </Button>
                    </form>
                  </Form>
                  
                  <div className="mt-4 text-center">
                    <button 
                      className="text-sm text-muted-foreground hover:text-white"
                      onClick={() => setActiveTab("register")}
                    >
                      Don't have an account? Sign up
                    </button>
                  </div>
                </TabsContent>
                
                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Choose a username" 
                                className="bg-dark-primary border-gray-700" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Choose a password" 
                                className="bg-dark-primary border-gray-700" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="passwordConfirm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Confirm your password" 
                                className="bg-dark-primary border-gray-700" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex items-start mb-4">
                        <div className="flex items-center h-5">
                          <input
                            id="terms"
                            type="checkbox"
                            className="w-4 h-4 border border-gray-600 rounded bg-dark-primary"
                            required
                          />
                        </div>
                        <label htmlFor="terms" className="ml-2 text-sm text-muted-foreground">
                          I am over 18 years old and I agree to the Terms of Service and Privacy Policy
                        </label>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-accent-green hover:bg-accent-green/90"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                  
                  <div className="mt-4 text-center">
                    <button 
                      className="text-sm text-muted-foreground hover:text-white"
                      onClick={() => setActiveTab("login")}
                    >
                      Already have an account? Login
                    </button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="text-center lg:text-left">
              <h2 className="text-4xl font-bold mb-6">
                JohnsProperty Casino
                <br />
                <span className="text-accent-gold">Where Legends Are Made</span>
              </h2>
              
              <p className="text-lg mb-8 text-muted-foreground">
                Join thousands of players and experience the thrill of our exclusive casino games with fair play and massive rewards.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 bg-accent-green bg-opacity-20 rounded-full flex items-center justify-center text-accent-green">
                      <Shield className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-medium">$1,000 Welcome Bonus</h3>
                    <p className="text-muted-foreground">
                      Start your journey with $1,000 in free demo credits when you sign up
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 bg-accent-blue bg-opacity-20 rounded-full flex items-center justify-center text-accent-blue">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-medium">Provably Fair Games</h3>
                    <p className="text-muted-foreground">
                      All our games use transparent algorithms that ensure fair outcomes
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 bg-accent-gold bg-opacity-20 rounded-full flex items-center justify-center text-accent-gold">
                      <Headphones className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-medium">24/7 Support</h3>
                    <p className="text-muted-foreground">
                      Our support team is always available to help you with any issues
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
