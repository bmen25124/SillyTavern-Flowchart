import { FC } from 'react';
import { Node, NodeProps } from '@xyflow/react';
import { z } from 'zod';
import { FlowDataType } from '../../../flow-types.js';

export type HandleSpec = {
  id: string | null;
  type: FlowDataType;
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
}
