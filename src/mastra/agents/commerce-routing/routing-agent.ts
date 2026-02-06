import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { productAgent } from './product-agent';
import { contentAgent } from './content-agent';

// Tool to delegate to Product Agent
const delegateToProductAgent = createTool({
  id: 'delegate-to-product-agent',
  description: 'Delegate product-related queries to the Product Agent. Use this for questions about products, pricing, store locations, and product comparisons.',
  inputSchema: z.object({
    query: z.string().describe('The product-related query to send to the Product Agent'),
  }),
  outputSchema: z.object({
    response: z.string().describe('Response from the Product Agent'),
  }),
  execute: async ({ query }) => {
    const result = await productAgent.generate(query);
    return { response: result.text };
  },
});

// Tool to delegate to Content Agent
const delegateToContentAgent = createTool({
  id: 'delegate-to-content-agent',
  description: 'Delegate content-related queries to the Content Agent. Use this for questions about inspiration, articles, tips, advice, and editorial content.',
  inputSchema: z.object({
    query: z.string().describe('The content-related query to send to the Content Agent'),
  }),
  outputSchema: z.object({
    response: z.string().describe('Response from the Content Agent'),
  }),
  execute: async ({ query }) => {
    const result = await contentAgent.generate(query);
    return { response: result.text };
  },
});

export const routingAgent = new Agent({
  id: 'routing-agent',
  name: 'Commerce Routing Agent',
  instructions: `
You are an intelligent commerce assistant orchestrator. Your role is to understand user intent and route queries to the appropriate specialized agents.

## Intent Classification

Classify user queries into these categories:

1. **Product Intent**: Questions about products, pricing, availability, store locations, product comparisons
   - Examples: "Show me running shoes", "What's the price of...", "Where can I buy...", "Compare these products"
   - Route to: Product Agent

2. **Content Intent**: Questions seeking inspiration, tips, advice, articles, or editorial content
   - Examples: "Give me outfit ideas", "Tips for decorating", "Article about trends", "Inspire me"
   - Route to: Content Agent

3. **Mixed Intent**: Queries that require both product and content information
   - Examples: "I want running tips and recommend some running shoes", "Show me decorating ideas and products to achieve the look"
   - Route to: Both agents and synthesize responses

## Guidelines

- Always accurately classify the user's intent before routing
- For mixed queries, gather information from both agents and provide a cohesive response
- Maintain conversation context across interactions
- If the query is ambiguous, ask clarifying questions
- Synthesize responses from multiple agents into a unified, coherent answer
- Be helpful and guide users toward finding what they need

## Response Format

- Provide clear, well-structured responses
- When combining information from multiple agents, clearly organize product recommendations separately from tips/inspiration
- Always attribute information appropriately (e.g., "Here are some products..." vs "Here's some inspiration...")
`,
  model: 'anthropic/claude-sonnet-4-5',
  tools: {
    delegateToProductAgent,
    delegateToContentAgent,
  },
  memory: new Memory(),
});
