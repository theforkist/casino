import { Link } from "wouter";
import { 
  Twitter, 
  Facebook, 
  Instagram, 
  Mail, 
  Headphones,
  CreditCard,
} from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-dark-primary border-t border-gray-800 py-12 px-6">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="text-2xl font-bold font-sans text-white mb-4">
              JOHNSPROPERTY<span className="text-accent-green">CASINO</span>
            </div>
            <p className="text-muted-foreground mb-4">
              Where Legends Are Made. The ultimate destination for casino games with fair play and big rewards.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-white">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-white">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-white">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Games</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/dice">
                  <a className="hover:text-white transition">Dice</a>
                </Link>
              </li>
              <li>
                <Link href="/crash">
                  <a className="hover:text-white transition">Crash</a>
                </Link>
              </li>
              <li>
                <Link href="/poker">
                  <a className="hover:text-white transition">Texas Hold'Em</a>
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Support</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-white transition">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition">Responsible Gaming</a></li>
              <li><a href="#" className="hover:text-white transition">Fair Play</a></li>
              <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Contact</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center">
                <Mail className="mr-2 h-4 w-4" />
                <span>support@johnsproperty.com</span>
              </li>
              <li className="flex items-center">
                <Headphones className="mr-2 h-4 w-4" />
                <span>Live Chat (24/7)</span>
              </li>
            </ul>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-2">Accepted Payment Methods</h4>
              <div className="flex flex-wrap gap-2">
                <div className="bg-dark-secondary p-1 rounded">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="bg-dark-secondary p-1 rounded">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.638 14.904c-1.602 6.425-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.68 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.636-4.746c.24-.974-.043-1.319-.732-1.554-.663-.23-1.339-.081-1.986.212a4.5 4.5 0 00-.203.109c.004-.108.004-.21.007-.297.078-.778.044-.778-.647-.998l-.148-.018c-.527.018-.662.153-.78.74-.593 2.972-.806 3.832-1.077 5.009-.05.23-.098.466-.155.739-.165.631.044.845.732.831.154-.002.318 0 .49-.015.57-.061.664-.196.78-.777.149-.777.23-1.175.347-1.74l.072-.352c.086-.415.142-.692.339-.708a3.067 3.067 0 01.585.06c.24.06.45.153.4.472-.08.51-.268 1.35-.406 1.98-.116.516-.088.882.448.956.27.037.539.073.91-.094.311-.18.501-.611.63-1.23.16-.675.33-1.253.484-1.896.113-.486.236-.914.519-.969z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-6 border-t border-gray-800 text-center text-muted-foreground text-sm">
          <p>© 2023 JohnsProperty Casino. All rights reserved.</p>
          <p className="mt-2">
            Gambling can be addictive. Please play responsibly.
          </p>
        </div>
      </div>
    </footer>
  );
}
