import type { NodeProps } from '@xyflow/react';
import type { StudioNode } from '../../../lib/studio/types.js';
import { UnifiedNode } from './UnifiedNode.js';

export function StartNode(props: NodeProps<StudioNode>) {
  return (
    <UnifiedNode
      {...props}
      iconName="Play"
      colorClass="bg-green-500 text-green-600"
      headerTitle="Start"
      inputs={0}
      outputs={1}
    />
  );
}

export function EndNode(props: NodeProps<StudioNode>) {
  return (
    <UnifiedNode
      {...props}
      iconName="Square"
      colorClass="bg-red-500 text-red-600"
      headerTitle="End"
      inputs={1}
      outputs={0}
    />
  );
}

export function PromptNode(props: NodeProps<StudioNode>) {
  return (
    <UnifiedNode
      {...props}
      iconName="MessageSquare"
      colorClass="bg-iris text-iris"
      headerTitle="Prompt"
    />
  );
}

export function ConditionNode(props: NodeProps<StudioNode>) {
  return (
    <UnifiedNode
      {...props}
      iconName="GitBranch"
      colorClass="bg-orange-500 text-orange-600"
      headerTitle="Condition"
      outputs={2}
    />
  );
}

export function ToolNode(props: NodeProps<StudioNode>) {
  return (
    <UnifiedNode
      {...props}
      iconName="Wrench"
      colorClass="bg-brand text-brand-ink dark:text-brand"
      headerTitle="Tool"
    />
  );
}

export function LlmNode(props: NodeProps<StudioNode>) {
  return (
    <UnifiedNode
      {...props}
      iconName="BrainCircuit"
      colorClass="bg-purple-500 text-purple-600"
      headerTitle="LLM Provider"
    />
  );
}

export function VoiceNode(props: NodeProps<StudioNode>) {
  return (
    <UnifiedNode
      {...props}
      iconName="Mic"
      colorClass="bg-pink-500 text-pink-600"
      headerTitle="Voice Configuration"
    />
  );
}

export function QuestionNode(props: NodeProps<StudioNode>) {
  return (
    <UnifiedNode
      {...props}
      iconName="HelpCircle"
      colorClass="bg-teal-500 text-teal-600"
      headerTitle="Question"
      outputs={2}
    />
  );
}

export function SwitchNode(props: NodeProps<StudioNode>) {
  return (
    <UnifiedNode
      {...props}
      iconName="Split"
      colorClass="bg-yellow-500 text-yellow-600"
      headerTitle="Switch"
      outputs={3}
    />
  );
}

export function MemoryNode(props: NodeProps<StudioNode>) {
  return (
    <UnifiedNode
      {...props}
      iconName="Database"
      colorClass="bg-emerald-500 text-emerald-600"
      headerTitle="Memory"
    />
  );
}

export function KnowledgeNode(props: NodeProps<StudioNode>) {
  return (
    <UnifiedNode
      {...props}
      iconName="BookOpen"
      colorClass="bg-cyan-500 text-cyan-600"
      headerTitle="Knowledge Base"
    />
  );
}

export function HumanHandoffNode(props: NodeProps<StudioNode>) {
  return (
    <UnifiedNode
      {...props}
      iconName="Headphones"
      colorClass="bg-rose-500 text-rose-600"
      headerTitle="Human Handoff"
      outputs={0}
    />
  );
}
