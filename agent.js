// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Serper } from "@langchain/community/tools/serper";
import { ChatMessageHistory } from "@langchain/community/stores/message/in_memory";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { createToolCallingAgent } from "langchain/agents";
import { AgentExecutor } from "langchain/agents";
import { tool } from "@langchain/core/tools";

// Check for required API keys
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

if (!process.env.SERPER_API_KEY) {
  throw new Error("SERPER_API_KEY environment variable is required");
}

// For self-signed certifiactes in the SSL chain
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

// Define proxy URL
const proxyUrl = `http://${process.env.PROXY_USERNAME}:${process.env.PROXY_PASSWORD}@webproxy.prod.d003.loc:8080`;
// Create proxy agents for HTTP and HTTPS
const proxyAgent = new HttpsProxyAgent(proxyUrl);

// Initialize the model
const model = new ChatOpenAI({
  temperature: 0,
  configuration: {
    // apiKey: process.env.OPENAI_API_KEY,
    // baseURL: "https://api.openai.com/v1",
    httpAgent: proxyAgent
  }
});

// Create a simple LangSmith information tool
const langSmithTool = tool(
  async (input) => {
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
    description: "Provides information about LangSmith. For any questions about LangSmith, use this tool.",
  }
);

async function setupAgent() {
  // Initialize the SerpAPI tool
  const search = new Serper();
  
  // Define the tools
  const tools = [search, langSmithTool];

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
