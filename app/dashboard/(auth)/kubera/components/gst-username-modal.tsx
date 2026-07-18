"use client";

import { useState } from "react";
import { KeyRoundIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

/**
 * Modal to capture the user's GST portal username without typing it in chat. On save it
 * persists to the profile, then `onSaved(username)` lets the card continue the filing flow
 * (e.g. ask Kubera to request the OTP).
 */
export function GstUsernameModal({ onSaved }: { onSaved: (username: string) => void }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const value = username.trim();
    if (!value) return;
    setSaving(true);
    try {
      const res = await fetch("/api/gst/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gst_username: value }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Could not save the username.");
      }
      setOpen(false);
      onSaved(value);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <KeyRoundIcon className="size-4" />
          Add GST portal username
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>GST portal username</DialogTitle>
          <DialogDescription>
            Enter your GST portal login username. It&apos;s needed to request the filing OTP, which
            is sent to your GST-registered mobile.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label htmlFor="gst-username" className="text-xs">
            Username
          </Label>
          <Input
            id="gst-username"
            autoFocus
            placeholder="e.g. MH_NT4.2823"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !username.trim()} className="gap-1.5">
            {saving ? <Spinner className="size-4" /> : null}
            Save &amp; continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
