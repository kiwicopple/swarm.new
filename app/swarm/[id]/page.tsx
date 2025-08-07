"use client";

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { WorkflowCanvas } from '@/components/swarm/workflow-canvas';
import { useSwarmStore } from '@/lib/storage/swarm-store';

export default function SwarmPage() {
  const params = useParams();
  const swarmId = params.id as string;
  const { setCurrentSwarm, getCurrentSwarm } = useSwarmStore();

  useEffect(() => {
    setCurrentSwarm(swarmId);
  }, [swarmId, setCurrentSwarm]);

  const swarm = getCurrentSwarm();

  if (!swarm) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Swarm not found</p>
      </div>
    );
  }

  return <WorkflowCanvas swarm={swarm} />;
}