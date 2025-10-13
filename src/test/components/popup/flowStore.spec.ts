import { useFlowStore } from '../../../components/popup/flowStore.js';
import { SpecFlow } from '../../../flow-spec.js';

describe('useFlowStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { loadFlow } = useFlowStore.getState();
    loadFlow({ nodes: [], edges: [] });
  });

  it('should initialize with empty nodes and edges', () => {
    const { nodes, edges } = useFlowStore.getState();
    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });

  it('should load a flow from spec', () => {
    const flow: SpecFlow = {
      nodes: [{ id: '1', type: 'stringNode', data: { value: 'test', _version: 1 }, position: { x: 10, y: 20 } }],
      edges: [],
    };
    const { loadFlow, nodes } = useFlowStore.getState();
    loadFlow(flow);
    const updatedNodes = useFlowStore.getState().nodes;
    expect(updatedNodes).toHaveLength(1);
    expect(updatedNodes[0]).toMatchObject({ id: '1', data: { value: 'test' } });
  });

  it('should update node data', () => {
    const flow: SpecFlow = {
      nodes: [{ id: '1', type: 'stringNode', data: { value: 'initial', _version: 1 }, position: { x: 0, y: 0 } }],
      edges: [],
    };
    useFlowStore.getState().loadFlow(flow);
    useFlowStore.getState().updateNodeData('1', { value: 'updated' });
    const node = useFlowStore.getState().nodes.find((n) => n.id === '1');
    expect(node?.data.value).toBe('updated');
  });

  it('should duplicate a node', () => {
    const flow: SpecFlow = {
      nodes: [{ id: '1', type: 'stringNode', data: { value: 'original', _version: 1 }, position: { x: 100, y: 100 } }],
      edges: [],
    };
    useFlowStore.getState().loadFlow(flow);
    useFlowStore.getState().duplicateNode('1');

    const { nodes } = useFlowStore.getState();
    expect(nodes).toHaveLength(2);
    const originalNode = nodes.find((n) => n.id === '1');
    const duplicatedNode = nodes.find((n) => n.id !== '1');

    expect(duplicatedNode).toBeDefined();
    expect(duplicatedNode?.id).not.toBe('1');
    expect(duplicatedNode?.data).toEqual({ value: 'original', _version: 1 });
    expect(duplicatedNode?.position).toEqual({ x: 150, y: 150 });
  });

  it('should convert state to SpecFlow correctly', () => {
    const flow: SpecFlow = {
      nodes: [
        {
          id: '1',
          type: 'stringNode',
          data: { value: 'test', _version: 1 },
          position: { x: 10, y: 20 },
          width: undefined,
          height: undefined,
        },
      ],
      edges: [],
    };
    useFlowStore.getState().loadFlow(flow);
    const spec = useFlowStore.getState().getSpecFlow();
    expect(spec.nodes).toHaveLength(1);
    expect(spec.nodes[0]).toEqual(expect.objectContaining(flow.nodes[0]));
  });
});
