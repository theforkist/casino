import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { CrashGame } from "@/components/game/crash-minimal"; // Using minimal version with 3 decimal places
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function CrashPage() {
  const { user } = useAuth();
  
  if (!user) {
    return null; // ProtectedRoute will handle redirection
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-8 px-6">
        <div className="container mx-auto">
          <div className="flex items-center mb-6">
            <TrendingUp className="h-8 w-8 text-accent-green mr-3" />
            <div>
              <h1 className="text-3xl font-bold">Crash Game</h1>
              <p className="text-muted-foreground">
                Watch the multiplier climb and cash out before it crashes
              </p>
            </div>
          </div>
          
          <div className="mb-8">
            <Card className="bg-dark-secondary border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">How to Play</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Place your bet and click "Start Game"</li>
                  <li>Watch as the multiplier increases</li>
                  <li>Cash out before the game crashes to secure your winnings</li>
                  <li>If you cash out before the crash, you win your bet multiplied by the current value</li>
                  <li>If it crashes before you cash out, you lose your bet</li>
                  <li>You can set an automatic cash out point for quick reactions</li>
                </ol>
              </CardContent>
            </Card>
          </div>
          
          <CrashGame />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
