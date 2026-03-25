import { useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Megaphone, AlertTriangle, Bell, Info } from "lucide-react";

interface Message {
  id: string;
  type: "banner" | "maintenance" | "notice";
  title: string;
  content: string;
  enabled: boolean;
  icon: React.ElementType;
}

const initialMessages: Message[] = [
  {
    id: "announcement",
    type: "banner",
    title: "Announcement Banner",
    content: "🎉 New feature: Advanced analytics is now available for all Pro users!",
    enabled: true,
    icon: Megaphone,
  },
  {
    id: "maintenance",
    type: "maintenance",
    title: "Maintenance Message",
    content: "Scheduled maintenance on Sunday 2am-4am UTC. Expect brief downtime.",
    enabled: false,
    icon: AlertTriangle,
  },
  {
    id: "notice",
    type: "notice",
    title: "In-App Notice",
    content: "Reports may be delayed today due to high server load. We're working on it!",
    enabled: false,
    icon: Info,
  },
];

export default function ContentMessaging() {
  const [messages, setMessages] = useState(initialMessages);
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateMessage = (id: string, content: string) => {
    setMessages(messages.map((m) => (m.id === id ? { ...m, content } : m)));
  };

  const toggleMessage = (id: string) => {
    setMessages(messages.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)));
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Content & Messaging Control"
        description="Change copy without code changes."
      />

      <div className="space-y-6">
        {messages.map((message) => {
          const Icon = message.icon;
          const isEditing = editingId === message.id;

          return (
            <div key={message.id} className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted/50">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{message.title}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{message.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-medium ${message.enabled ? "text-success" : "text-muted-foreground"}`}>
                    {message.enabled ? "Live" : "Off"}
                  </span>
                  <Switch checked={message.enabled} onCheckedChange={() => toggleMessage(message.id)} />
                </div>
              </div>

              <div className="space-y-4">
                <Textarea
                  value={message.content}
                  onChange={(e) => updateMessage(message.id, e.target.value)}
                  onFocus={() => setEditingId(message.id)}
                  className="min-h-[80px]"
                />
                {isEditing && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => setEditingId(null)} className="gap-2">
                      <Save className="w-4 h-4" /> Save Changes
                    </Button>
                  </div>
                )}
              </div>

              {/* Preview */}
              {message.enabled && (
                <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm font-medium text-primary mb-1">Preview:</p>
                  <p className="text-sm">{message.content}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 stat-card">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2">
            <Bell className="w-4 h-4" /> Send Push Notification
          </Button>
          <Button variant="outline" className="gap-2">
            <Megaphone className="w-4 h-4" /> Email All Users
          </Button>
          <Button variant="outline" className="gap-2 text-warning">
            <AlertTriangle className="w-4 h-4" /> Enable Maintenance Mode
          </Button>
        </div>
      </div>
    </div>
  );
}
