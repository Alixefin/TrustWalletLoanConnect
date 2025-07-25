import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShieldCheck, Zap, Globe } from "lucide-react";

const benefits = [
  {
    icon: <ShieldCheck className="h-10 w-10 text-primary" />,
    title: "No Credit Checks",
    description: "Your financial history stays private. We believe in your potential, not your past.",
  },
  {
    icon: <Zap className="h-10 w-10 text-primary" />,
    title: "Instant Approval",
    description: "Get your loan approved in minutes, not days. Our smart contracts automate the process.",
  },
  {
    icon: <Globe className="h-10 w-10 text-primary" />,
    title: "Secure & Decentralized",
    description: "Built on a secure blockchain, ensuring your assets are always safe and under your control.",
  },
];

export default function Benefits() {
  return (
    <section className="py-12 sm:py-20 bg-secondary">
      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Why Use Trust Wallet Loan Connect?
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="text-center shadow-md hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="items-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
                  {benefit.icon}
                </div>
                <CardTitle className="font-headline text-2xl">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
