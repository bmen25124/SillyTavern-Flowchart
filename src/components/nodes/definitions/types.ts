import { FC } from 'react';
import { Node, NodeProps, Edge } from '@xyflow/react';
import { z } from 'zod';
import { FlowDataType } from '../../../flow-types.js';
import { NodeExecutor } from '../../../NodeExecutor.js';

export interface ValidationIssue {
  fieldId?: string; // The ID of the field/handle that is invalid.
  message: string;
  severity: 'error' | 'warning';
}

export type HandleSpec = {
  id: string | null;
  type: FlowDataType;
  schema?: z.ZodType;
  label?: string;
};

export type GetHandleTypeParams = {
  handleId: string | null;
  handleDirection: 'input' | 'output';
  node: Node;
  nodes: Node[];
  edges: Edge[];
};

export interface NodeDefinition<T extends Node<Record<string, unknown>, string | undefined | any> | any = any> {
  type: string;
  label: string;
  category:
    | 'Trigger'
    | 'Logic'
    | 'Input'
    | 'Picker'
    | 'API Request'
    | 'Chat'
    | 'Character'
    | 'Lorebook'
    | 'JSON'
    | 'Utility'
    | 'Data Processing'
    | 'Math & Logic'
    | 'System'
    | 'Variables'
    | 'User Interaction';
  // @ts-ignore
  component: FC<NodeProps<Node<T>>>;
  dataSchema: z.ZodType<T>;
  initialData: T;
  currentVersion: number;
  handles: {
    inputs: HandleSpec[];
    outputs: HandleSpec[];
  };
  execute: NodeExecutor;
  /**
   * Optional function to perform semantic validation on the node's data and connections.
   * @returns An array of validation issues. An empty array means the node is valid.
   */
  // @ts-ignore
  validate?: (node: Node<T>, edges: Edge[]) => ValidationIssue[];
  /**
   * A flag indicating that this node can execute arbitrary code and requires user permission.
   */
  isDangerous?: boolean;
  /**
   * Optional function to dynamically determine the data type of a handle.
   * This is used for nodes with dynamic handles (e.g., based on data or connections).
   * If not provided, the static `handles` array is used as a fallback.
   */
  getHandleType?: (params: GetHandleTypeParams) => FlowDataType | undefined;
  /**
   * Optional function to get a list of dynamic handles based on the node's data.
   * This is used by the UI to suggest compatible nodes when creating new connections.
   */
  getDynamicHandles?: (
    // @ts-ignore
    node: Node<T>,
    allNodes: Node[],
    allEdges: Edge[],
  ) => { inputs: HandleSpec[]; outputs: HandleSpec[] };
  /**
   * Generates a unique ID for a dynamic handle based on an index.
   */
  getDynamicHandleId?: (index: number) => string;
  /**
   * Checks if a given handle ID belongs to a dynamic handle set for this node.
   */
  isDynamicHandle?: (handleId: string | null) => boolean;
}

export type BaseNodeDefinition<T = any> = Omit<NodeDefinition<T>, 'component'>;
