# StoryEngine Server

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
    CLIENT_URL=http://localhost:3000

    # Supabase Configuration
    SUPABSE_KEY=your_supabase_key
    SUPABSE_URL=your_supabase_url

    # OpenAI Configuration
    OPENAI_API_KEY=your_openai_api_key

    # Session Secret
    SESSION_SECRET=your_session_secret
    ```

    Update the values with your configurations.

4. Start the development server:
    ```bash
    npm run dev
    ```

### Database Setup

Before running the server, ensure you have the following tables set up in your Supabase database:

1. `interactive_stories` - Stores interactive fiction stories:
   - `id` (uuid, primary key)
   - `user_id` (uuid, references auth.users)
   - `story_data` (jsonb) - Stores the complete story data
   - `created_at` (timestamp with timezone, default: now())

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/user` - Get current user

#### Interactive Fiction
- `GET /api/story` - Get all stories for the authenticated user
- `POST /api/story/new` - Create a new interactive fiction story
  - Body: `{ "storyPrompt": "Optional custom story prompt" }`
- `GET /api/story/:storyId` - Get a specific story by ID
- `POST /api/story/:storyId/choice/:choiceId` - Make a choice in the story
- `DELETE /api/story/:storyId` - Delete a story

### Socket.IO Events

The server supports real-time updates through Socket.IO:

- `join_story` - Join a story room (pass storyId)
- `leave_story` - Leave a story room (pass storyId)

### Story Generation

The server uses OpenAI's API to generate interactive fiction content. The generation process:

1. Creates an initial story node with a world state description
2. Generates meaningful choices for the player
3. Updates the story based on player choices
4. Saves all progress to the database
