import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  link: string;
  created_at: string;
}

export const NotificationBell = ({ userId }: { userId: string }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notif-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications((data || []) as Notification[]);
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-mono flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-[400px] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl z-50"
          >
            <div className="flex items-center justify-between p-3 border-b border-border">
              <span className="text-xs font-mono tracking-wider text-muted-foreground">NOTIFICATIONS</span>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllRead} className="h-6 text-[10px] font-mono">
                    <Check className="w-3 h-3 mr-1" /> READ ALL
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-6 w-6 p-0">
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-mono">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map(n => (
                  <div key={n.id} className={`p-3 hover:bg-secondary/30 transition-colors ${!n.is_read ? "bg-secondary/10" : ""}`}>
                    <div className="flex items-start gap-2">
                      {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[9px] font-mono text-muted-foreground/60 mt-1">
                          {new Date(n.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
