import React from 'react';
import { AgentPipelineBoard } from './agent-database/AgentPipelineBoard';

export const AgentPipeline: React.FC = () => {
  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-navy-600">New Agent Pipeline</h1>
        <p className="text-gray-600 mt-1">Track agents through the contracting process</p>
      </div>
      <div className="flex-1 min-h-0">
        <AgentPipelineBoard />
      </div>
    </div>
  );
};
