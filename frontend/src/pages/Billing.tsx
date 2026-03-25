import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { CreditCard, Check, Download, ArrowUpRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "Perfect for small businesses",
    features: ["Up to 50 jobs/month", "Basic reporting", "Email support", "1 user"],
    current: false,
  },
  {
    name: "Professional",
    price: "$79",
    period: "/month",
    description: "For growing businesses",
    features: ["Unlimited jobs", "Advanced analytics", "Priority support", "5 users", "API access"],
    current: true,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$199",
    period: "/month",
    description: "For large organizations",
    features: ["Everything in Pro", "Unlimited users", "Custom integrations", "Dedicated support", "SLA guarantee"],
    current: false,
  },
];

const invoices = [
  { id: "INV-2024-012", date: "Jan 1, 2024", amount: "$79.00", status: "paid" },
  { id: "INV-2024-011", date: "Dec 1, 2023", amount: "$79.00", status: "paid" },
  { id: "INV-2024-010", date: "Nov 1, 2023", amount: "$79.00", status: "paid" },
  { id: "INV-2024-009", date: "Oct 1, 2023", amount: "$79.00", status: "paid" },
];

export default function Billing() {
  return (
    <DashboardLayout title="Subscription & Billing" subtitle="Manage your plan and payment settings">
      <div className="space-y-6">
        {/* Current Plan */}
        <div className="glass-card rounded-xl p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Current Plan</h3>
              <p className="text-sm text-muted-foreground">You are currently on the Professional plan</p>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              <span className="text-sm font-medium text-foreground">Renews Jan 1, 2025</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan, index) => (
              <div
                key={plan.name}
                className={cn(
                  "relative p-5 rounded-xl border transition-all duration-200 animate-fade-up",
                  plan.current
                    ? "bg-primary/5 border-primary"
                    : "bg-card border-border hover:border-primary/50"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-4">
                  <h4 className="text-lg font-semibold text-foreground">{plan.name}</h4>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.current ? "outline" : "default"}
                  className="w-full"
                  disabled={plan.current}
                >
                  {plan.current ? "Current Plan" : "Upgrade"}
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Method */}
          <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "200ms" }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Payment Method</h3>
            
            <div className="p-4 rounded-lg bg-muted/50 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-card">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">•••• •••• •••• 4242</p>
                  <p className="text-xs text-muted-foreground">Expires 12/25</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                Update
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Billing email</span>
                <span className="text-foreground">billing@company.com</span>
              </div>
            </div>
          </div>

          {/* Invoices */}
          <div className="glass-card rounded-xl p-6 animate-fade-up" style={{ animationDelay: "250ms" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Recent Invoices</h3>
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {invoices.map((invoice, index) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors animate-slide-in"
                  style={{ animationDelay: `${300 + index * 50}ms` }}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{invoice.id}</p>
                    <p className="text-xs text-muted-foreground">{invoice.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{invoice.amount}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success capitalize">
                      {invoice.status}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cancel Subscription */}
        <div className="glass-card rounded-xl p-6 border-loss/20 animate-fade-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Cancel Subscription</h3>
              <p className="text-sm text-muted-foreground">
                Your subscription will remain active until the end of the current billing period.
              </p>
            </div>
            <Button variant="outline" className="text-loss border-loss/30 hover:bg-loss/10">
              Cancel Plan
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
