"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function WorkerTest() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState<string | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);

  const testWorkerCreation = () => {
    setStatus('testing-creation');
    setError(null);
    
    try {
      console.log('Attempting to create worker...');
      const newWorker = new Worker('/ai-worker.js');
      
      newWorker.onmessage = (event) => {
        console.log('Worker message received:', event.data);
        setStatus('worker-responsive');
      };
      
      newWorker.onerror = (error) => {
        console.error('Worker error:', error);
        setError(`Worker error: ${error.message || 'Unknown error'}`);
        setStatus('error');
      };
      
      newWorker.onmessageerror = (error) => {
        console.error('Worker message error:', error);
        setError(`Worker message error: ${error.message || 'Unknown error'}`);
        setStatus('error');
      };
      
      setWorker(newWorker);
      setStatus('worker-created');
      console.log('Worker created successfully');
      
    } catch (err) {
      console.error('Failed to create worker:', err);
      setError(`Failed to create worker: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const testWorkerMessage = () => {
    if (!worker) {
      setError('No worker available');
      return;
    }
    
    setStatus('testing-message');
    setError(null);
    
    try {
      console.log('Sending test message to worker...');
      worker.postMessage({
        id: 'test-1',
        type: 'ping'
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const checkWorkerFile = async () => {
    setStatus('checking-file');
    setError(null);
    
    try {
      console.log('Checking if worker file exists...');
      const response = await fetch('/ai-worker.js');
      
      if (response.ok) {
        const content = await response.text();
        console.log('Worker file found, length:', content.length);
        setStatus('file-exists');
      } else {
        setError(`Worker file not found: ${response.status}`);
        setStatus('error');
      }
    } catch (err) {
      console.error('Failed to fetch worker file:', err);
      setError(`Failed to fetch worker file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  };

  const cleanup = () => {
    if (worker) {
      worker.terminate();
      setWorker(null);
    }
    setStatus('idle');
    setError(null);
  };

  const getStatusColor = () => {
    switch (status) {
      case 'idle': return 'bg-gray-100 text-gray-800';
      case 'file-exists':
      case 'worker-created':
      case 'worker-responsive': return 'bg-green-100 text-green-800';
      case 'checking-file':
      case 'testing-creation':
      case 'testing-message': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Web Worker Test</h2>
      
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="font-medium">Status:</span>
          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor()}`}>
            {status}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button onClick={checkWorkerFile} variant="outline">
            1. Check Worker File
          </Button>
          
          <Button onClick={testWorkerCreation} variant="outline">
            2. Create Worker
          </Button>
          
          <Button 
            onClick={testWorkerMessage} 
            variant="outline"
            disabled={!worker}
          >
            3. Test Message
          </Button>
          
          <Button onClick={cleanup} variant="destructive">
            Cleanup
          </Button>
        </div>

        <div className="bg-gray-50 border rounded-lg p-4">
          <h3 className="font-medium mb-2">Debug Info:</h3>
          <ul className="text-sm space-y-1 text-gray-600">
            <li>Worker URL: /ai-worker.js</li>
            <li>Browser: {typeof window !== 'undefined' ? navigator.userAgent.split(')')[0] + ')' : 'SSR'}</li>
            <li>Worker Support: {typeof Worker !== 'undefined' ? 'Yes' : 'No'}</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}