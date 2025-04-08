import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dice1, TrendingUp, PenTool, History, Search, Filter } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function GameHistoryPage() {
  const { user } = useAuth();
  const [gameTypeFilter, setGameTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  
  // Fetch game history
  const {
    data: gameHistory = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["/api/game-history"],
    enabled: !!user,
  });
  
  if (!user) {
    return null; // ProtectedRoute will handle redirection
  }
  
  // Filter and sort game history
  const filteredHistory = gameHistory
    .filter((game: any) => {
      if (gameTypeFilter !== "all" && game.gameType !== gameTypeFilter) {
        return false;
      }
      
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          game.gameType.toLowerCase().includes(searchLower) ||
          game.outcome.toLowerCase().includes(searchLower) ||
          game.betAmount.toString().includes(searchLower) ||
          game.winAmount.toString().includes(searchLower)
        );
      }
      
      return true;
    })
    .sort((a: any, b: any) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  
  // Game type icon helper
  const getGameIcon = (gameType: string) => {
    switch (gameType) {
      case "dice":
        return <Dice1 className="h-4 w-4 text-accent-blue" />;
      case "crash":
        return <TrendingUp className="h-4 w-4 text-accent-green" />;
      case "poker":
        return <PenTool className="h-4 w-4 text-accent-gold" />;
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-8 px-6">
        <div className="container mx-auto">
          <div className="flex items-center mb-6">
            <History className="h-8 w-8 mr-3" />
            <div>
              <h1 className="text-3xl font-bold">Game History</h1>
              <p className="text-muted-foreground">
                View your past game results and betting history
              </p>
            </div>
          </div>
          
          <Card className="bg-dark-secondary border-gray-800">
            <CardHeader>
              <CardTitle>All Games</CardTitle>
              <CardDescription>
                Your complete game history across all casino games
              </CardDescription>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search game history..."
                    className="pl-9 bg-dark-primary border-gray-700"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={gameTypeFilter}
                    onValueChange={setGameTypeFilter}
                  >
                    <SelectTrigger className="w-[180px] bg-dark-primary border-gray-700">
                      <SelectValue placeholder="Game Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Games</SelectItem>
                      <SelectItem value="dice">Dice</SelectItem>
                      <SelectItem value="crash">Crash</SelectItem>
                      <SelectItem value="poker">Poker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-accent-green" />
                </div>
              ) : isError ? (
                <div className="text-center py-12">
                  <p className="text-red-500">Error loading game history</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </Button>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {search || gameTypeFilter !== "all" ? (
                    <>
                      <p>No games found matching your filters</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          setSearch("");
                          setGameTypeFilter("all");
                        }}
                      >
                        Clear Filters
                      </Button>
                    </>
                  ) : (
                    <>
                      <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>You haven't played any games yet</p>
                      <p className="text-sm mt-2">
                        Start playing to build your history
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <Table>
                  <TableCaption>
                    Showing {filteredHistory.length} of {gameHistory.length} game records
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Game</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Bet Amount</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead className="text-right">Win Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((game: any) => (
                      <TableRow key={game.id}>
                        <TableCell>
                          <div className="flex items-center">
                            {getGameIcon(game.gameType)}
                            <span className="ml-2 capitalize">{game.gameType}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(game.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>${parseFloat(game.betAmount).toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            game.outcome.includes("win") ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {game.outcome}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={game.outcome.includes("win") ? "text-green-500" : "text-muted-foreground"}>
                            ${parseFloat(game.winAmount).toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          
          {filteredHistory.length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-dark-secondary border-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg">Summary Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Games</span>
                      <span className="font-medium">{gameHistory.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Wagered</span>
                      <span className="font-medium">
                        ${gameHistory.reduce((acc: number, game: any) => acc + parseFloat(game.betAmount), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Won</span>
                      <span className="font-medium text-green-500">
                        ${gameHistory.reduce((acc: number, game: any) => acc + parseFloat(game.winAmount), 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win/Loss Ratio</span>
                      <span className="font-medium">
                        {(gameHistory.filter((game: any) => game.outcome.includes("win")).length / gameHistory.length * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-dark-secondary border-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg">Most Played Game</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const gameCounts: Record<string, number> = {};
                    gameHistory.forEach((game: any) => {
                      gameCounts[game.gameType] = (gameCounts[game.gameType] || 0) + 1;
                    });
                    
                    const mostPlayed = Object.entries(gameCounts)
                      .sort((a, b) => b[1] - a[1])[0];
                    
                    if (!mostPlayed) return <p>No games played yet</p>;
                    
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-dark-primary flex items-center justify-center">
                            {getGameIcon(mostPlayed[0]) && 
                              React.cloneElement(getGameIcon(mostPlayed[0]) as React.ReactElement, { className: 'h-6 w-6' })}
                          </div>
                          <div>
                            <p className="font-medium capitalize">{mostPlayed[0]}</p>
                            <p className="text-sm text-muted-foreground">
                              {mostPlayed[1]} games played
                            </p>
                          </div>
                        </div>
                        <div className="text-2xl font-bold">
                          {Math.round(mostPlayed[1] / gameHistory.length * 100)}%
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
              
              <Card className="bg-dark-secondary border-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg">Biggest Win</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const wins = gameHistory.filter((game: any) => game.outcome.includes("win"));
                    
                    if (wins.length === 0) {
                      return <p className="text-muted-foreground">No wins yet</p>;
                    }
                    
                    const biggestWin = wins.reduce((max: any, game: any) => 
                      parseFloat(game.winAmount) > parseFloat(max.winAmount) ? game : max, 
                      wins[0]);
                    
                    return (
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-12 w-12 rounded-full bg-dark-primary flex items-center justify-center">
                            {getGameIcon(biggestWin.gameType) && 
                              React.cloneElement(getGameIcon(biggestWin.gameType) as React.ReactElement, { className: 'h-6 w-6' })}
                          </div>
                          <div>
                            <p className="font-medium capitalize">{biggestWin.gameType}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(biggestWin.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-muted-foreground">Win Amount</span>
                          <span className="text-2xl font-bold text-green-500">
                            ${parseFloat(biggestWin.winAmount).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline mt-1">
                          <span className="text-muted-foreground">Bet Amount</span>
                          <span className="text-sm">
                            ${parseFloat(biggestWin.betAmount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
