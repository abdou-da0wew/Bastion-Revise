"use client";

import { Check } from "lucide-react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const planFeatures = [
  "500MB storage",
  "10,000 requests / day",
  "10MB max file size",
  "Full audit logs",
  "API access",
  "All security features",
];

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-muted-foreground">
            Start free. Scale when you need to.
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-sm">
          <Card className="relative">
            <CardHeader className="items-center text-center pb-2">
              <Badge variant="secondary" className="mb-2">
                Free
              </Badge>
              <div className="text-4xl font-bold">$0</div>
              <p className="text-sm text-muted-foreground mt-1">per month</p>
            </CardHeader>
            <CardContent className="space-y-3 pb-6">
              {planFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter className="pt-0">
              <Button className="w-full">Get Started Free</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
