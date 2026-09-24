import { getBezierPath, BaseEdge, EdgeProps } from '@xyflow/react';
import { StudioEdge as StudioEdgeType } from '../../../lib/studio/types';

export function StudioEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  selected,
  data,
  markerEnd,
}: EdgeProps<StudioEdgeType>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isFallback = data?.isFallback;

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? '#6366f1' : (isFallback ? '#f97316' : '#94a3b8'),
          strokeDasharray: isFallback ? '5,5' : 'none',
        }} 
      />
      {data?.condition && (
        <foreignObject
          width={120}
          height={40}
          x={labelX - 60}
          y={labelY - 20}
          className="overflow-visible pointer-events-none"
        >
          <div className="flex items-center justify-center w-full h-full">
            <div className={`px-2 py-1 text-[10px] font-semibold text-white rounded-full shadow-sm ${isFallback ? 'bg-orange-500' : 'bg-slate-700'}`}>
              {data.condition}
            </div>
          </div>
        </foreignObject>
      )}
    </>
  );
}
