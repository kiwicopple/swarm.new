"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSwarmStore } from "@/lib/storage/swarm-store";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ModelManager } from "@/components/swarm/model-manager";

export function Sidebar() {
  const router = useRouter();
  const {
    swarms,
    currentSwarmId,
    loadSwarms,
    createSwarm,
    deleteSwarm,
    setCurrentSwarm,
  } = useSwarmStore();

  // Always show the create swarm section
  const [newSwarmName, setNewSwarmName] = useState("");
  const [newSwarmDesc, setNewSwarmDesc] = useState("");

  useEffect(() => {
    loadSwarms();
  }, [loadSwarms]);

  const handleCreateSwarm = async () => {
    if (!newSwarmName.trim()) return;
    const swarm = await createSwarm(
      newSwarmName,
      newSwarmDesc || "A new swarm workflow"
    );
    setNewSwarmName("");
    setNewSwarmDesc("");
    router.push(`/swarm/${swarm.id}`);
    setCurrentSwarm(swarm.id);
  };

  const handleSelectSwarm = (swarmId: string) => {
    setCurrentSwarm(swarmId);
    router.push(`/swarm/${swarmId}`);
  };

  const handleDeleteSwarm = async (e: React.MouseEvent, swarmId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this swarm?")) {
      await deleteSwarm(swarmId);
      if (currentSwarmId === swarmId) {
        router.push("/");
      }
    }
  };

  return (
    <div className="w-80 h-screen bg-secondary/10 border-r border-border p-4 overflow-y-auto flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <Bug className="w-6 h-6 text-primary" />
          Digital Bees
        </h2>
        <p className="text-sm text-muted-foreground">
          Build AI workflow swarms locally
        </p>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">
          Create Swarm
        </h3>
        <Card>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Swarm name"
              value={newSwarmName}
              onChange={(e) => setNewSwarmName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSwarm()}
              autoFocus
            />
            <Input
              placeholder="Description (optional)"
              value={newSwarmDesc}
              onChange={(e) => setNewSwarmDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSwarm()}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreateSwarm} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
              <Button
                onClick={() => {
                  setNewSwarmName("");
                  setNewSwarmDesc("");
                }}
                size="sm"
                variant="outline"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2 flex-1">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">
          Your Swarms
        </h3>
        {swarms.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No swarms yet. Create your first one!
          </p>
        ) : (
          swarms.map((swarm) => (
            <Card
              key={swarm.id}
              className={cn(
                "cursor-pointer transition-colors hover:bg-accent/50",
                currentSwarmId === swarm.id && "bg-accent border-primary"
              )}
              onClick={() => handleSelectSwarm(swarm.id)}
            >
              <CardHeader className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-medium">
                      {swarm.name}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {swarm.description}
                    </CardDescription>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {swarm.workflow.nodes.length} nodes
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(swarm.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={(e) => handleDeleteSwarm(e, swarm.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* AI Models Section */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">
            AI Models
          </h3>
          <p className="text-xs text-muted-foreground">
            Load models to power your agents
          </p>
        </div>
        <ModelManager />
      </div>
    </div>
  );
}
