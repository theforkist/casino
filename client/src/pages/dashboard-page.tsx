import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dice1,
  TrendingUp,
  PenTool,
  History,
  Wallet,
  Clock,
  Award,
  BarChart2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Get game history for dashboard summary
  const { data: gameHistory = [] } = useQuery({
    queryKey: ["/api/game-history"],
    enabled: !!user,
  });

  if (!user) {
    return null; // ProtectedRoute will handle redirection
  }

  // Calculate some stats for the dashboard
  const totalGamesPlayed = gameHistory.length;
  const wins = gameHistory.filter((game: any) => 
    game.outcome.includes("win")).length;
  const winRate = totalGamesPlayed > 0 
    ? Math.round((wins / totalGamesPlayed) * 100) 
    : 0;
  
  // Calculate total won/lost
  const totalWon = gameHistory.reduce((acc: number, game: any) => 
    game.outcome.includes("win") ? acc + parseFloat(game.winAmount) : acc, 0);
  
  const totalBet = gameHistory.reduce((acc: number, game: any) => 
    acc + parseFloat(game.betAmount), 0);
  
  const netProfit = totalWon - totalBet;

  const handleRefund = () => {
    toast({
      title: "Refund Initiated",
      description: "Your account has been credited with $1,000 in demo credits.",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-8 px-6">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground mb-8">
            Welcome back, {user.username}. Here's an overview of your casino activity.
          </p>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid grid-cols-3 md:w-[400px]">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="games">Games</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-dark-secondary border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <Wallet className="mr-2 h-5 w-5 text-accent-green" />
                      Current Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      ${parseFloat(user.balance).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Demo Credits
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-dark-secondary border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <BarChart2 className="mr-2 h-5 w-5 text-accent-blue" />
                      Net Profit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${netProfit.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lifetime Profit/Loss
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="bg-dark-secondary border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <Award className="mr-2 h-5 w-5 text-accent-gold" />
                      Win Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {winRate}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalGamesPlayed} Games Played
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-dark-secondary border-gray-800">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                      Your last 5 games played
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {gameHistory.length > 0 ? (
                      <div className="space-y-4">
                        {gameHistory.slice(0, 5).map((game: any) => (
                          <div key={game.id} className="flex justify-between items-center border-b border-gray-800 pb-3">
                            <div className="flex items-center">
                              <div className="mr-4">
                                {game.gameType === "dice" ? (
                                  <Dice1 className="h-8 w-8 text-accent-blue" />
                                ) : game.gameType === "crash" ? (
                                  <TrendingUp className="h-8 w-8 text-accent-green" />
                                ) : (
                                  <PenTool className="h-8 w-8 text-accent-gold" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium capitalize">
                                  {game.gameType}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Bet: ${parseFloat(game.betAmount).toFixed(2)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-medium ${game.outcome.includes("win") ? 'text-green-500' : 'text-red-500'}`}>
                                {game.outcome.includes("win") ? `+$${parseFloat(game.winAmount).toFixed(2)}` : `-$${parseFloat(game.betAmount).toFixed(2)}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(game.createdAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No game history yet</p>
                        <p className="text-sm">Play some games to see your activity here</p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Link href="/history">
                      <Button variant="outline" className="w-full">
                        <History className="mr-2 h-4 w-4" />
                        View Full History
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
                
                <Card className="bg-dark-secondary border-gray-800">
                  <CardHeader>
                    <CardTitle>Game Stats</CardTitle>
                    <CardDescription>
                      Your performance across different games
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {["dice", "crash", "poker"].map(gameType => {
                        const gameStats = gameHistory.filter((game: any) => game.gameType === gameType);
                        const gamesCount = gameStats.length;
                        const winsCount = gameStats.filter((game: any) => game.outcome.includes("win")).length;
                        const gameWinRate = gamesCount > 0 ? Math.round((winsCount / gamesCount) * 100) : 0;
                        
                        return (
                          <div key={gameType} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                {gameType === "dice" ? (
                                  <Dice1 className="h-5 w-5 mr-2 text-accent-blue" />
                                ) : gameType === "crash" ? (
                                  <TrendingUp className="h-5 w-5 mr-2 text-accent-green" />
                                ) : (
                                  <PenTool className="h-5 w-5 mr-2 text-accent-gold" />
                                )}
                                <span className="font-medium capitalize">{gameType}</span>
                              </div>
                              <span className="text-sm">{gamesCount} games</span>
                            </div>
                            <div className="w-full bg-dark-primary rounded-full h-2.5">
                              <div 
                                className="bg-accent-green h-2.5 rounded-full" 
                                style={{ width: `${gameWinRate}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{winsCount} wins</span>
                              <span>{gameWinRate}% win rate</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="games" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-dark-secondary border-gray-800 game-card">
                  <div className="relative h-48 overflow-hidden rounded-t-lg">
                    <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1608163338707-c5686aa7bfc7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')] bg-cover"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-primary to-transparent"></div>
                  </div>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xl font-bold">Dice</h3>
                      <Dice1 className="h-5 w-5 text-accent-blue" />
                    </div>
                    <p className="text-muted-foreground text-sm mb-6">
                      Bet over or under a target number and win big with our fair dice game. Higher risk means higher rewards!
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Link href="/dice">
                      <Button className="w-full bg-accent-blue hover:bg-accent-blue/90">
                        Play Dice
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
                
                <Card className="bg-dark-secondary border-gray-800 game-card">
                  <div className="relative h-48 overflow-hidden rounded-t-lg">
                    <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1642483200111-613b2bfd74af?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')] bg-cover"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-primary to-transparent"></div>
                  </div>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xl font-bold">Crash</h3>
                      <TrendingUp className="h-5 w-5 text-accent-green" />
                    </div>
                    <p className="text-muted-foreground text-sm mb-6">
                      Watch the multiplier climb and cash out before it crashes. Test your nerves.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Link href="/crash">
                      <Button className="w-full bg-accent-green hover:bg-accent-green/90">
                        Play Crash
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
                
                <Card className="bg-dark-secondary border-gray-800 game-card">
                  <div className="relative h-48 overflow-hidden rounded-t-lg">
                    <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1541278107931-e006523892df?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')] bg-cover"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-primary to-transparent"></div>
                  </div>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xl font-bold">Texas Hold'Em</h3>
                      <PenTool className="h-5 w-5 text-accent-gold" />
                    </div>
                    <p className="text-muted-foreground text-sm mb-6">
                      Challenge AI opponents in this classic poker game. Bluff your way to victory.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Link href="/poker">
                      <Button className="w-full bg-accent-gold hover:bg-accent-gold/90 text-black">
                        Play Poker
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="account" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-dark-secondary border-gray-800">
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>
                      Your personal information and account details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Username</span>
                      <span className="font-medium">{user.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account ID</span>
                      <span className="font-medium">#{user.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member Since</span>
                      <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Balance</span>
                      <span className="font-medium">${parseFloat(user.balance).toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-dark-secondary border-gray-800">
                  <CardHeader>
                    <CardTitle>Deposit & Withdrawal</CardTitle>
                    <CardDescription>
                      Manage your casino balance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-4 border border-dashed border-gray-700 rounded-lg">
                      <p className="mb-2">
                        This is a demo casino with play money only.
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        No real money deposits or withdrawals are available.
                      </p>
                      <Button 
                        onClick={handleRefund}
                        className="bg-accent-green hover:bg-accent-green/90"
                      >
                        Get $1,000 Demo Credits
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
