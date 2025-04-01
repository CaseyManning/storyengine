# StoryEngine Server

A dynamic narrative generation server using LLMs to create and maintain interactive stories.

## Overview

StoryEngine is a comprehensive system for creating LLM-controlled narratives - an iterative solver that elaborates on, expands, and contracts a narrative in real time as the player traverses the story.

## Features

- Generate complete stories from simple prompts
- Dynamic character generation and relationship management
- Narrative locking system to maintain story consistency
- Dialogue generation with player choice options
- Real-time narrative adaptation based on player choices
- WebSocket support for live updates

## Tech Stack

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL) for story state persistence
- **LLM Integration**: OpenAI API (GPT-4)
- **Authentication**: JSON Web Tokens (JWT)
- **Real-time**: Socket.IO

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/storyengine.git
   cd storyengine/server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following values:
   ```bash
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # Supabase Configuration
   SUPABSE_KEY=your_supabase_key
   SUPABSE_URL=your_supabase_url
   
   # Session Secret
   SESSION_SECRET=your_session_secret
   ```
   Update the values with your configurations.

4. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Stories

- `POST /api/story` - Create a new story from prompt
- `GET /api/story/:id` - Retrieve story state
- `GET /api/story/:id/characters` - Get characters for a story
- `POST /api/story/:storyId/characters/:characterId/dialogue` - Generate dialogue
- `POST /api/story/:storyId/dialogue/:dialogueId/select` - Select dialogue option
- `POST /api/story/:id/location` - Change player location
- `POST /api/story/:id/save` - Save story state

### Authentication

- `POST /api/auth/signup` - Register new user
  - Body: `{ email, password, name }`
- `POST /api/auth/login` - Log in user
  - Body: `{ email, password }`
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Log out user

## Architecture

The server follows a modular architecture with clear separation of concerns:

- **Models**: MongoDB schemas and interfaces for Story, Character, Dialogue, etc.
- **Services**: Core business logic for story generation, character creation, dialogue, etc.
- **Routes**: API endpoints and request handling
- **Middleware**: Authentication, error handling, etc.

## License

MIT