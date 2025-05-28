import type { Node, Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';

const position = { x: 0, y: 0 };
const edgeType = 'smoothstep';
 
export const initialNodes: Node[] = [
  {
    id: 'cs1101s',
    type: 'input',
    data: { label: 'CS1101S Programming Methodology' },
    position,
  },
  {
    id: 'cs1231s',
    type: 'input',
    data: { label: 'CS1231S Discrete Structures' },
    position,
  },
  {
    id: 'ma1521',
    type: 'input',
    data: { label: 'MA1521 Calculus for Computing' },
    position,
  },
  {
    id: 'cs2101',
    type: 'input',
    data: { label: 'CS2101 Effective Communication for Computing Professionals' },
    position,
  },
  {
    id: 'ma1522',
    type: 'input',
    data: { label: 'MA1522 Linear Algebra for Computing' },
    position,
  },  
  {
    id: 'cs2030s',
    data: { label: 'CS2030S Programming Methodology II' },
    position,
  },
  {
    id: 'cs2040s',
    data: { label: 'CS2040S Data Structures and Algorithms' },
    position,
  },
  {
    id: 'cs2100',
    data: { label: 'CS2100 Computer Organisation' },
    position,
  },
  {
    id: 'st2334',
    data: { label: 'ST2334 Probability and Statistics' },
    position,
  },  
  {
    id: 'cs2103t',
    data: { label: 'CS2103T Software Engineering' },
    position,
  },
  {
    id: 'cs2106',
    data: { label: 'CS2106 Introduction to Operating Systems' },
    position,
  },
  {
    id: 'cs2109s',
    data: { label: 'CS2109S Introduction to AI and Machine Learning' },
    position,
  },
  
  // Advanced modules
  {
    id: 'cs3230',
    type: 'output',
    data: { label: 'CS3230 Design and Analysis of Algorithms' },
    position,
  },
];
 
export const initialEdges: Edge[] = [
  // CS1101S prerequisites
  { 
    id: 'cs1101s-cs2030s', 
    source: 'cs1101s', 
    target: 'cs2030s', 
    type: edgeType, 
    animated: true, 
    markerEnd: { 
      type: MarkerType.ArrowClosed,
      color: '#6b7280'
    } 
  },
  { 
    id: 'cs1101s-cs2040s', 
    source: 'cs1101s', 
    target: 'cs2040s', 
    type: edgeType, 
    animated: true, 
    markerEnd: { 
      type: MarkerType.ArrowClosed,
      color: '#6b7280'
    } 
  },
  { 
    id: 'cs1101s-cs2100', 
    source: 'cs1101s', 
    target: 'cs2100', 
    type: edgeType, 
    animated: true, 
    markerEnd: { 
      type: MarkerType.ArrowClosed,
      color: '#6b7280'
    } 
  },
  
  // CS1231S prerequisites
  { 
    id: 'cs1231s-cs2040s', 
    source: 'cs1231s', 
    target: 'cs2040s', 
    type: edgeType, 
    animated: true, 
    markerEnd: { 
      type: MarkerType.ArrowClosed,
      color: '#6b7280'
    } 
  },
  { 
    id: 'cs1231s-cs2109s', 
    source: 'cs1231s', 
    target: 'cs2109s', 
    type: edgeType, 
    animated: true, 
    markerEnd: { 
      type: MarkerType.ArrowClosed,
      color: '#6b7280'
    } 
  },
  { 
    id: 'cs1231s-cs3230', 
    source: 'cs1231s', 
    target: 'cs3230', 
    type: edgeType, 
    animated: true, 
    markerEnd: { 
      type: MarkerType.ArrowClosed,
      color: '#6b7280'
    } 
  },
  
  // MA1521 prerequisites
  { 
    id: 'ma1521-st2334', 
    source: 'ma1521', 
    target: 'st2334', 
    type: edgeType, 
    animated: true, 
    markerEnd: { 
      type: MarkerType.ArrowClosed,
      color: '#6b7280'
    } 
  },
  { 
    id: 'ma1521-cs2109s', 
    source: 'ma1521', 
    target: 'cs2109s', 
    type: edgeType, 
    animated: true, 
    markerEnd: { 
      type: MarkerType.ArrowClosed,
      color: '#6b7280'
    } 
  },
  
  // CS2030S prerequisites
  { 
    id: 'cs2030s-cs2103t', 
    source: 'cs2030s', 
    target: 'cs2103t', 
    type: edgeType, 
    animated: true, 
    markerEnd: { 
      type: MarkerType.ArrowClosed,
      color: '#6b7280'
    } 
  },
  
  // CS2040S prerequisites
  { 
    id: 'cs2040s-cs2103t', 
    source: 'cs2040s', 
    target: 'cs2103t', 
    type: edgeType, 
    animated: true, 
    markerEnd: { 
      type: MarkerType.ArrowClosed,
      color: '#6b7280'
    } 
  },
  { 
    id: 'cs2040s-cs2109s', 
    source: 'cs2040s', 
    target: 'cs2109s', 
    type: edgeType, 
    animated: true, 
    markerEnd: { 
      type: MarkerType.ArrowClosed,
      color: '#6b7280'
    } 
  },
  { 
    id: 'cs2040s-cs3230', 
    source: 'cs2040s', 
    target: 'cs3230', 
    type: edgeType, 
    animated: true, 
    markerEnd: { 
      type: MarkerType.ArrowClosed,
      color: '#6b7280'
    } 
  },
  
  // CS2100 prerequisites
  { 
    id: 'cs2100-cs2106', 
    source: 'cs2100', 
    target: 'cs2106', 
    type: edgeType, 
    animated: true, 
    markerEnd: { 
      type: MarkerType.ArrowClosed,
      color: '#6b7280'
    } 
  },
];