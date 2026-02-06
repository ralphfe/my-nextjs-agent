import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

// Schema definitions
const userQuerySchema = z.object({
  query: z.string().describe('The user query to process'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('Previous conversation messages for context'),
});

const intentClassificationSchema = z.object({
  query: z.string().describe('Original user query'),
  intent: z.enum(['product', 'content', 'mixed']).describe('The classified intent type'),
  productQuery: z.string().optional().describe('Extracted product-related query'),
  contentQuery: z.string().optional().describe('Extracted content-related query'),
  confidence: z.number().describe('Confidence score 0-1'),
  reasoning: z.string().describe('Reasoning for the classification'),
});

const agentResponsesSchema = z.object({
  query: z.string().describe('Original user query'),
  intent: z.enum(['product', 'content', 'mixed']).describe('The classified intent type'),
  productResponse: z.string().describe('Response from Product Agent'),
  contentResponse: z.string().describe('Response from Content Agent'),
});

const finalResponseSchema = z.object({
  response: z.string().describe('The final synthesized response to the user'),
  intent: z.string().describe('The detected intent'),
  sources: z.array(z.string()).describe('Sources used to generate the response'),
});

/**
 * Step 1: Classify User Intent
 * Analyzes the user query to determine if it's product-related, content-related, or mixed
 */
const classifyIntent = createStep({
  id: 'classify-intent',
  description: 'Classifies user intent to route to appropriate agent',
  inputSchema: userQuerySchema,
  outputSchema: intentClassificationSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const agent = mastra?.getAgent('routingAgent');
    if (!agent) {
      throw new Error('Routing agent not found');
    }

    const classificationPrompt = `Analyze the following user query and classify the intent.

User Query: "${inputData.query}"

Classify the intent as one of:
- "product": User wants product information, pricing, availability, or store locations
- "content": User wants inspiration, tips, advice, articles, or editorial content
- "mixed": User wants both product information AND content/inspiration

Respond in JSON format only, no other text:
{
  "intent": "product" | "content" | "mixed",
  "productQuery": "extracted product-related part of query (if applicable)",
  "contentQuery": "extracted content-related part of query (if applicable)",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of classification"
}`;

    const response = await agent.generate([
      {
        role: 'user',
        content: classificationPrompt,
      },
    ]);

    // Parse the JSON response
    const jsonMatch = response.text.match(/\{[\s\S]*}/);
    if (!jsonMatch) {
      // Default to mixed if parsing fails
      return {
        query: inputData.query,
        intent: 'mixed' as const,
        productQuery: inputData.query,
        contentQuery: inputData.query,
        confidence: 0.5,
        reasoning: 'Failed to parse intent, defaulting to mixed',
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        query: inputData.query,
        intent: parsed.intent || 'mixed',
        productQuery: parsed.productQuery,
        contentQuery: parsed.contentQuery,
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'No reasoning provided',
      };
    } catch {
      return {
        query: inputData.query,
        intent: 'mixed' as const,
        productQuery: inputData.query,
        contentQuery: inputData.query,
        confidence: 0.5,
        reasoning: 'JSON parsing failed, defaulting to mixed',
      };
    }
  },
});

/**
 * Step 2: Fetch Agent Responses
 * Queries the appropriate agents based on classified intent
 */
const fetchAgentResponses = createStep({
  id: 'fetch-agent-responses',
  description: 'Fetches responses from Product and/or Content agents based on intent',
  inputSchema: intentClassificationSchema,
  outputSchema: agentResponsesSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    let productResponse = '';
    let contentResponse = '';

    // Fetch product information if needed
    if (inputData.intent === 'product' || inputData.intent === 'mixed') {
      const productAgent = mastra?.getAgent('productAgent');
      if (productAgent && inputData.productQuery) {
        const response = await productAgent.generate([
          {
            role: 'user',
            content: inputData.productQuery,
          },
        ]);
        productResponse = response.text;
      }
    }

    // Fetch content information if needed
    if (inputData.intent === 'content' || inputData.intent === 'mixed') {
      const contentAgent = mastra?.getAgent('contentAgent');
      if (contentAgent && inputData.contentQuery) {
        const response = await contentAgent.generate([
          {
            role: 'user',
            content: inputData.contentQuery,
          },
        ]);
        contentResponse = response.text;
      }
    }

    return {
      query: inputData.query,
      intent: inputData.intent,
      productResponse,
      contentResponse,
    };
  },
});

/**
 * Step 3: Synthesize Response
 * Combines responses from product and content agents into a unified response
 */
const synthesizeResponse = createStep({
  id: 'synthesize-response',
  description: 'Synthesizes final response from agent outputs',
  inputSchema: agentResponsesSchema,
  outputSchema: finalResponseSchema,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const sources: string[] = [];

    // For single-intent queries, return the appropriate response directly
    if (inputData.intent === 'product' && inputData.productResponse) {
      sources.push('Product Catalog');
      return {
        response: inputData.productResponse,
        intent: 'product',
        sources,
      };
    }

    if (inputData.intent === 'content' && inputData.contentResponse) {
      sources.push('Editorial Content');
      return {
        response: inputData.contentResponse,
        intent: 'content',
        sources,
      };
    }

    // For mixed intent, synthesize both responses
    const routingAgent = mastra?.getAgent('routingAgent');
    if (!routingAgent) {
      // Fallback: concatenate responses
      if (inputData.productResponse) sources.push('Product Catalog');
      if (inputData.contentResponse) sources.push('Editorial Content');

      const combinedResponse = [
        inputData.contentResponse ? `## Inspiration & Tips\n\n${inputData.contentResponse}` : '',
        inputData.productResponse ? `## Product Recommendations\n\n${inputData.productResponse}` : '',
      ].filter(Boolean).join('\n\n---\n\n');

      return {
        response: combinedResponse || 'I couldn\'t find relevant information for your query.',
        intent: 'mixed',
        sources,
      };
    }

    // Use routing agent to synthesize a cohesive response
    const synthesisPrompt = `You received responses from two specialized agents for the user's query: "${inputData.query}"

Product Agent Response:
${inputData.productResponse || 'No product information available.'}

Content Agent Response:
${inputData.contentResponse || 'No content information available.'}

Please synthesize these into a single, cohesive response that:
1. Flows naturally and doesn't feel like two separate responses
2. Leads with the most relevant information based on the user's query
3. Clearly distinguishes between product recommendations and inspiration/tips
4. Is helpful and actionable

Provide a well-formatted response:`;

    const response = await routingAgent.generate([
      {
        role: 'user',
        content: synthesisPrompt,
      },
    ]);

    if (inputData.productResponse) sources.push('Product Catalog');
    if (inputData.contentResponse) sources.push('Editorial Content');

    return {
      response: response.text,
      intent: 'mixed',
      sources,
    };
  },
});

/**
 * Commerce Routing Workflow
 *
 * This workflow orchestrates the commerce routing architecture:
 * 1. Classifies user intent (product, content, or mixed)
 * 2. Routes to appropriate sub-agents
 * 3. Synthesizes responses into a unified answer
 */
const commerceRoutingWorkflow = createWorkflow({
  id: 'commerce-routing-workflow',
  inputSchema: userQuerySchema,
  outputSchema: finalResponseSchema,
})
  .then(classifyIntent)
  .then(fetchAgentResponses)
  .then(synthesizeResponse);

commerceRoutingWorkflow.commit();

export { commerceRoutingWorkflow };
