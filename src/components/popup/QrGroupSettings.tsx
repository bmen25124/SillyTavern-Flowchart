import { FC, useMemo, useState, DragEvent } from 'react';
import { settingsManager } from '../../config.js';
import { QuickReplyTriggerNodeData } from '../nodes/QuickReplyTriggerNode/definition.js';
import { flowRunner } from '../../FlowRunner.js';

export const QrGroupSettings: FC = () => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const allGroups = useMemo(() => {
    const settings = settingsManager.getSettings();
    const groupSet = new Set<string>();
    settings.flows.forEach((flowData) => {
      flowData.flow.nodes.forEach((node) => {
        if (node.type === 'quickReplyTriggerNode') {
          const group = (node.data as QuickReplyTriggerNodeData).group;
          groupSet.add(group);
        }
      });
    });
    return Array.from(groupSet);
  }, []);

  const [orderedGroups, setOrderedGroups] = useState(() => {
    const savedOrder = settingsManager.getSettings().qrGroupOrder || [];
    const savedOrderSet = new Set(savedOrder);
    const unsavedGroups = allGroups.filter((g) => !savedOrderSet.has(g)).sort();
    return [...savedOrder.filter((g) => allGroups.includes(g)), ...unsavedGroups];
  });

  const handleDragStart = (e: DragEvent<HTMLLIElement>, group: string) => {
    setDraggedItem(group);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLLIElement>, targetGroup: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetGroup) return;

    const newOrderedGroups = [...orderedGroups];
    const draggedIndex = newOrderedGroups.indexOf(draggedItem);
    const targetIndex = newOrderedGroups.indexOf(targetGroup);

    // Remove the dragged item and insert it at the target position
    newOrderedGroups.splice(draggedIndex, 1);
    newOrderedGroups.splice(targetIndex, 0, draggedItem);

    setOrderedGroups(newOrderedGroups);
    settingsManager.getSettings().qrGroupOrder = newOrderedGroups;
    settingsManager.saveSettings();
    flowRunner.reinitialize();
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  return (
    <div className="flowchart-popup-section">
      <h3>Quick Reply Group Order</h3>
      <p>Drag and drop the group names to reorder the button rows in the Quick Reply bar.</p>
      <ul className="qr-group-settings-list">
        {orderedGroups.map((group) => (
          <li
            key={group}
            className={`qr-group-item ${draggedItem === group ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, group)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, group)}
            onDragEnd={handleDragEnd}
          >
            <i className="fa-solid fa-grip-vertical"></i>
            {group}
          </li>
        ))}
      </ul>
      {allGroups.length === 0 && <p>No QR Button triggers found in any enabled flows.</p>}
    </div>
  );
};
