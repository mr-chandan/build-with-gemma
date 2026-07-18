"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { History, Search, Trash2, MessagesSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { Conversation } from "../hooks/use-agent-chat";

interface ChatHistoryDialogProps {
  conversations: Conversation[];
  conversationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ChatHistoryDialog({
  conversations,
  conversationId,
  onSelect,
  onDelete,
}: ChatHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0 gap-2">
          <History className="size-4" />
          History
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="space-y-0 border-b px-3 py-2 pr-12">
          <DialogTitle className="sr-only">Chat history</DialogTitle>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
            <Input
              autoFocus
              placeholder="Search for chats..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 pl-8 text-base shadow-none focus-visible:ring-0"
            />
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          <p className="text-muted-foreground px-2 py-1.5 text-xs">All Chats</p>

          {filtered.map((conversation) => (
            <div
              key={conversation.id}
              className="group hover:bg-muted flex items-center gap-1 rounded-lg">
              <button
                onClick={() => {
                  onSelect(conversation.id);
                  setOpen(false);
                }}
                className={cn(
                  "min-w-0 flex-1 truncate rounded-lg px-3 py-2.5 text-start text-sm",
                  conversationId === conversation.id && "font-medium"
                )}>
                {conversation.title}
              </button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete chat"
                className="text-muted-foreground mr-1 size-8 shrink-0 hover:text-red-500 group-hover:opacity-100 md:opacity-0"
                onClick={() => onDelete(conversation.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}

          {conversations.length === 0 && (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm">
              <MessagesSquare className="size-5 opacity-60" />
              No chats yet.
            </div>
          )}
          {conversations.length > 0 && filtered.length === 0 && (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No chats found.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
