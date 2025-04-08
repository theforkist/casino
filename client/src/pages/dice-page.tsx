import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { DiceGame } from "@/components/game/dice-game";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dice1 } from "lucide-react";

export default function DicePage() {
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
            <Dice1 className="h-8 w-8 text-accent-blue mr-3" />
            <div>
              <h1 className="text-3xl font-bold">Dice Game</h1>
              <p className="text-muted-foreground">
                Test your luck with our provably fair dice game
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
                  <li>Choose a target number between 1 and 98</li>
                  <li>Select whether you want to bet over or under the target number</li>
                  <li>Enter your bet amount (up to the max bet limit)</li>
                  <li>The dice will roll and generate a random number from 1 to 100</li>
                  <li>Win if the roll is greater than your target (when betting over) or less than your target (when betting under)</li>
                  <li>The closer your target is to the edge of the range, the higher your payout will be</li>
                </ol>
              </CardContent>
            </Card>
          </div>
          
          <DiceGame />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
