import { z } from 'zod';
import { Node, Edge } from '@xyflow/react';
import { NodeDefinition, ValidationIssue } from '../definitions/types.js';
import { FlowDataType } from '../../../flow-types.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';
import { HttpRequestNode } from './HttpRequestNode.js';

export const HttpRequestNodeDataSchema = z.object({
  url: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
  headers: z.string().default('{}'),
  body: z.string().default('{}'),
  _version: z.number().optional(),
});
export type HttpRequestNodeData = z.infer<typeof HttpRequestNodeDataSchema>;

const execute: NodeExecutor = async (node, input) => {
  const data = HttpRequestNodeDataSchema.parse(node.data);
  const url = resolveInput(input, data, 'url');
  if (!url) throw new Error('URL is required.');

  const method = resolveInput(input, data, 'method');
  const headersString = resolveInput(input, data, 'headers');
  const bodyString = resolveInput(input, data, 'body');

  let headers: Record<string, string> = {};
  try {
    const parsedHeaders = JSON.parse(headersString || '{}');
    if (typeof parsedHeaders === 'object' && parsedHeaders !== null) {
      headers = parsedHeaders;
    } else {
      throw new Error('Headers must be a JSON object.');
    }
  } catch (e: any) {
    throw new Error(`Invalid JSON in headers: ${e.message}`);
  }

  let body: BodyInit | null = null;
  if (method !== 'GET') {
    const connectedBody = input.body;
    if (connectedBody) {
      body = typeof connectedBody === 'object' ? JSON.stringify(connectedBody) : String(connectedBody);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    } else {
      try {
        JSON.parse(bodyString); // Check if it's valid JSON
        body = bodyString;
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } catch {
        body = bodyString; // Not JSON, send as plain text
      }
    }
  }

  try {
    const response = await fetch(url, { method, headers, body });
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseBody: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${JSON.stringify(responseBody)}`);
    }

    return {
      responseBody,
      statusCode: response.status,
      headers: responseHeaders,
    };
  } catch (e: any) {
    throw new Error(`HTTP request failed: ${e.message}`);
  }
};

export const httpRequestNodeDefinition: NodeDefinition<HttpRequestNodeData> = {
  type: 'httpRequestNode',
  label: 'HTTP Request',
  category: 'Utility',
  component: HttpRequestNode,
  dataSchema: HttpRequestNodeDataSchema,
  currentVersion: 1,
  initialData: { method: 'GET', url: 'https://api.example.com/data', headers: '{}', body: '{}' },
  isDangerous: true,
  handles: {
    inputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'url', type: FlowDataType.STRING },
      { id: 'method', type: FlowDataType.STRING },
      { id: 'headers', type: FlowDataType.OBJECT },
      { id: 'body', type: FlowDataType.ANY },
    ],
    outputs: [
      { id: 'main', type: FlowDataType.ANY },
      { id: 'responseBody', type: FlowDataType.ANY },
      { id: 'statusCode', type: FlowDataType.NUMBER },
      { id: 'headers', type: FlowDataType.OBJECT },
    ],
  },
  validate: (node: Node<HttpRequestNodeData>, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    if (!node.data.url && !edges.some((edge) => edge.target === node.id && edge.targetHandle === 'url')) {
      issues.push({ fieldId: 'url', message: 'URL is required.', severity: 'error' });
    }
    return issues;
  },
  execute,
};

registrator.register(httpRequestNodeDefinition);
