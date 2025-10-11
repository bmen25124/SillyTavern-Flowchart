export interface SpecNode {
  id: string;
  type: string;
  data: any;
}

export interface SpecEdge {
  id: string;
  source: string;
  sourceHandle: string | null;
  target: string;
  targetHandle: string | null;
}

export interface SpecFlow {
  nodes: SpecNode[];
  edges: SpecEdge[];
}
