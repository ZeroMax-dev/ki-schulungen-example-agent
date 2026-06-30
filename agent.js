// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config({ quiet: true });

import * as z from "zod";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";

// Check for required API keys
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

if (!process.env.SERPER_API_KEY) {
  throw new Error("SERPER_API_KEY environment variable is required");
}

// Initialize the model
const model = new ChatOpenAI({
  model: "gpt-5.4-mini",
  temperature: 0,
});

// A custom web-search tool built on the Serper API (https://serper.dev).
// Building your own tool with `tool()` + a zod schema is the core idea of this
// workshop. Docs: https://docs.langchain.com/oss/javascript/langchain/tools
const webSearch = tool(
  async ({ query }) => {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query }),
    });

    if (!response.ok) {
      return `Web search failed with status ${response.status}`;
    }

    const data = await response.json();

    // Prefer a direct answer if Serper provides one, otherwise summarize the
    // top organic results into a compact, model-friendly string.
    if (data.answerBox?.answer) return String(data.answerBox.answer);
    if (data.answerBox?.snippet) return String(data.answerBox.snippet);

    const results = (data.organic ?? [])
      .slice(0, 5)
      .map((r) => `${r.title}\n${r.snippet ?? ""}\n${r.link}`)
      .join("\n\n");

    return results || "No results found.";
  },
  {
    name: "web_search",
    description:
      "Search the web (Google, via Serper) for current information. Use this for anything that may require up-to-date facts.",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
  }
);

// A simple static tool that returns information about LangSmith.
const langSmithTool = tool(
  async ({ question }) => {
    return `
      LangSmith is a comprehensive platform designed for developing, evaluating, and monitoring large language model (LLM) applications.

      Key features:
      - Debug and optimize LLM applications
      - Monitor and track LLM performance
      - Manage prompt versions and templates
      - Support for tracing LLM calls and interactions
      - Provides feedback collection mechanisms
      - Evaluations for measuring model performance

      This is a simplified response about LangSmith for: "${question}"
    `;
  },
  {
    name: "langsmith_info",
    description:
      "Provides information about LangSmith. For any questions about LangSmith, use this tool.",
    schema: z.object({
      question: z.string().describe("The user's question about LangSmith"),
    }),
  }
);

function setupAgent() {
  const tools = [webSearch, langSmithTool];

  // The checkpointer gives the agent short-term memory: pass the same
  // `thread_id` across invocations (see example.js) to keep the conversation.
  const checkpointer = new MemorySaver();

  // createAgent builds a LangGraph ReAct-style agent. This replaces the
  // legacy AgentExecutor / createToolCallingAgent / RunnableWithMessageHistory
  // stack from LangChain 0.x.
  const agent = createAgent({
    model,
    tools,
    systemPrompt: "You are a helpful assistant",
    checkpointer,
  });

  return agent;
}

// Export the setup function
export default setupAgent;
