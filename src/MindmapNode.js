// src/MindmapNode.js

import React, { memo, useState, useEffect, useContext } from 'react';
import { Handle, Position } from 'reactflow';
import { LayoutContext } from './App';

const MindmapNode = memo(({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const { layoutDirection } = useContext(LayoutContext);
  const isHorizontal = layoutDirection === 'horizontal';
  const targetHandlePosition = isHorizontal ? Position.Left : Position.Top;
  const sourceHandlePosition = isHorizontal ? Position.Right : Position.Bottom;

  useEffect(() => {
    if (data.isEditing) {
      setLabel(data.label);
      setIsEditing(true);
      data.updateNodeData(data.id, { ...data, isEditing: false });
    }
  }, [data.isEditing, data.id, data.label, data]);

  const handleDoubleClick = () => {
    setLabel(data.label);
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    data.updateNodeData(data.id, { ...data, label: label });
  };

  const handleChange = (e) => {
    setLabel(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setLabel(data.label);
      setIsEditing(false);
    }
  };

  return (
    <div onDoubleClick={handleDoubleClick} className={selected ? 'selected' : ''}>
      {isEditing ? (
        <input
          autoFocus
          value={label}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="mindmap-node-input"
        />
      ) : (
        <div>{data.label}</div>
      )}

      {data.id !== '1' && (
        <Handle
          type="target"
          position={targetHandlePosition}
          style={{ background: '#555' }}
        />
      )}
      
      <Handle
        type="source"
        position={sourceHandlePosition}
        style={{ background: '#555' }}
      />
    </div>
  );
});

export default MindmapNode;