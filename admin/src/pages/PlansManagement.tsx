import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Check, X, Edit2, Save } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  maxJobs: number;
  maxUsers: number;
  reports: boolean;
  apiAccess: boolean;
  enabled: boolean;
}

const initialPlans: Plan[] = [
  { id: "starter", name: "Starter", price: 29, maxJobs: 50, maxUsers: 1, reports: false, apiAccess: false, enabled: true },
  { id: "pro", name: "Pro", price: 49, maxJobs: 200, maxUsers: 3, reports: true, apiAccess: false, enabled: true },
  { id: "business", name: "Business", price: 99, maxJobs: 500, maxUsers: 10, reports: true, apiAccess: false, enabled: true },
  { id: "enterprise", name: "Enterprise", price: 299, maxJobs: -1, maxUsers: -1, reports: true, apiAccess: true, enabled: true },
];

export default function PlansManagement() {
  const [plans, setPlans] = useState(initialPlans);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Plan>>({});

  const startEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setEditValues(plan);
  };

  const saveEdit = () => {
    if (editingId && editValues) {
      setPlans(plans.map((p) => (p.id === editingId ? { ...p, ...editValues } : p)));
      setEditingId(null);
      setEditValues({});
    }
  };

  const togglePlan = (id: string) => {
    setPlans(plans.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Plans & Limits Management"
        description="Control pricing logic — gives you pricing flexibility."
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="admin-table">
          <thead>
            <tr className="bg-muted/30">
              <th>Plan</th>
              <th>Price</th>
              <th>Max Jobs/mo</th>
              <th>Max Users</th>
              <th>Reports</th>
              <th>API Access</th>
              <th>Status</th>
              <th className="w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => {
              const isEditing = editingId === plan.id;
              return (
                <tr key={plan.id}>
                  <td className="font-medium">{plan.name}</td>
                  <td>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editValues.price}
                        onChange={(e) => setEditValues({ ...editValues, price: Number(e.target.value) })}
                        className="w-24"
                      />
                    ) : (
                      `$${plan.price}/mo`
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editValues.maxJobs}
                        onChange={(e) => setEditValues({ ...editValues, maxJobs: Number(e.target.value) })}
                        className="w-24"
                      />
                    ) : plan.maxJobs === -1 ? (
                      "Unlimited"
                    ) : (
                      plan.maxJobs
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editValues.maxUsers}
                        onChange={(e) => setEditValues({ ...editValues, maxUsers: Number(e.target.value) })}
                        className="w-24"
                      />
                    ) : plan.maxUsers === -1 ? (
                      "Unlimited"
                    ) : (
                      plan.maxUsers
                    )}
                  </td>
                  <td>
                    {plan.reports ? (
                      <Check className="w-5 h-5 text-success" />
                    ) : (
                      <X className="w-5 h-5 text-muted-foreground" />
                    )}
                  </td>
                  <td>
                    {plan.apiAccess ? (
                      <Check className="w-5 h-5 text-success" />
                    ) : (
                      <X className="w-5 h-5 text-muted-foreground" />
                    )}
                  </td>
                  <td>
                    <Switch checked={plan.enabled} onCheckedChange={() => togglePlan(plan.id)} />
                  </td>
                  <td>
                    {isEditing ? (
                      <Button variant="ghost" size="icon" onClick={saveEdit}>
                        <Save className="w-4 h-4 text-success" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => startEdit(plan)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 stat-card">
        <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-bold">4</p>
            <p className="text-sm text-muted-foreground">Active Plans</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-success">$119</p>
            <p className="text-sm text-muted-foreground">Avg Plan Price</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">Enterprise</p>
            <p className="text-sm text-muted-foreground">Most Popular</p>
          </div>
          <div>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Disabled Plans</p>
          </div>
        </div>
      </div>
    </div>
  );
}
