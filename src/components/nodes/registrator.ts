import { NodeDefinition } from './definitions/types.js';
import { NodeExecutor } from '../../NodeExecutor.js';
import { FC } from 'react';
import { Node, NodeProps } from '@xyflow/react';

class Registrator {
  public readonly nodeTypes: Record<string, FC<NodeProps<Node<any>>>> = {};
  public readonly nodeDefinitionMap = new Map<string, NodeDefinition>();
  public readonly nodeExecutors = new Map<string, NodeExecutor>();
  public readonly allNodeDefinitions: NodeDefinition[] = [];

  public register(definition: NodeDefinition): void {
    if (this.nodeDefinitionMap.has(definition.type)) {
      console.warn(`Node type "${definition.type}" is being registered more than once. The last one wins.`);
    }
    this.nodeTypes[definition.type] = definition.component;
    this.nodeDefinitionMap.set(definition.type, definition);
    this.nodeExecutors.set(definition.type, definition.execute);
    this.allNodeDefinitions.push(definition);
  }
}

// Export a single instance for the whole application to use.
export const registrator = new Registrator();
