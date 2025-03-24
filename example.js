import setupAgent from './agent.js';

async function main() {
  console.log("Setting up the agent...");
  const agent = await setupAgent();
  console.log("Agent ready!");
  
  // Using a consistent session ID for this conversation
  const sessionId = "user-123";
  
  // First interaction
  console.log("\n--- First interaction ---");
  console.log("User: Hi! I'm Bob");
  const result1 = await agent.invoke(
    { input: "Hi! I'm Bob" },
    { configurable: { sessionId } }
  );
  console.log("Assistant:", result1.output);
  
  // Follow-up question with preserved chat history
  console.log("\n--- Follow-up question ---");
  console.log("User: What's my name?");
  const result2 = await agent.invoke(
    { input: "What's my name?" },
    { configurable: { sessionId } }
  );
  console.log("Assistant:", result2.output);
  
  // Search question using Google Serper
  console.log("\n--- Search question ---");
  console.log("User: What's the current population of Germany?");
  const result3 = await agent.invoke(
    { input: "What's the current population of Germany?" },
    { configurable: { sessionId } }
  );
  console.log("Assistant:", result3.output);
  
  // LangSmith related question for the retriever tool
  console.log("\n--- LangSmith question ---");
  console.log("User: What is LangSmith used for?");
  const result4 = await agent.invoke(
    { input: "What is LangSmith used for?" },
    { configurable: { sessionId } }
  );
  console.log("Assistant:", result4.output);
}

// Run the example
main().catch(error => {
  console.error("Error in example:", error);
});
