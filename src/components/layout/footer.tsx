import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="container flex flex-col md:flex-row items-center justify-between py-8 md:h-24 md:py-0">
        <nav className="flex flex-wrap justify-center gap-4 md:gap-6 mb-4 md:mb-0">
          <Link href="/about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            About
          </Link>
          <Link href="/contact" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            Contact
          </Link>
        </nav>
        <p className="text-sm text-center text-muted-foreground">
          © {new Date().getFullYear()} Trust Wallet Loan Connect. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
