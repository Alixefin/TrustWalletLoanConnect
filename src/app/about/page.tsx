import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container py-12 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl font-headline font-bold tracking-tighter sm:text-5xl text-primary mb-6">
              About Trust Wallet Loan Connect
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              Trust Wallet Loan Connect is a pioneering decentralized platform dedicated to revolutionizing the lending industry. We believe in financial empowerment for everyone, irrespective of their credit history. By leveraging the security and transparency of blockchain technology, we provide a seamless and secure way to access loans without the hurdles of traditional banking systems.
            </p>
            <p className="text-lg text-muted-foreground">
              Our mission is to build a trust-based financial ecosystem where your digital assets work for you. With instant approvals, no credit checks, and a globally accessible platform, we are making finance more inclusive and efficient. Join us in building the future of decentralized finance.
            </p>
          </div>
          <div>
            <Image 
              src="https://placehold.co/600x400.png"
              data-ai-hint="finance technology"
              alt="Team working on blockchain"
              width={600}
              height={400}
              className="rounded-lg shadow-xl"
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
