import { z } from 'zod';
import { NodeDefinition } from '../definitions/types.js';
import { FlowDataType, RegexNodeDataSchema } from '../../../flow-types.js';
import { RegexNode } from './RegexNode.js';
import { registrator } from '../registrator.js';
import { NodeExecutor } from '../../../NodeExecutor.js';
import { resolveInput } from '../../../utils/node-logic.js';

const execute: NodeExecutor = async (node, input, { dependencies }) => {
  const data = RegexNodeDataSchema.parse(node.data);
  const mode = resolveInput(input, data, 'mode') ?? 'sillytavern';
  const scriptId = resolveInput(input, data, 'scriptId');
  const { findRegex, replaceString } = data;
  const inputString = input.string ?? '';
  if (typeof inputString !== 'string') throw new Error('Input must be a string.');

  let result = inputString;
  let matches: string[] | null = null;
  let finalFindRegex: string | undefined;

  if (mode === 'sillytavern') {
    if (!scriptId) throw new Error('SillyTavern Regex ID is not provided.');
    const { extensionSettings } = dependencies.getSillyTavernContext();
    const script = (extensionSettings.regex ?? []).find((r: any) => r.id === scriptId);
    if (!script) throw new Error(`Regex with ID "${scriptId}" not found.`);
    result = dependencies.st_runRegexScript(script, inputString);
    finalFindRegex = script.findRegex;
  } else {
    if (findRegex === undefined) throw new Error('Find Regex is required for custom mode.');
    try {
      const regex = new RegExp(findRegex, 'g');
      result = inputString.replace(regex, replaceString ?? '');
      finalFindRegex = findRegex;
    } catch (e: any) {
      throw new Error(`Invalid custom regex: ${e.message}`);
    }
  }

  if (finalFindRegex) {
    try {
      matches = inputString.match(new RegExp(finalFindRegex, 'g'));
    } catch (e: any) {
      // Ignore
    }
  }

  return { result, matches: matches ?? [] };
};

export const regexNodeDefinition: NodeDefinition = {
  type: 'regexNode',
  label: 'Regex',
  category: 'Utility',
  component: RegexNode,
  dataSchema: RegexNodeDataSchema,
  currentVersion: 1,
  initialData: { mode: 'sillytavern', findRegex: '', replaceString: '', scriptId: '', _version: 1 },
  handles: {
    inputs: [
      { id: 'string', type: FlowDataType.STRING },
      { id: 'mode', type: FlowDataType.STRING },
      { id: 'scriptId', type: FlowDataType.STRING },
    ],
    outputs: [
      { id: 'result', type: FlowDataType.STRING },
      { id: 'matches', type: FlowDataType.OBJECT, schema: z.array(z.string()) },
    ],
  },
  execute,
};

registrator.register(regexNodeDefinition);
