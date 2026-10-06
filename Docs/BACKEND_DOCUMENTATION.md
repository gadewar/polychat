# PolyChat Backend Documentation

This document provides a comprehensive, production-level overview of the PolyChat backend architecture. It serves as the primary technical reference for the server-side implementation.

> *Related Documents:*
> - [Project Architecture](file:///e:/Projects/PolyChat/Docs/PROJECT_ARCHITECTURE.md)
> - [Features and Workflow](file:///e:/Projects/PolyChat/Docs/FEATURES_AND_WORKFLOW.md)

---

## Table of Contents

1. [Backend Overview](#1-backend-overview)
2. [Folder Structure](#2-folder-structure)
3. [Request Lifecycle](#3-request-lifecycle)
4. [Route Organization](#4-route-organization)
5. [Controllers & Business Logic](#5-controllers--business-logic)
6. [Data Layer (MongoDB & Mongoose)](#6-data-layer-mongodb--mongoose)
7. [Services (Gemini AI)](#7-services-gemini-ai)
8. [Real-time Layer (Socket.io)](#8-real-time-layer-socketio)
9. [Security Features](#9-security-features)
10. [Developer Notes & Design Decisions](#10-developer-notes--design-decisions)
11. [Deployment & Scaling](#11-deployment--scaling)


---

## 1. Backend Overview

The PolyChat backend is a Node.js application built with **Express** and **Socket.io**. It functions as a hybrid server, managing standard RESTful HTTP requests alongside bi-directional WebSockets. Data persistence is powered by **MongoDB Atlas**, while real-time Chat Message translation is integrated via the **Google Gemini 2.5 Flash API**.

## 2. Folder Structure

The `server/` directory strictly adheres to the Model-View-Controller (MVC) design pattern (excluding Views).

| Directory | Purpose |
|---|---|
| `controllers/` | Business logic for handling API requests and formulating responses. |
| `middlewares/` | Request interceptors (e.g., `verifyToken` for JWT validation). |
| `models/` | Mongoose database schemas and lifecycle hooks. |
| `routes/` | Express route definitions, mapping endpoints to Controllers. |
| `services/` | Encapsulated third-party logic (Gemini Translation Service). |
| `uploads/` | Local filesystem storage for Multer (Avatars and File Attachments). |

## 3. Request Lifecycle

The following diagram illustrates the lifecycle of a standard protected API request, demonstrating the exact flow of data through the backend modules.

```mermaid
flowchart TD
    Client[Client / Axios] -->|HTTP POST| Router[Express Router]
    
    subgraph Express Application
        Router --> Parsers[express.json & cookie-parser]
        Parsers --> CORS{CORS Check}
        CORS -- Fail --> Reject[Reject Request]
        CORS -- Pass --> Auth[Auth Middleware]
        
        Auth --> JWT{Validate JWT}
        JWT -- Invalid --> Error401[401/403 Error]
        JWT -- Valid --> Attach[Attach req.userId]
        
        Attach --> Controller[Controller Function]
        Controller --> Service[Service Layer (Multer/Gemini)]
        Service --> ODM[Mongoose ODM]
    end
    
    ODM -->|Query| DB[(MongoDB Atlas)]
    DB -->|Data| ODM
    
    ODM --> Controller
    Controller -->|res.json| Client
```

## 4. Route Organization

Endpoints are heavily modularized. Each domain mounts onto a specific prefix defined in `index.js`.

### API Endpoints Overview

| Prefix | Domain | Auth Required | Key Responsibilities |
|---|---|---|---|
| `/api/auth` | Authentication | Mixed | Signup, Login, Profile updates, Avatar uploads, Logout. |
| `/api/contacts` | Social | Yes | Searching users, sending/accepting friend requests. |
| `/api/messages` | Direct Messages | Yes | Fetching DM history, uploading file attachments. |
| `/api/channel` | Channels | Yes | Creating channels, fetching channel history, invites. |

## 5. Controllers & Business Logic

Controllers contain the execution logic and interact directly with Mongoose Models.

- **`AuthController`**: Handles `bcryptjs` password hashing, JWT signing, and Profile file management using `fs` (File System) methods to move Multer temp files.
- **`ContactsController`**: Uses advanced **MongoDB Aggregation Pipelines** to sort DM contacts dynamically based on the timestamp of the most recent message.
- **`MessagesController`**: Responsible for the "Translation Injection". When fetching messages, it determines whether to return the `originalContent` (if the requester is the sender) or a localized string from the `translatedContent` map (if the requester is the recipient).

## 6. Data Layer (MongoDB & Mongoose)

Mongoose schemas enforce structure in the NoSQL database.

- **`UserModel`**: Features a `pre('save')` hook to automatically salt and hash passwords. Maintains relational arrays for `friends` and `friendRequests`.
- **`MessagesModel`**: Stores messages. Text messages utilize a **Mongoose `Map`** for `translatedContent`, allowing dynamic key-value pairing (e.g., `{"en": "Hello", "es": "Hola"}`).
- **`ChannelModel`**: Maintains an array of `messages` references and separates active `members` from `pendingMembers`.

## 7. Services (Gemini AI)

Services abstract complex external API interactions.

- **`translationService.js`**: Exposes `detectLanguage`, `translateText`, and `shouldForceTranslate`.
- **Hinglish Detection**: Specifically scans for Latin-script Hindi words.
- **Resilience**: Features timeout handling and a caching variable (`apiQuotaExceeded`). If the Gemini API returns a 429 error, it temporarily halts further API calls for an hour to prevent cascading failures, falling back to delivering original text.

## 8. Real-time Layer (Socket.io)

The WebSocket layer (`socket.js`) provides low-latency communication.

- **State Management**: Maintains an in-memory `Map` called `userSocketMap` linking database `userId`s to active `socket.id`s.
- **Event Handlers**:
  - `sendMessage`: Saves to DB, emits to sender, initiates async translation, then emits to recipient.
  - `typing`: Routes "User is typing..." indicators securely to specific recipient sockets.
  - `markMessagesAsRead`: Updates MongoDB document statuses from `sent` to `read` and fires a confirmation back to the sender.

## 9. Security Features

- **JWT Cookies**: Issued with `secure: true` (requires HTTPS) and `sameSite: "None"`. They are validated by the `AuthMiddleware`.
- **CORS**: Restricted by the `ORIGIN` environment variable, ensuring only the official frontend domain can interact with the API.
- **Password Hashing**: `bcryptjs` salt rounds prevent dictionary and rainbow-table attacks.
- **Regex Sanitization**: The global Contact search explicitly escapes user input to prevent ReDoS (Regular Expression Denial of Service) attacks.

## 10. Developer Notes & Design Decisions

### Why JWT Cookies instead of Authorization Headers?
By sending the JWT in a cookie, the browser automatically attaches it to every request (including image source tags `<img src="...">`). If we used Authorization headers, the frontend would have to manually fetch and attach blobs for every profile picture, which is highly inefficient.

### Why Multer to Local Disk?
Multer is configured to write to `uploads/` for simplicity in the current iteration. The files are then served statically via `express.static()`. 

> **Warning:** This architecture is ephemeral. See Section 11.

### Why a Map for Translations?
Instead of hardcoding schema fields like `translated_es`, `translated_fr`, a Mongoose Map allows infinite horizontal scaling of languages without running database migrations.

## 11. Deployment & Scaling

### Current Deployment (Render.com)
The `render.yaml` file defines the Infrastructure-as-Code for Render.com Web Services. 

### Future Evolution (Production Roadmap)
1. **Persistent Object Storage (Critical):** Render.com has an ephemeral file system. Avatar and file uploads in `/uploads/` **will be wiped** on every deployment. Multer must be reconfigured to pipe streams directly to **AWS S3** or **Cloudinary**.
2. **Redis Socket Adapter:** The `userSocketMap` currently lives in Node's RAM. To run multiple backend instances (horizontal scaling), we must implement `socket.io-redis` so instances can share presence data.
3. **Database Indexing:** Ensure compound indexes exist on `MessagesModel.sender` and `MessagesModel.recipient` to prevent slow collection scans as the database grows.

---
*Generated: 2026-07-20 | PolyChat Backend Documentation v1.2*
