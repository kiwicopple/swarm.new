"use client";

import { Bug, Workflow, Cpu, Zap, Shield, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkerTest } from '@/components/test/worker-test';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gradient-to-br from-secondary/20 via-background to-primary/10">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <Bug className="w-16 h-16 text-primary mx-auto animate-pulse" />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Digital Bees Swarm
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Build powerful AI workflows locally with our swarm intelligence system. 
            Connect agents like bees in a hive to process, transform, and generate content.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Workflow className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Visual Workflow Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Drag and drop agents to create complex workflows with React Flow
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Cpu className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Local AI Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Run transformer models locally with Transformers.js - no cloud required
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Bug className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Agent Types</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Scout, Worker, Queen, Builder, Guard, and Messenger agents
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Zap className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Real-time Execution</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Watch your swarm come alive with animated execution visualization
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Shield className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Privacy First</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Everything runs locally - your data never leaves your device
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Package className="w-8 h-8 text-primary mb-2" />
              <CardTitle>Export & Import</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Save and share your workflow swarms as JSON files
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Create a new swarm from the sidebar to get started</p>
        </div>

        {/* Debug: Worker Test */}
        <div className="mt-8">
          <WorkerTest />
        </div>
      </div>
    </div>
  );
}