# FAZA 3 - Visual Diagrams

## System Architecture Diagrams

### High-Level System Context

```mermaid
graph TB
    User[User Browser]
    Dashboard[Next.js Dashboard]
    API[API Routes]
    DB[(Supabase PostgreSQL)]
    RT[Supabase Realtime]
    SMS[NotifyHub SMS Gateway]

    User -->|HTTPS| Dashboard
    Dashboard -->|REST API| API
    Dashboard <-->|WebSocket| RT
    API -->|SQL + RLS| DB
    RT -->|DB Changes| DB
    API -->|REST API| SMS

    style Dashboard fill:#3b82f6
    style DB fill:#10b981
    style RT fill:#f59e0b
    style SMS fill:#ef4444
```

### Component Architecture

```mermaid
graph TB
    subgraph "Dashboard Page"
        Manager[RemindersManager]
        Toolbar[RemindersToolbar]
        Filters[RemindersFilters]
        Table[RemindersTable]
        Actions[BulkActions]

        Manager --> Toolbar
        Manager --> Filters
        Manager --> Table
        Manager --> Actions
    end

    subgraph "Hooks Layer"
        UseReminders[useReminders]
        UseRealtime[useRealtimeReminders]
        UseCreate[useCreateReminder]
        UseUpdate[useUpdateReminder]
        UseDelete[useDeleteReminder]

        Manager --> UseReminders
        Manager --> UseRealtime
        Manager --> UseCreate
        Manager --> UseUpdate
        Manager --> UseDelete
    end

    subgraph "API Layer"
        Client[API Client]
        Errors[Error Handler]

        UseReminders --> Client
        UseCreate --> Client
        UseUpdate --> Client
        UseDelete --> Client
        Client --> Errors
    end

    subgraph "Backend"
        Routes[API Routes]
        Supabase[(Supabase)]

        Client --> Routes
        Routes --> Supabase
        UseRealtime --> Supabase
    end

    style Manager fill:#3b82f6
    style UseReminders fill:#10b981
    style Client fill:#f59e0b
    style Routes fill:#ef4444
```

---

## Data Flow Diagrams

### Create Reminder Flow (Optimistic Update)

```mermaid
sequenceDiagram
    participant User
    participant UI as RemindersManager
    participant Hook as useCreateReminder
    participant Cache as React Query Cache
    participant API as API Route
    participant DB as Database
    participant RT as Realtime

    User->>UI: Click "Create"
    UI->>Hook: createReminder(data)

    Note over Hook: onMutate
    Hook->>Cache: Cancel queries
    Hook->>Cache: Get current data
    Hook->>Cache: Optimistic update
    Hook->>UI: Show new reminder (temp ID)

    Note over Hook: API Call
    Hook->>API: POST /api/reminders
    API->>DB: INSERT reminder

    alt Success
        DB-->>API: New reminder (real ID)
        API-->>Hook: Success response

        Note over Hook: onSuccess
        Hook->>Cache: Update with real ID
        Hook->>UI: Show success toast

        DB->>RT: Trigger change event
        RT->>UI: Realtime update
    else Error
        API-->>Hook: Error response

        Note over Hook: onError
        Hook->>Cache: Rollback optimistic update
        Hook->>UI: Show error toast
        Hook->>UI: Remove temp reminder
    end

    Note over Hook: onSettled
    Hook->>Cache: Invalidate queries
    Cache->>API: Refetch data
    API->>DB: SELECT reminders
    DB-->>API: Latest data
    API-->>Cache: Update cache
    Cache->>UI: Re-render with fresh data
```

### Real-time Sync Flow

```mermaid
sequenceDiagram
    participant User1 as User 1 Browser
    participant User2 as User 2 Browser
    participant RT as Supabase Realtime
    participant DB as Database
    participant API as API Route

    User1->>API: Update reminder
    API->>DB: UPDATE reminders
    DB->>RT: Trigger postgres_changes

    par Notify User 1
        RT->>User1: WebSocket: UPDATE event
        User1->>User1: Update cache
        User1->>User1: Re-render UI
        User1->>User1: Show info toast
    and Notify User 2
        RT->>User2: WebSocket: UPDATE event
        User2->>User2: Update cache
        User2->>User2: Re-render UI
        User2->>User2: Show info toast
    end
```

### SMS Send Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Dashboard
    participant Hook as useSendSMS
    participant API as API Route
    participant Validation as Validation Service
    participant SMS as NotifyHub
    participant DB as Database

    User->>UI: Click "Send SMS"
    UI->>Hook: sendSMS(reminderId)
    Hook->>API: POST /api/sms/send

    API->>Validation: Check phone verified
    API->>Validation: Check consent given
    API->>Validation: Check not opted out

    alt Validation passes
        API->>SMS: POST /v1/sms/send
        SMS-->>API: Message ID

        API->>DB: INSERT notification_log
        API->>DB: UPDATE reminder.last_notification_sent_at

        API-->>Hook: Success
        Hook->>UI: Show success toast

        Note over SMS: Async delivery
        SMS->>API: Webhook: delivery status
        API->>DB: UPDATE notification_log
    else Validation fails
        API-->>Hook: Error (403)
        Hook->>UI: Show error toast
    end
```

---

## State Management Architecture

```mermaid
graph TB
    subgraph "State Layers"
        ServerState[Server State<br/>React Query]
        URLState[URL State<br/>Next.js Router]
        ComponentState[Component State<br/>useState]
        RealtimeState[Real-time State<br/>Supabase]
        OptimisticState[Optimistic State<br/>React Query]
    end

    subgraph "Data Sources"
        API[API Routes]
        Router[Next.js Router]
        Realtime[Supabase Realtime]
    end

    API --> ServerState
    Router --> URLState
    Realtime --> RealtimeState

    ServerState --> OptimisticState

    subgraph "UI Layer"
        Components[React Components]
    end

    ServerState --> Components
    URLState --> Components
    ComponentState --> Components
    RealtimeState --> Components
    OptimisticState --> Components

    style ServerState fill:#3b82f6
    style URLState fill:#10b981
    style ComponentState fill:#f59e0b
    style RealtimeState fill:#ef4444
    style OptimisticState fill:#8b5cf6
```

---

## Component Interaction Diagram

```mermaid
graph LR
    subgraph "Container"
        Manager[RemindersManager]
    end

    subgraph "Presentation Components"
        Toolbar[RemindersToolbar]
        Filters[RemindersFilters]
        Table[RemindersTable]
        BulkActions[BulkActions]
    end

    subgraph "Modals"
        CreateModal[CreateReminderModal]
        EditModal[EditReminderModal]
        DeleteModal[DeleteConfirmationModal]
        SMSModal[SendSMSModal]
    end

    Manager -->|props| Toolbar
    Manager -->|props| Filters
    Manager -->|props| Table
    Manager -->|props| BulkActions

    Toolbar -->|events| Manager
    Filters -->|events| Manager
    Table -->|events| Manager
    BulkActions -->|events| Manager

    Manager -->|state| CreateModal
    Manager -->|state| EditModal
    Manager -->|state| DeleteModal
    Manager -->|state| SMSModal

    CreateModal -->|onSubmit| Manager
    EditModal -->|onSubmit| Manager
    DeleteModal -->|onConfirm| Manager
    SMSModal -->|onSend| Manager

    style Manager fill:#3b82f6
    style CreateModal fill:#10b981
    style EditModal fill:#10b981
    style DeleteModal fill:#ef4444
    style SMSModal fill:#f59e0b
```

---

## Error Handling Flow

```mermaid
graph TB
    Error[Error Occurs]

    Error --> Check{Error Type?}

    Check -->|Network| NetworkHandler[Network Error Handler]
    Check -->|Auth| AuthHandler[Auth Error Handler]
    Check -->|Validation| ValidationHandler[Validation Error Handler]
    Check -->|API| APIHandler[API Error Handler]
    Check -->|Unknown| UnknownHandler[Unknown Error Handler]

    NetworkHandler --> Retry{Retryable?}
    Retry -->|Yes| Backoff[Exponential Backoff]
    Retry -->|No| ShowError[Show Error Toast]
    Backoff --> Retry

    AuthHandler --> Redirect[Redirect to Login]

    ValidationHandler --> ShowError

    APIHandler --> Log[Log Error]
    Log --> ShowError

    UnknownHandler --> Log

    ShowError --> UserAction{User Action?}
    UserAction -->|Retry| Error
    UserAction -->|Dismiss| End[End]

    Redirect --> End

    style Error fill:#ef4444
    style ShowError fill:#f59e0b
    style End fill:#10b981
```

---

## SMS Integration Architecture

```mermaid
graph TB
    subgraph "Dashboard"
        UI[User Interface]
        Hook[useSendSMS Hook]
    end

    subgraph "API Layer"
        Route[/api/sms/send]
        Validation[Validation Service]
        SMSService[SMS Service]
    end

    subgraph "External Services"
        NotifyHub[NotifyHub API]
    end

    subgraph "Database"
        Reminders[(reminders)]
        Logs[(notification_log)]
    end

    UI -->|Send SMS| Hook
    Hook -->|POST| Route

    Route --> Validation
    Validation -->|Check consent| Reminders
    Validation -->|Check verification| Reminders

    Route --> SMSService
    SMSService -->|Build message| SMSService
    SMSService -->|POST /v1/sms/send| NotifyHub

    NotifyHub -->|Message ID| SMSService
    SMSService -->|Log| Logs
    SMSService -->|Update| Reminders

    NotifyHub -.->|Webhook| Route
    Route -.->|Update status| Logs

    style UI fill:#3b82f6
    style NotifyHub fill:#ef4444
    style Validation fill:#f59e0b
    style Reminders fill:#10b981
```

---

## Filter & Search Architecture

```mermaid
graph LR
    subgraph "UI Layer"
        SearchBar[SearchBar]
        TypeFilter[TypeFilter]
        StatusFilter[StatusFilter]
        DateFilter[DateRangeFilter]
        StationFilter[StationFilter]
    end

    subgraph "State Layer"
        URLState[URL Query Params]
        FilterHook[useReminderFilters]
    end

    subgraph "API Layer"
        APICall[API Client]
        Routes[API Routes]
    end

    subgraph "Database"
        DB[(PostgreSQL)]
    end

    SearchBar -->|onChange| FilterHook
    TypeFilter -->|onChange| FilterHook
    StatusFilter -->|onChange| FilterHook
    DateFilter -->|onChange| FilterHook
    StationFilter -->|onChange| FilterHook

    FilterHook -->|Update| URLState
    URLState -->|Read| FilterHook

    FilterHook -->|Query params| APICall
    APICall -->|GET /api/reminders?filters| Routes
    Routes -->|WHERE clauses| DB

    DB -->|Filtered results| Routes
    Routes -->|JSON| APICall
    APICall -->|Update cache| FilterHook
    FilterHook -->|Re-render| SearchBar
    FilterHook -->|Re-render| TypeFilter
    FilterHook -->|Re-render| StatusFilter
    FilterHook -->|Re-render| DateFilter
    FilterHook -->|Re-render| StationFilter

    style URLState fill:#3b82f6
    style FilterHook fill:#10b981
    style DB fill:#ef4444
```

---

## Security Architecture

```mermaid
graph TB
    subgraph "Client (Browser)"
        UI[React UI]
    end

    subgraph "Network Layer"
        HTTPS[HTTPS/TLS 1.3]
        CORS[CORS Policy]
    end

    subgraph "API Layer"
        Auth[Authentication<br/>JWT Token]
        RateLimit[Rate Limiting<br/>100 req/min]
        Validation[Input Validation<br/>Zod Schemas]
        CSRF[CSRF Protection]
    end

    subgraph "Database Layer"
        RLS[Row-Level Security<br/>RLS Policies]
        DB[(PostgreSQL)]
    end

    subgraph "External Services"
        NotifyHub[NotifyHub SMS]
    end

    UI -->|Request| HTTPS
    HTTPS --> CORS
    CORS --> Auth
    Auth --> RateLimit
    RateLimit --> CSRF
    CSRF --> Validation
    Validation --> RLS
    RLS --> DB

    Validation -->|API Key| NotifyHub

    Auth -.->|Session| UI
    RateLimit -.->|429 Too Many Requests| UI
    Validation -.->|400 Bad Request| UI
    RLS -.->|403 Forbidden| UI

    style Auth fill:#ef4444
    style RLS fill:#ef4444
    style Validation fill:#f59e0b
    style RateLimit fill:#f59e0b
```

---

## Performance Optimization Flow

```mermaid
graph TB
    Request[User Request]

    Request --> Cache{In Cache?}
    Cache -->|Yes| Return[Return Cached Data]
    Cache -->|No| Fetch[Fetch from API]

    Fetch --> Parallel{Parallel?}
    Parallel -->|Yes| ParallelFetch[Parallel Requests]
    Parallel -->|No| SerialFetch[Serial Request]

    ParallelFetch --> Store[Store in Cache]
    SerialFetch --> Store

    Store --> Stale{Stale?}
    Stale -->|Yes| Background[Background Refetch]
    Stale -->|No| Return

    Background --> Update[Update Cache]
    Update --> Return

    Return --> Prefetch{Prefetch Next?}
    Prefetch -->|Yes| PrefetchData[Prefetch Next Page]
    Prefetch -->|No| End[End]

    PrefetchData --> End

    style Cache fill:#3b82f6
    style Store fill:#10b981
    style Prefetch fill:#f59e0b
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        Dev[Local Development]
        DevDB[(Local Supabase)]
    end

    subgraph "Staging"
        StagingApp[Vercel Staging]
        StagingDB[(Supabase Staging)]
    end

    subgraph "Production"
        ProdApp[Vercel Production]
        ProdDB[(Supabase Production)]
        CDN[Vercel Edge Network]
    end

    subgraph "External Services"
        NotifyHub[NotifyHub SMS]
        Monitoring[Monitoring/Logging]
    end

    Dev -->|git push| StagingApp
    Dev --> DevDB

    StagingApp --> StagingDB
    StagingApp -->|Tests pass| ProdApp

    ProdApp --> CDN
    CDN -->|HTTPS| Users[Users]

    ProdApp --> ProdDB
    ProdApp --> NotifyHub

    ProdApp --> Monitoring
    StagingApp --> Monitoring

    style ProdApp fill:#10b981
    style ProdDB fill:#10b981
    style CDN fill:#3b82f6
```

---

## Database Schema Relationships

```mermaid
erDiagram
    auth_users ||--o{ user_profiles : "has"
    auth_users ||--o{ reminders : "creates"
    auth_users ||--o{ kiosk_stations : "owns"

    kiosk_stations ||--o{ reminders : "manages"
    kiosk_stations ||--o{ user_profiles : "assigns"

    reminders ||--o{ notification_log : "generates"
    reminders ||--o{ phone_verifications : "verifies"

    kiosk_stations ||--o{ phone_verifications : "processes"

    auth_users {
        uuid id PK
        string email
        timestamptz created_at
    }

    user_profiles {
        uuid id PK,FK
        string full_name
        string phone
        boolean prefers_sms
        uuid station_id FK
    }

    kiosk_stations {
        uuid id PK
        string slug
        string name
        uuid owner_id FK
        string station_phone
    }

    reminders {
        uuid id PK
        uuid user_id FK
        string plate_number
        enum reminder_type
        date expiry_date
        uuid station_id FK
        boolean phone_verified
        boolean consent_given
        boolean opt_out
        timestamptz deleted_at
    }

    notification_log {
        uuid id PK
        uuid reminder_id FK
        enum channel
        enum status
        string provider_message_id
        timestamptz sent_at
        timestamptz delivered_at
    }

    phone_verifications {
        uuid id PK
        string phone_number
        string verification_code
        uuid station_id FK
        boolean verified
        int attempts
        timestamptz expires_at
    }
```

---

## Testing Strategy

```mermaid
graph TB
    subgraph "Test Pyramid"
        E2E[E2E Tests<br/>Playwright<br/>Critical User Flows]
        Integration[Integration Tests<br/>Vitest<br/>API Routes + DB]
        Unit[Unit Tests<br/>Vitest<br/>Hooks + Utils + Components]
    end

    subgraph "Test Coverage"
        Hooks[Hooks: 90%]
        Components[Components: 80%]
        API[API Routes: 90%]
        Utils[Utils: 95%]
    end

    Unit --> Hooks
    Unit --> Components
    Unit --> Utils

    Integration --> API

    E2E --> CreateFlow[Create Reminder Flow]
    E2E --> EditFlow[Edit Reminder Flow]
    E2E --> DeleteFlow[Delete Reminder Flow]
    E2E --> SMSFlow[SMS Send Flow]
    E2E --> FilterFlow[Filter & Search Flow]

    style E2E fill:#ef4444
    style Integration fill:#f59e0b
    style Unit fill:#10b981
```

---

**Note:** These diagrams are created using Mermaid syntax. They can be rendered in:
- GitHub (native support)
- VS Code (with Mermaid extension)
- Documentation sites (Docusaurus, VuePress, etc.)
- Mermaid Live Editor (https://mermaid.live)

---

**Last Updated:** 2025-11-04
**See Also:**
- Full Architecture: `FAZA3_ARCHITECTURE.md`
- Quick Reference: `FAZA3_QUICK_REFERENCE.md`
