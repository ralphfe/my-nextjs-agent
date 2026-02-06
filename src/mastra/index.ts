import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { MongoDBStore } from '@mastra/mongodb';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { commerceRoutingWorkflow } from './workflows/commerce-routing-workflow';
import { routingAgent, productAgent, contentAgent } from './agents';

export const mastra = new Mastra({
  workflows: { commerceRoutingWorkflow },
  agents: { routingAgent, productAgent, contentAgent },
  storage: new MongoDBStore({
    id: 'mongodb-storage',
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DATABASE!,
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(),
          new CloudExporter(),
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(),
        ],
      },
    },
  }),
});
