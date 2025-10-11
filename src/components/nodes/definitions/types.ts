import { FC } from 'react';
import { Node, NodeProps, Edge } from '@xyflow/react';
import { z } from 'zod';
import { FlowDataType } from '../../../flow-types.js';

export type HandleSpec = {
  id: string | null;
  type: FlowDataType;
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
  category: 'Trigger' | 'Logic' | 'Input' | 'Messaging' | 'Character' | 'Lorebook' | 'JSON' | 'Utility';
  // @ts-ignore
  component: FC<NodeProps<Node<T>>>;
  dataSchema: z.ZodType<T>;
  initialData: T;
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
}
