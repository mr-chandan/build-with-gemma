import type { Metadata } from "next";

import AIChatInterface from "./components/ai-chat-interface";

export const metadata: Metadata = {
  title: "Build with Gemma",
  description: "Chat with Gemma."
};

export default function Page() {
  return (
    <div className="relative flex h-[calc(100vh-var(--header-height)-3rem)] rounded-md lg:border">
      <div className="flex w-full grow flex-col">
        <AIChatInterface />
      </div>
    </div>
  );
}
