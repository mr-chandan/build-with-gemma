import { z } from "zod";

import type { Tool } from "../types";

export const pingTool: Tool<{ message: string }, { pong: string; toolCalling: string }> = {
  name: "ping",
  description:
    "Echo/connectivity test tool. Call this when the user asks to test the tools or the connection, or says 'ping'.",
  schema: z.object({ message: z.string().describe("Any short text to echo back.") }),
  handler: async ({ message }) => ({ pong: message, toolCalling: "works" }),
};
