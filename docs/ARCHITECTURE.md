# System Architecture

Visual overview of how Easy MCP Server turns file-based handlers into REST APIs, MCP tools, and automations.

```mermaid
flowchart TD
    %% Node styles
    classDef boxPrimary fill:#fefce8,stroke:#facc15,stroke-width:2px,color:#27272a,font-size:12px,padding:12px;
    classDef cardBlue fill:#e0ecff,stroke:#4574d4,color:#0f172a,font-weight:600;
    classDef cardGreen fill:#e8f5e9,stroke:#5aa454,color:#1b4332,font-weight:600;
    classDef cardOrange fill:#ffe8d9,stroke:#f97316,color:#7c2d12,font-weight:600;
    classDef cardNeutral fill:#f5f5f5,stroke:#a7a7a7,color:#1f2937,font-weight:600;

    subgraph Server["Easy MCP Server"]
        direction TB
        subgraph MCPUmbrella["MCP Runtime"]
            direction LR
            Bridges["Bridge Loader<br/>External MCP Servers"]
            MCPServer["MCP Server<br/>JSON-RPC + Tool Execution"]
            ToolBuilder["Tool Builder<br/>Annotation Parser"]
        end

        subgraph CodeConfig["Code & Config"]
            direction LR
            Watcher["Hot Reload Watcher"]
            Nodes["n8n Generator<br/>npm run n8n:generate"]
            Handlers["Handlers<br/>api/**/*.ts"]
        end

        subgraph RestLayer["REST & Documentation"]
            direction LR
            Router["HTTP Router<br/>Express + Validation"]
            OpenAPI["OpenAPI & Swagger<br/>Auto-generated"]
        end
    end

    DataSources[(External APIs/DBs)]

    subgraph Clients["Clients"]
        direction LR
        Browser["Web UI<br/>(Swagger, Docs)"]
        Agent["AI Agents<br/>(Model Context Protocol)"]
        Automation["n8n Flows"]
    end

    %% Apply visual classes
    class Clients,Server boxPrimary
    class Browser,Agent,Automation cardBlue
    class Router,OpenAPI,MCPServer,ToolBuilder,Bridges cardGreen
    class Nodes,Handlers,Watcher cardOrange
    class DataSources cardNeutral
```

## Flows

Each diagram shows what happens after you add a handler under `api/`. Use them to trace hot reloads, REST calls, MCP tool executions, and generated n8n community nodes. The `Handler` participant represents the same generic handler shared across every interface.

### Hot Reload Flow

Tracks how a saved file propagates to new REST routes, OpenAPI docs, and MCP tool metadata without restarting the server.

```mermaid
sequenceDiagram
    autonumber
    participant Dev as Developer
    participant Watcher as File Watcher
    participant Loader as API Loader
    participant Router as HTTP Router
    participant OpenAPI as OpenAPI Spec
    participant MCP as MCP Server
    participant Tools as Tool Registry

    Dev->>Watcher: Save api/foo/get.ts
    Watcher->>Loader: Emit change event
    Loader->>Router: Rebuild route + validation
    Loader->>OpenAPI: Regenerate schema + docs
    Loader->>MCP: Push new metadata + args
    MCP->>Tools: Refresh MCP + bridge tools
    Router-->>Dev: Updated REST route ready
    Tools-->>Dev: Auto-reloaded MCP tools
```

### REST Flow

Reference request path for REST/HTTP consumers hitting the freshly generated endpoints.

```mermaid
sequenceDiagram
    autonumber
    participant Web as Web/UI Client
    participant Router as HTTP Router
    participant Docs as OpenAPI Docs
    participant Handler as Generic Handler
    participant Data as External APIs/DBs

    Web->>Router: Request /docs or /openapi.json
    Router-->>Docs: Serve Swagger assets
    Docs-->>Web: Render documentation
    Web->>Router: Invoke REST endpoint
    Router->>Handler: Validate + forward request
    Handler->>Data: Fetch / persist domain data
    Data-->>Handler: Return business data
    Handler-->>Web: REST response payload
```

### MCP Tool Flow

Details how an AI agent call travels through the MCP server, bridge/tool builder, and back out with JSON-RPC responses.

```mermaid
sequenceDiagram
    autonumber
    participant Agent as AI Agent
    participant MCP as MCP Server
    participant Tool as Tool Builder
    participant Handler as Generic Handler

    Agent->>MCP: tools/call request
    MCP->>Tool: Resolve annotations + schema
    Tool->>Handler: Execute handler with args
    Handler-->>Tool: Handler result
    Tool-->>MCP: Tool output (JSON-RPC)
    MCP-->>Agent: Response to calling agent
```

### n8n Community Node Flow

Illustrates generating a community node package, installing it into n8n, and using it inside workflows against your easy-mcp-server handlers.

```mermaid
sequenceDiagram
    autonumber
    participant Dev as Developer CLI
    participant Builder as n8n Node Builder
    participant Generator as Node Generator
    participant Package as npm Package
    participant n8n as n8n Instance
    participant Workflow as n8n Workflow
    participant Handler as Generic Handler

    Dev->>Builder: npm run n8n:generate
    Builder->>Generator: Convert routes to node ops
    Generator->>Package: Emit TS sources + package.json
    Package->>n8n: Install under ~/.n8n/custom
    n8n->>Workflow: Node appears in community nodes
    Workflow->>n8n: Use node inside workflow
    n8n->>Handler: Execute generated node call
    Handler-->>n8n: REST response back to workflow
```

