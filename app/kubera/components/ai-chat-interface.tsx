"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, MicIcon, SquareIcon, MessageSquarePlusIcon, Trash2Icon, MessagesSquareIcon } from "lucide-react";
import { PlusIcon } from "@radix-ui/react-icons";

import {
  Input,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/custom/prompt/input";
import { Button } from "@/components/ui/button";
import { ChatContainer } from "@/components/ui/custom/prompt/chat-container";
import { Message, MessageContent } from "@/components/ui/custom/prompt/message";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { PromptLoader } from "@/components/ui/custom/prompt/loader";
import { PromptScrollButton } from "@/components/ui/custom/prompt/scroll-button";
import { GemmaDashboard } from "./dashboard/gemma-dashboard";
import { useAgentChat } from "../hooks/use-agent-chat";
import { useVoiceInput } from "../hooks/use-voice-input";
import { ToolResultCard, ConfirmCard } from "./agent-cards";

export default function AIChatInterface() {
  const [prompt, setPrompt] = useState("");
  const {
    items,
    isStreaming,
    conversations,
    conversationId,
    send,
    approve,
    reject,
    newChat,
    loadConversation,
    deleteConversation,
  } = useAgentChat();
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const started = items.length > 0;

  const voice = useVoiceInput((text) => setPrompt((p) => (p ? `${p} ${text}` : text)));

  const submit = () => {
    const text = prompt;
    if (!text.trim() || isStreaming) return;
    setPrompt("");
    void send(text);
  };

  const handleNewChat = () => {
    newChat();
    setPrompt("");
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* CHAT HISTORY — persistent left rail. */}
      <aside className="bg-muted/30 hidden w-60 shrink-0 flex-col border-r md:flex">
        <div className="p-3">
          <Button className="w-full justify-start gap-2" size="sm" onClick={handleNewChat}>
            <MessageSquarePlusIcon className="size-4" />
            New chat
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {conversations.length === 0 ? (
            <p className="text-muted-foreground px-2 py-4 text-center text-xs">No chats yet.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm",
                  c.id === conversationId ? "bg-primary/10 text-foreground" : "hover:bg-muted"
                )}>
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => void loadConversation(c.id)}>
                  <MessagesSquareIcon className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="truncate">{c.title}</span>
                </button>
                <button
                  className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => void deleteConversation(c.id)}
                  title="Delete chat">
                  <Trash2Icon className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* CHAT COLUMN */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      {/* HEADER — pinned. */}
      <div className={cn("shrink-0", started && "bg-background/80 border-b backdrop-blur-md")}>
        <div className="mx-auto flex w-full max-w-4xl items-center gap-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            {started && <h2 className="truncate text-sm font-semibold">Kubera.ai</h2>}
          </div>
          {started && (
            <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={handleNewChat}>
              <PlusIcon className="size-4" />
              New Chat
            </Button>
          )}
        </div>
      </div>

      {/* MIDDLE — scrolling region. */}
      <div className="relative min-h-0 flex-1">
        <ChatContainer
          className={cn("mx-auto h-full w-full max-w-4xl space-y-4 px-4 pt-4", { hidden: !started })}
          ref={containerRef}
          scrollToRef={bottomRef}>
          {items.map((item) => {
            if (item.kind === "user") {
              return (
                <Message key={item.id} className="justify-end">
                  <div className="max-w-[85%] flex-1 justify-end text-end sm:max-w-[75%]">
                    <MessageContent className="bg-primary text-primary-foreground inline-flex text-start">
                      {item.text}
                    </MessageContent>
                  </div>
                </Message>
              );
            }
            if (item.kind === "assistant") {
              return (
                <Message key={item.id} className="justify-start">
                  <div className="max-w-[85%] flex-1 sm:max-w-[75%]">
                    <div className="bg-muted text-foreground prose rounded-lg border p-4">
                      <Markdown className="space-y-4">{item.text}</Markdown>
                    </div>
                  </div>
                </Message>
              );
            }
            if (item.kind === "tool") {
              return (
                <Message key={item.id} className="justify-start">
                  <div className="max-w-[85%] flex-1 sm:max-w-[75%]">
                    <ToolResultCard
                    name={item.name}
                    result={item.result}
                    onAction={(text) => void send(text)}
                  />
                  </div>
                </Message>
              );
            }
            // confirm
            return (
              <Message key={item.id} className="justify-start">
                <div className="max-w-[85%] flex-1 sm:max-w-[75%]">
                  <ConfirmCard
                    name={item.name}
                    args={item.args}
                    disabled={isStreaming}
                    onApprove={(edited) => approve(item.id, edited)}
                    onReject={() => reject(item.id)}
                  />
                </div>
              </Message>
            );
          })}

          {isStreaming && (
            <div className="ps-2">
              <PromptLoader variant="pulse-dot" />
            </div>
          )}
        </ChatContainer>

        {/* Welcome screen — the AI dashboard. */}
        {!started && (
          <div className="h-full w-full overflow-y-auto">
            <div className="mx-auto flex min-h-full w-full flex-col justify-center px-4 py-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gemma-logo.png" alt="Kubera.ai" className="mx-auto mb-6 size-16" />
              <h1 className="text-center text-2xl leading-normal font-medium lg:text-4xl">
                Meet{" "}
                <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">
                  Kubera
                </span>
                , your AI CFO
              </h1>
              <div className="mt-5">
                <GemmaDashboard onAskGemma={(q) => void send(q)} />
              </div>
            </div>
          </div>
        )}

        {started && (
          <div className="absolute right-4 bottom-4">
            <PromptScrollButton containerRef={containerRef} scrollRef={bottomRef} className="shadow-sm" />
          </div>
        )}
      </div>

      {/* COMPOSER — pinned. */}
      <div className="shrink-0">
        <div className="mx-auto w-full max-w-4xl px-4 py-3">
          <Input
            value={prompt}
            onValueChange={setPrompt}
            onSubmit={submit}
            className="w-full overflow-hidden p-0">
            <PromptInputTextarea placeholder="Ask Kubera about invoices, cash flow, GST…" className="min-h-auto p-4" />
            <PromptInputActions className="flex items-center justify-end gap-2 p-3">
              <div className="flex gap-2">
                {voice.supported && (
                  <PromptInputAction tooltip={voice.listening ? "Stop listening" : "Voice input"}>
                    <Button
                      variant={voice.listening ? "default" : "outline"}
                      size="icon"
                      className="size-9 rounded-full"
                      onClick={voice.toggle}>
                      <MicIcon size={18} className={voice.listening ? "animate-pulse" : ""} />
                    </Button>
                  </PromptInputAction>
                )}
                <PromptInputAction tooltip={isStreaming ? "Working…" : "Send message"}>
                  <Button
                    variant="default"
                    size="icon"
                    className="size-8 rounded-full"
                    onClick={submit}
                    disabled={!prompt.trim() || isStreaming}>
                    {isStreaming ? <SquareIcon /> : <ArrowUpIcon />}
                  </Button>
                </PromptInputAction>
              </div>
            </PromptInputActions>
          </Input>
        </div>
      </div>
      </div>
    </div>
  );
}
