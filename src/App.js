// src/App.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Background,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import './index.css';

import MindmapNode from './MindmapNode';

const nodeTypes = { mindmapNode: MindmapNode };

const initialNodes = [
  { id: '1', type: 'mindmapNode', data: { id: '1', label: '새로운 생각' }, position: { x: 0, y: 0 } },
];
const initialEdges = [];

const getLayoutedElements = (nodes, edges, direction) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    const isHorizontal = direction === 'horizontal';
    dagreGraph.setGraph({ rankdir: isHorizontal ? 'LR' : 'TB', nodesep: 30, ranksep: 120 });
    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 180, height: 50 });
    });
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });
    dagre.layout(dagreGraph);
    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return { ...node, position: { x: nodeWithPosition.x - 180 / 2, y: nodeWithPosition.y - 50 / 2 } };
    });
    return { nodes: layoutedNodes, edges };
};

const MindmapLayout = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();

  const [theme, setTheme] = useState('light');
  const [layoutDirection, setLayoutDirection] = useState('horizontal');
  const [showImportModal, setShowImportModal] = useState(false);
  const importTextRef = useRef(null);
  const [isHelpCollapsed, setIsHelpCollapsed] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  
  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes(nds =>
      nds.map(node =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
  }, [setNodes]);

  const applyLayout = useCallback((nds, eds, dir) => {
    const nodesWithData = nds.map(n => ({ 
      ...n, 
      data: { ...n.data, updateNodeData, layoutDirection: dir } 
    }));
    const { nodes: layoutedNodes } = getLayoutedElements(nodesWithData, eds, dir);
    setNodes(layoutedNodes);
    setEdges(eds);
    window.requestAnimationFrame(() => fitView({ duration: 300 }));
  }, [setNodes, setEdges, fitView, updateNodeData]);

  useEffect(() => {
    applyLayout(initialNodes, initialEdges, layoutDirection);
  }, [layoutDirection, applyLayout]);
  
  const addNode = useCallback((isSibling = false) => {
    const selectedNode = nodes.find(n => n.selected);
    if (!selectedNode) { alert('기준이 될 노드를 먼저 선택해주세요.'); return; }
    const parentId = isSibling ? edges.find(e => e.target === selectedNode.id)?.source : selectedNode.id;
    if (isSibling && !parentId) { alert('중심 노드에는 형제 노드를 추가할 수 없습니다.'); return; }
    const newNodeId = `${Date.now()}`;
    const newNode = { id: newNodeId, type: 'mindmapNode', data: { id: newNodeId, label: '새로운 생각' }, position: { x: 0, y: 0 } };
    const newEdge = { id: `e${parentId}-${newNodeId}`, source: parentId, target: newNodeId };
    applyLayout(nodes.concat(newNode), edges.concat(newEdge), layoutDirection);
  }, [nodes, edges, layoutDirection, applyLayout]);
  
  const resetCanvas = useCallback(() => {
    const isConfirmed = window.confirm('정말 모든 내용을 삭제하고 초기화하시겠습니까?');
    if (isConfirmed) {
      applyLayout(initialNodes, initialEdges, layoutDirection);
    }
  }, [layoutDirection, applyLayout]);

  const exportToText = useCallback(() => {
    try {
      const dataToSave = JSON.stringify({
        layoutDirection,
        nodes: nodes.map(({ id, type, data, position }) => ({ id, type, data: { label: data.label, id: data.id }, position })),
        edges,
      }, null, 2);
      navigator.clipboard.writeText(dataToSave).then(() => { alert('마인드맵 데이터가 클립보드에 복사되었습니다.'); });
    } catch (e) { console.error(e); }
  }, [nodes, edges, layoutDirection]);

  const exportToCsv = useCallback(() => {
    if (nodes.length <= 1 && nodes[0]?.data.label === '새로운 생각') {
      alert('내보낼 데이터가 없습니다.');
      return;
    }
    const nodeMap = new Map(nodes.map(node => [node.id, node.data.label]));
    const childrenMap = new Map();
    edges.forEach(edge => {
      if (!childrenMap.has(edge.source)) childrenMap.set(edge.source, []);
      childrenMap.get(edge.source).push(edge.target);
    });
    const paths = [];
    const findPaths = (nodeId, currentPath) => {
      const children = childrenMap.get(nodeId);
      if (!children || children.length === 0) {
        paths.push([...currentPath]);
        return;
      }
      children.forEach(childId => {
        const childLabel = nodeMap.get(childId);
        if(childLabel !== undefined) findPaths(childId, [...currentPath, childLabel]);
      });
    };
    const rootLabel = nodeMap.get('1');
    if(rootLabel !== undefined) findPaths('1', [rootLabel]);
    const groupedRows = [];
    let previousPath = [];
    let maxDepth = 0;
    paths.forEach(currentPath => {
      if (currentPath.length > maxDepth) maxDepth = currentPath.length;
      const newRow = [];
      let firstDifferenceFound = false;
      for (let i = 0; i < currentPath.length; i++) {
        if (!firstDifferenceFound && i < previousPath.length && currentPath[i] === previousPath[i]) {
          newRow.push('');
        } else {
          firstDifferenceFound = true;
          newRow.push(currentPath[i]);
        }
      }
      groupedRows.push(newRow);
      previousPath = currentPath;
    });
    const header = Array.from({ length: maxDepth }, (_, i) => `Level ${i + 1}`).join(',');
    const csvRows = groupedRows.map(row => {
      const paddedRow = [...row];
      while (paddedRow.length < maxDepth) paddedRow.push('');
      return paddedRow.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(',');
    });
    const csvContent = `${header}\n${csvRows.join('\n')}`;
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'mindmap.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [nodes, edges]);

  const importFromText = useCallback(() => {
    const text = importTextRef.current.value;
    if (!text) { alert('붙여넣을 텍스트를 입력해주세요.'); return; }
    try {
      const data = JSON.parse(text);
      if (data && data.nodes && data.edges && data.layoutDirection) {
        setLayoutDirection(data.layoutDirection);
        setShowImportModal(false);
        applyLayout(data.nodes, data.edges, data.layoutDirection);
      } else { alert('올바른 형식의 데이터가 아닙니다.'); }
    } catch (e) { console.error(e); }
  }, [applyLayout]);
  
  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  const toggleLayoutDirection = useCallback(() => {
    const isConfirmed = window.confirm(
      "레이아웃 방향을 바꾸면 현재 작업 내용이 초기화됩니다. 계속하시겠습니까?"
    );
    if (isConfirmed) {
      setLayoutDirection(currentDirection => 
        currentDirection === 'horizontal' ? 'vertical' : 'horizontal'
      );
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
        const selectedNode = nodes.find(n => n.selected);
        
        const activeElement = document.activeElement;
        if (activeElement.nodeName === 'INPUT' || activeElement.nodeName === 'TEXTAREA') return;

        if (event.key.startsWith('Arrow')) {
            event.preventDefault();
            if (!selectedNode) return;
            const parentEdge = edges.find(e => e.target === selectedNode.id);
            const childrenEdges = edges.filter(e => e.source === selectedNode.id);
            const siblingsEdges = parentEdge ? edges.filter(e => e.source === parentEdge.source) : [];
            const currentIndex = siblingsEdges.findIndex(e => e.target === selectedNode.id);
            let targetNodeId = null;
            if (event.key === 'ArrowUp') {
                if (layoutDirection === 'vertical' && parentEdge) targetNodeId = parentEdge.source;
                else if (currentIndex > 0) targetNodeId = siblingsEdges[currentIndex - 1].target;
            } else if (event.key === 'ArrowDown') {
                if (layoutDirection === 'vertical' && childrenEdges.length > 0) targetNodeId = childrenEdges[0].target;
                else if (currentIndex < siblingsEdges.length - 1) targetNodeId = siblingsEdges[currentIndex + 1].target;
            } else if (event.key === 'ArrowLeft') {
                if (layoutDirection === 'horizontal' && parentEdge) targetNodeId = parentEdge.source;
            } else if (event.key === 'ArrowRight') {
                if (layoutDirection === 'horizontal' && childrenEdges.length > 0) targetNodeId = childrenEdges[0].target;
            }
            if (targetNodeId) setNodes(nds => nds.map(n => ({ ...n, selected: n.id === targetNodeId })));
            return;
        }
        
        switch(event.key) {
            case 'Tab': event.preventDefault(); addNode(); break;
            case 'Delete': 
            case 'Backspace': 
              if (selectedNode) {
                if (selectedNode.id === '1') {
                  alert('중심 노드는 삭제할 수 없습니다.');
                  return;
                }
                const parentEdge = edges.find(e => e.target === selectedNode.id);
                const parentId = parentEdge ? parentEdge.source : null;
                const nodesToDelete = new Set();
                const queue = [selectedNode.id];
                while (queue.length > 0) {
                  const currentNodeId = queue.shift();
                  if (nodesToDelete.has(currentNodeId)) continue;
                  nodesToDelete.add(currentNodeId);
                  const children = edges.filter(edge => edge.source === currentNodeId).map(edge => edge.target);
                  queue.push(...children);
                }
                let remainingNodes = nodes.filter(n => !nodesToDelete.has(n.id));
                const remainingEdges = edges.filter(e => !nodesToDelete.has(e.source) && !nodesToDelete.has(e.target));
                if (parentId) {
                  remainingNodes = remainingNodes.map(n => ({ ...n, selected: n.id === parentId }));
                }
                setNodes(remainingNodes);
                setEdges(remainingEdges);
              }
              break;
            case 'F2':
                event.preventDefault();
                if (selectedNode) updateNodeData(selectedNode.id, { isEditing: true });
                break;
            default:
                if (isCtrlOrCmd && (event.key === 's' || event.key === 'S')) { event.preventDefault(); exportToText(); }
                else if (isCtrlOrCmd && (event.key === 'o' || event.key === 'O')) { event.preventDefault(); setShowImportModal(true); }
                break;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, layoutDirection, addNode, exportToText, updateNodeData, setNodes, setEdges]);
  
  return (
    <div className={`mindmap-container ${theme}`}>
      <div className={`top-left-header ${isHeaderCollapsed ? 'collapsed' : ''}`}>
        <div className="header-title-bar" onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}>
          <h1>내가 쓸려고 만든 마인드 맵 드로잉 툴</h1>
          <button className="collapse-button">{isHeaderCollapsed ? '▼' : '▲'}</button>
        </div>
        <div className="header-content">
          <p>
            그냥 생각 정리한다고 마인드 맵 툴 좀 쓰려니까 뭔 놈의 회원가입을 하라그러고 돈내라그러고 보안때매 쓰지 말라그러고!
            <br />
            빡쳐서 만들었습니다. 로그인 없고 돈내라 안하고 보안 신경쓸필요 없게 저장도 안되게 했으니까 편히 쓰세요.
            <br />
            대신 광고 두개만 붙이겠습니다.... 시간나면 한번씩 눌러주세여... 만들었는데 돈은 벌어야죠...
            <br /><br />
            - 스크립트 복사/붙여넣기로 저장/불러오기<br />
            - CSV 형태로 내보내기
            <br /><br />
            수정이나 개선 필요한점 있으면 인스타로 연락주세여 {' '}
            <a href="https://www.instagram.com/Im_Group_Instagram" target="_blank" rel="noopener noreferrer">@Im_Group_Instagram</a>
          </p>
        </div>
      </div>
      
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={nodeTypes} key={layoutDirection} fitView>
        <Background />
      </ReactFlow>
      
      <div className={`help-panel ${isHelpCollapsed ? 'collapsed' : ''}`}>
        <div className="help-panel-header" onClick={() => setIsHelpCollapsed(!isHelpCollapsed)}>
          <h3>도움말</h3>
          <button className="collapse-button">{isHelpCollapsed ? '▼' : '▲'}</button>
        </div>
        <div className="help-panel-content">
          <ul>
            <li><span>텍스트 편집</span><span>더블클릭 / <kbd>F2</kbd></span></li>
            <li><span>자식 노드 추가</span><kbd>Tab</kbd></li>
            <li><span>노드 삭제</span><kbd>Delete</kbd></li>
            <li><span>노드 선택 이동</span><span><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd></span></li>
            <li><span>내보내기</span><span><kbd>Ctrl</kbd>+<kbd>S</kbd></span></li>
            <li><span>불러오기</span><span><kbd>Ctrl</kbd>+<kbd>O</kbd></span></li>
          </ul>
        </div>
      </div>

      <div className="control-panel">
        <button onClick={() => addNode()} title="새 노드 추가 (Tab)">+</button>
        <button onClick={exportToText} title="텍스트로 복사 (Ctrl+S)">📋</button>
        <button onClick={importFromText} title="붙여넣어 불러오기 (Ctrl+O)">📥</button>
        <button onClick={resetCanvas} title="전체 삭제">🗑️</button>
        <button onClick={exportToCsv} title="CSV로 내보내기">📊</button>
        <button onClick={toggleTheme} title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button onClick={toggleLayoutDirection} title={`노드 배열 방향 (현재: ${layoutDirection === 'horizontal' ? '좌->우' : '상->하'})`}>
          {layoutDirection === 'horizontal' ? '→' : '↓'}
        </button>
      </div>
      
      {showImportModal && (
        <div className="import-modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="import-modal" onClick={(e) => e.stopPropagation()}>
            <h2>마인드맵 데이터 붙여넣기</h2>
            <textarea ref={importTextRef} placeholder="이곳에 복사한 텍스트를 붙여넣으세요..."></textarea>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => setShowImportModal(false)}>취소</button>
              <button className="confirm-btn" onClick={importFromText}>불러오기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ReactFlowProvider>
      <MindmapLayout />
    </ReactFlowProvider>
  );
}