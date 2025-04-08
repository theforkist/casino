import { Link } from "wouter";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { 
  Shield, 
  CheckCircle, 
  Headphones, 
  Dice1, 
  TrendingUp, 
  PenTool,
  Shuffle,
  ShieldCheck,
  Percent
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-dark-primary to-dark-secondary opacity-75"></div>
          <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1596838132731-8dbd54d9ac9a?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center"></div>
        </div>
        
        <div className="container mx-auto relative z-10 px-6 py-20 md:py-32">
          <div className="max-w-3xl">
            <h1 className="font-sans text-4xl md:text-6xl font-bold mb-4 leading-tight text-white">
              Welcome to JohnsProperty Casino – <br />
              <span className="text-accent-gold">Where Legends Are Made</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 font-medium italic text-white">
              "99% of gamblers quit before they win big."
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-8">
              {user ? (
                <>
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-accent-green hover:bg-accent-green/90">
                      Dashboard
                    </Button>
                  </Link>
                  <Link href="/dice">
                    <Button size="lg" variant="outline">
                      Play Now
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth">
                    <Button size="lg" className="bg-accent-green hover:bg-accent-green/90">
                      Sign Up Now
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button size="lg" variant="outline">
                      Login
                    </Button>
                  </Link>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm text-white">
              <div className="flex items-center">
                <Shield className="mr-2 h-4 w-4 text-accent-green" />
                <span>Secure Gaming</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-accent-green" />
                <span>Fair Play</span>
              </div>
              <div className="flex items-center">
                <Headphones className="mr-2 h-4 w-4 text-accent-green" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Games */}
      <section id="games" className="py-16 px-6">
        <div className="container mx-auto">
          <h2 className="text-3xl font-sans font-bold mb-12 text-center text-white">Featured Games</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Dice Game Card */}
            <div className="bg-dark-secondary rounded-xl overflow-hidden transition duration-300 shadow-lg hover:-translate-y-2">
              <div className="relative h-48 overflow-hidden">
                <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1608163338707-c5686aa7bfc7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')] bg-cover"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-dark-primary to-transparent"></div>
                <div className="absolute bottom-4 left-4">
                  <span className="bg-dark-primary bg-opacity-70 text-accent-green px-3 py-1 rounded-full text-sm font-medium">
                    Popular
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-sans font-bold text-white">Dice</h3>
                  <div className="flex items-center text-white/70 text-sm">
                    <Dice1 className="mr-1 h-4 w-4" />
                    <span>1.2k playing</span>
                  </div>
                </div>
                <p className="text-white mb-6">
                  Bet over or under a target number and win big with our fair dice game. Higher risk means higher rewards!
                </p>
                <Link href={user ? "/dice" : "/auth"}>
                  <Button className="w-full bg-accent-blue hover:bg-accent-blue/90">
                    Play Now
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Crash Game Card */}
            <div className="bg-dark-secondary rounded-xl overflow-hidden transition duration-300 shadow-lg hover:-translate-y-2">
              <div className="relative h-48 overflow-hidden">
                <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1642483200111-613b2bfd74af?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')] bg-cover"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-dark-primary to-transparent"></div>
                <div className="absolute bottom-4 left-4">
                  <span className="bg-dark-primary bg-opacity-70 text-accent-gold px-3 py-1 rounded-full text-sm font-medium">
                    Featured
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-sans font-bold text-white">Crash</h3>
                  <div className="flex items-center text-white/70 text-sm">
                    <TrendingUp className="mr-1 h-4 w-4" />
                    <span>2.8k playing</span>
                  </div>
                </div>
                <p className="text-white mb-6">
                  Watch the multiplier climb and cash out before it crashes. Test your nerves and win huge multipliers.
                </p>
                <Link href={user ? "/crash" : "/auth"}>
                  <Button className="w-full bg-accent-blue hover:bg-accent-blue/90">
                    Play Now
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Poker Game Card */}
            <div className="bg-dark-secondary rounded-xl overflow-hidden transition duration-300 shadow-lg hover:-translate-y-2">
              <div className="relative h-48 overflow-hidden">
                <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1541278107931-e006523892df?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')] bg-cover"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-dark-primary to-transparent"></div>
                <div className="absolute bottom-4 left-4">
                  <span className="bg-dark-primary bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-medium">
                    New
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-sans font-bold text-white">Texas Hold'Em Poker</h3>
                  <div className="flex items-center text-white/70 text-sm">
                    <PenTool className="mr-1 h-4 w-4" />
                    <span>845 playing</span>
                  </div>
                </div>
                <p className="text-white mb-6">
                  Challenge other players or bots in the classic poker game. Bluff your way to the top.
                </p>
                <Link href={user ? "/poker" : "/auth"}>
                  <Button className="w-full bg-accent-blue hover:bg-accent-blue/90">
                    Play Now
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Fair Play Section */}
      <section className="py-16 px-6 bg-dark-secondary">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-sans font-bold mb-4 text-white">Fair Play Guaranteed</h2>
            <p className="text-white">
              At JohnsProperty Casino, we're committed to providing a transparent and fair gaming environment. Our games use advanced algorithms to ensure unbiased outcomes for all players.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-dark-primary rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-accent-green bg-opacity-20 rounded-full flex items-center justify-center text-accent-green text-2xl mx-auto mb-4">
                <Shuffle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-medium mb-2 text-white">Provably Fair</h3>
              <p className="text-white">
                Our algorithms allow you to verify each game outcome's fairness with cryptographic validation.
              </p>
            </div>
            
            <div className="bg-dark-primary rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-accent-blue bg-opacity-20 rounded-full flex items-center justify-center text-accent-blue text-2xl mx-auto mb-4">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-medium mb-2 text-white">Secure Gaming</h3>
              <p className="text-white">
                Advanced encryption and security measures protect your data and ensure fair gameplay.
              </p>
            </div>
            
            <div className="bg-dark-primary rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-accent-gold bg-opacity-20 rounded-full flex items-center justify-center text-accent-gold text-2xl mx-auto mb-4">
                <Percent className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-medium mb-2 text-white">Transparent RTP</h3>
              <p className="text-white">
                Clear Return-to-Player percentages displayed for all games so you know your chances.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Sign Up CTA */}
      <section className="py-20 px-6 bg-dark-primary relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-dark-secondary opacity-70"></div>
          <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1600456899121-68eda5705257?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center"></div>
        </div>
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-sans font-bold mb-4 text-white">Ready to Join the Winners?</h2>
            <p className="text-xl text-white mb-8">
              Sign up now and get $1,000 in demo credits to start your winning journey.
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              {user ? (
                <Link href="/dashboard">
                  <Button size="lg" className="bg-accent-green hover:bg-accent-green/90">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth">
                    <Button size="lg" className="bg-accent-green hover:bg-accent-green/90">
                      Create Account
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button size="lg" variant="outline">
                      Login
                    </Button>
                  </Link>
                </>
              )}
            </div>
            <p className="text-sm text-white/70 mt-6">
              By signing up, you agree to our Terms of Service and Privacy Policy.
              <br />Always gamble responsibly.
            </p>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
