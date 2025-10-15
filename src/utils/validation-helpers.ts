import { Node, Edge } from '@xyflow/react';
import { ValidationIssue } from '../components/nodes/definitions/types.js';

export function createRequiredFieldValidator(fieldId: string, message: string) {
  return (node: Node, edges: Edge[]): ValidationIssue | undefined => {
    const data = node.data as Record<string, any>;
    const isConnected = edges.some((e) => e.target === node.id && e.targetHandle === fieldId);
    if (!data[fieldId] && data[fieldId] !== 0 && !isConnected) {
      return { fieldId, message, severity: 'error' };
    }
    return undefined;
  };
}

export function createRequiredConnectionValidator(handleId: string, message: string) {
  return (_node: Node, edges: Edge[]): ValidationIssue | undefined => {
    const isConnected = edges.some((e) => e.target === _node.id && e.targetHandle === handleId);
    if (!isConnected) {
      return { message, severity: 'error' };
    }
    return undefined;
  };
}

export function combineValidators(...validators: ((node: Node, edges: Edge[]) => ValidationIssue | undefined)[]) {
  return (node: Node, edges: Edge[]): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    for (const validator of validators) {
      const issue = validator(node, edges);
      if (issue) {
        issues.push(issue);
      }
    }
    return issues;
  };
}
