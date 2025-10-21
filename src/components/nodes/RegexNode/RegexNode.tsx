import { FC, useState, useEffect, useMemo } from 'react';
import { NodeProps, Node } from '@xyflow/react';
import { useFlowStore } from '../../popup/flowStore.js';
import { RegexNodeData } from './definition.js';
import { BaseNode } from '../BaseNode.js';
import { STSelect, STTextarea, STFancyDropdown } from 'sillytavern-utils-lib/components';
import { RegexScriptData } from 'sillytavern-utils-lib/types/regex';
import { NodeHandleRenderer } from '../NodeHandleRenderer.js';
import { createFieldConfig } from '../fieldConfig.js';
import { registrator } from '../autogen-imports.js';

export type RegexNodeProps = NodeProps<Node<RegexNodeData>>;

export const RegexNode: FC<RegexNodeProps> = ({ id, selected, type }) => {
  const data = useFlowStore((state) => state.nodesMap.get(id)?.data) as RegexNodeData;
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const [allRegexes, setAllRegexes] = useState<RegexScriptData[]>([]);
  const definition = registrator.nodeDefinitionMap.get(type);

  useEffect(() => {
    const loadedRegexes = SillyTavern.getContext().extensionSettings.regex ?? [];
    setAllRegexes(loadedRegexes);
  }, []);

  const regexOptions = useMemo(() => allRegexes.map((r) => ({ value: r.id, label: r.scriptName })), [allRegexes]);
  const mode = data?.mode ?? 'sillytavern';

  const fields = useMemo(() => {
    const commonFields = [
      createFieldConfig({
        id: 'string',
        label: 'Input String',
        component: STTextarea,
        props: { rows: 3 },
      }),
      createFieldConfig({
        id: 'mode',
        label: 'Mode',
        component: STSelect,
        props: {
          children: (
            <>
              <option value="sillytavern">SillyTavern</option>
              <option value="custom">Custom</option>
            </>
          ),
        },
      }),
    ];

    const modeSpecificFields =
      mode === 'sillytavern'
        ? [
            createFieldConfig({
              id: 'scriptId',
              label: 'Regex Script',
              component: STFancyDropdown,
              props: {
                items: regexOptions,
                multiple: false,
                inputClasses: 'nodrag',
                containerClasses: 'nodrag nowheel',
                closeOnSelect: true,
                enableSearch: true,
              },
              getValueFromEvent: (e: string[]) => e[0],
              formatValue: (value) => [value ?? ''],
            }),
          ]
        : [
            createFieldConfig({
              id: 'findRegex',
              label: 'Find (Regex)',
              component: STTextarea,
              props: { rows: 2 },
            }),
            createFieldConfig({
              id: 'replaceString',
              label: 'Replace',
              component: STTextarea,
              props: { rows: 2 },
            }),
          ];

    return [...commonFields, ...modeSpecificFields];
  }, [mode, regexOptions]);

  if (!data || !definition) return null;

  return (
    <BaseNode id={id} title="Regex" selected={selected}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <NodeHandleRenderer
          nodeId={id}
          definition={definition}
          type="input"
          fields={fields}
          data={data}
          updateNodeData={updateNodeData}
        />
      </div>
      <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px solid #555' }}>
        <NodeHandleRenderer nodeId={id} definition={definition} type="output" />
      </div>
    </BaseNode>
  );
};
