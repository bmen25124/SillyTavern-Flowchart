import { FC } from 'react';
import { Node, NodeProps, Edge } from '@xyflow/react';
import { z } from 'zod';
import { FlowDataType } from '../../../flow-types.js';

export type HandleSpec = {
  id: string | null;
  type: FlowDataType;
  schema?: z.ZodType;
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
    | 'Utility';
  // @ts-ignore
  component: FC<NodeProps<Node<T>>>;
  dataSchema: z.ZodType<T>;
  initialData: T;
  currentVersion: number;
  handles: {
    inputs: HandleSpec[];
    outputs: HandleSpec[];
  };
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
