// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatMessageHistory } from "@langchain/community/stores/message/in_memory";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { createToolCallingAgent } from "langchain/agents";
import { AgentExecutor } from "langchain/agents";

// Check for required API keys
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

if (!process.env.SERPER_API_KEY) {
  throw new Error("SERPER_API_KEY environment variable is required");
}

// Initialize the model
const model = new ChatOpenAI({
  temperature: 0,
});

// Create a custom search tool using the Google Serper API
const serperSearchTool = tool(
  async ({ input }) => {
    console.log(`Searching for: ${input}`);
    const apiKey = process.env.SERPER_API_KEY;
    const url = 'https://google.serper.dev/search';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ q: input })
      });

      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract and format the search results
      let results = [];
      
      if (data.organic && data.organic.length > 0) {
        results = data.organic.slice(0, 5).map(item => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet
        }));
      }
      
      return JSON.stringify(results);
    } catch (error) {
      console.error('Error during search:', error);
      return `Error performing search: ${error.message}`;
    }
  },
  {
    name: "google_search",
    description: "Search Google for information using the Serper API.",
    schema: z.object({
      input: z.string().describe("The search query to look up information online"),
    }),
  }
);

// Create a custom LangSmith information tool as a simple tool
const langSmithTool = tool(
  async ({ input }) => {
    // For simplicity, we'll just return some static information about LangSmith
    return `
      LangSmith is a comprehensive platform designed for developing, evaluating, and monitoring large language model (LLM) applications. 
      
      Key features:
      - Debug and optimize LLM applications
      - Monitor and track LLM performance
      - Manage prompt versions and templates
      - Support for tracing LLM calls and interactions
      - Provides feedback collection mechanisms
      - Evaluations for measuring model performance
      
      This is a simplified response about LangSmith for: "${input}"
    `;
  },
  {
    name: "langsmith_info",
    description: "Provides information about LangSmith. For any questions about LangSmith, you must use this tool!",
    schema: z.object({
      input: z.string().describe("The question about LangSmith"),
    }),
  }
);

async function setupAgent() {
  // Define the tools
  const tools = [serperSearchTool, langSmithTool];

  // Create the prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful assistant"],
    ["placeholder", "{chat_history}"],
    ["human", "{input}"],
    ["placeholder", "{agent_scratchpad}"],
  ]);

  // Create the agent
  const agent = await createToolCallingAgent({ 
    llm: model, 
    tools, 
    prompt 
  });

  // Create the agent executor
  const agentExecutor = new AgentExecutor({
    agent,
    tools,
  });

  // Set up the message history store
  const store = {};

  function getMessageHistory(sessionId) {
    if (!(sessionId in store)) {
      store[sessionId] = new ChatMessageHistory();
    }
    return store[sessionId];
  }

  // Create the agent with chat history
  const agentWithChatHistory = new RunnableWithMessageHistory({
    runnable: agentExecutor,
    getMessageHistory,
    inputMessagesKey: "input",
    historyMessagesKey: "chat_history",
  });

  return agentWithChatHistory;
}

// Export the setup function
export default setupAgent;
