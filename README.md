# 🐝 Digital Bees Swarm

A visual workflow builder for creating AI-powered automation swarms that run entirely in your browser.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![React Flow](https://img.shields.io/badge/React%20Flow-12-purple)
![Transformers.js](https://img.shields.io/badge/Transformers.js-Ready-green)

## 🌟 Features

### ✅ Currently Implemented
- **Visual Workflow Builder** - Drag-and-drop interface with React Flow
- **6 Agent Types** - Specialized bee agents for different tasks
- **Swarm Management** - Create, edit, and delete workflow swarms
- **Local Storage** - All workflows saved locally with Zustand
- **Bee-Themed UI** - Honeycomb-inspired design with amber colors

### 🚧 In Development (See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md))
- **Local AI Processing** - Transformers.js integration
- **Workflow Execution** - Run swarms with real AI models
- **Agent Configuration** - Customize each bee's behavior
- **Data Flow System** - Type-safe connections between nodes
- **Live Animations** - Bee flight paths during execution

## 🏃 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Visit `http://localhost:3000` to start building your swarm!

## 🐝 Agent Types

| Agent | Icon | Purpose | Examples |
|-------|------|---------|----------|
| **Scout** | 🔍 | Input & Data Fetching | Text input, File upload, URL fetch |
| **Worker** | 🔨 | Processing & Transformation | Text processing, Math, Parsing |
| **Queen** | 👑 | Decision Making | Routing, Classification, Conditionals |
| **Builder** | 🔧 | Content Generation | Text generation, Summarization, Translation |
| **Guard** | 🛡️ | Validation & Security | Schema validation, Content filtering |
| **Messenger** | 📤 | Output & Communication | Display, Download, Notifications |

## 🎯 Implementation Roadmap

### Phase 1: Configuration System 📋
Build the UI for configuring individual agent nodes

### Phase 2: AI Integration 🤖
Integrate Transformers.js for local model execution

### Phase 3: Data Flow 🔄
Implement typed connections between nodes

### Phase 4: Execution Engine ⚡
Build the workflow execution system

### Phase 5: Agent Logic 🐝
Implement specific functionality for each agent type

### Phase 6: UI Polish 🎨
Add animations and visual feedback

### Phase 7: Advanced Features 🚀
Templates, import/export, debugging tools

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│         React Flow Canvas           │
│  ┌─────┐  ┌─────┐  ┌─────┐        │
│  │Scout│──▶│Worker│──▶│Builder│     │
│  └─────┘  └─────┘  └─────┘        │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│      Execution Engine               │
│  • DAG Traversal                    │
│  • Node Handlers                    │
│  • State Management                 │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│      Transformers.js                │
│  • Local AI Models                  │
│  • Web Workers                      │
│  • Model Caching                    │
└─────────────────────────────────────┘
```

## 💾 Data Storage

All data is stored locally in your browser:
- **Workflows** - LocalForage (IndexedDB)
- **AI Models** - Cached in IndexedDB
- **Execution Results** - Session storage

## 🧪 Development

```bash
# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📦 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Workflow**: React Flow
- **State**: Zustand
- **Storage**: LocalForage
- **AI**: Transformers.js (planned)
- **Icons**: Lucide React

## 🤝 Contributing

This is a proof-of-concept project. Feel free to fork and extend!

## 📄 License

MIT

---

Built with 🍯 by the Digital Bees