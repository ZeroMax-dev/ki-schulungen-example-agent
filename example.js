import setupAgent from './agent.js';

// Helper: pull the text out of the agent's final message.
function lastReply(result) {
  const message = result.messages[result.messages.length - 1];
  return typeof message.content === "string"
    ? message.content
    : JSON.stringify(message.content);
}

async function main() {
  console.log("Setting up the agent...");
  const agent = setupAgent();
  console.log("Agent ready!");

  // Reuse the same thread_id so the agent remembers the conversation.
  const config = { configurable: { thread_id: "user-123" } };

  // First interaction
  console.log("\n--- First interaction ---");
  console.log("User: Hi! I'm Bob");
  const result1 = await agent.invoke(
    { messages: [{ role: "user", content: "Hi! I'm Bob" }] },
    config
  );
  console.log("Assistant:", lastReply(result1));

  // Follow-up question with preserved chat history
  console.log("\n--- Follow-up question ---");
  console.log("User: What's my name?");
  const result2 = await agent.invoke(
    { messages: [{ role: "user", content: "What's my name?" }] },
    config
  );
  console.log("Assistant:", lastReply(result2));

  // Search question using the web_search (Serper) tool
  console.log("\n--- Search question ---");
  console.log("User: What's the current population of Germany?");
  const result3 = await agent.invoke(
    { messages: [{ role: "user", content: "What's the current population of Germany?" }] },
    config
  );
  console.log("Assistant:", lastReply(result3));

  // LangSmith related question for the langsmith_info tool
  console.log("\n--- LangSmith question ---");
  console.log("User: What is LangSmith used for?");
  const result4 = await agent.invoke(
    { messages: [{ role: "user", content: "What is LangSmith used for?" }] },
    config
  );
  console.log("Assistant:", lastReply(result4));
}

// Run the example
main().catch(error => {
  console.error("Error in example:", error);
});
