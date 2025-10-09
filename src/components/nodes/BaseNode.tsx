import React, { FC, ReactNode } from 'react';
import { NodeResizer } from '@xyflow/react';
import { useFlow } from '../popup/FlowContext.js';
import { STButton } from 'sillytavern-utils-lib/components';

type BaseNodeProps = {
  id: string;
  title: string;
  children: ReactNode;
  selected: boolean;
};

export const BaseNode: FC<BaseNodeProps> = ({ id, title, children, selected }) => {
  const { duplicateNode } = useFlow();

  return (
    <div
      style={{
        border: '1px solid #777',
        padding: '10px',
        background: '#333',
        fontSize: '12px',
        width: '100%',
        height: '100%',
        minWidth: 180,
      }}
    >
      <NodeResizer isVisible={selected} minWidth={180} minHeight={50} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <label>{title}</label>
        <STButton onClick={() => duplicateNode(id)}>Duplicate</STButton>
      </div>
      {children}
    </div>
  );
};
