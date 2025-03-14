# StoryEngine

A comprehensive system for creating LLM-controlled narratives - an interactive story generation engine that creates and maintains dynamic, player-responsive stories.

## Project Structure

- `/client` - React TypeScript frontend with a visual novel interface
- `/server` - Node.js backend with the story engine logic

## Setup & Running

### Supabase Setup

1. Create a free Supabase account at [https://supabase.com/](https://supabase.com/)
2. Create a new project
3. Once your project is ready, navigate to the project dashboard
4. Get your project API Key (Settings > API > Project API keys > service_role key)
5. Get your project URL (Settings > API > Project URL)
6. Add these to your `.env` file as SUPABSE_KEY and SUPABSE_URL (note: this is the expected spelling with the typo)

### Database Schema Setup

When you first run the server, it will detect that the database schema needs to be set up. The server will provide SQL commands that you need to run in the Supabase SQL Editor. Follow these steps:

1. In your Supabase dashboard, go to the SQL Editor
2. Create a new query
3. Copy the SQL commands from the server console output
4. Run the SQL commands to create the necessary tables

#### Supabase GUI Tools

- **Supabase Dashboard**: Provides a visual interface for managing your database, authentication, and storage
- **Table Editor**: A simple way to view and edit data in your tables
- **SQL Editor**: For running custom SQL queries
- **Auth**: Manage users and authentication settings
- **Storage**: File storage management

### Server Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   
4. Update the `.env` file with your configurations:
   ```
   PORT=3001
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/storyengine
   # or Atlas connection string: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/storyengine
   JWT_SECRET=your_secret_key_here
   JWT_EXPIRES_IN=1d
   OPENAI_API_KEY=your_openai_api_key_here
   SESSION_SECRET=your_session_secret_here
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Client Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Testing the Story Engine

The client includes a test interface that demonstrates the core functionality of the story engine. To test the system:

1. Make sure both the server and client are running.

2. Use the "Story Creation" form to generate a new story by entering a prompt (e.g., "detective story set in the 1920s about solving a break-in at a cheese store").

3. After the story is created, click "Get Characters" to see the characters that were generated for the story.

4. Select a character to view their details and start a conversation.

5. In the conversation, you can select dialogue options to interact with the character.

6. You can change locations within the story world using the "Change Location" form.

## Features

- Generate complete stories from simple prompts
- Dynamic character generation with detailed personalities, motivations, and knowledge
- Narrative consistency management through a locking system
- Dialogue generation with player choice options
- Real-time narrative adaptation based on player choices
- Location-based character interactions

## Implementation Details

- The story engine uses OpenAI's GPT-4 to generate and maintain the narrative
- MongoDB stores story state, characters, and dialogue
- WebSockets provide real-time updates
- React frontend with TypeScript for type safety

## Troubleshooting

### Supabase Connection Issues

1. **Connection Refused:**
   - Check if the Supabase URL in `.env` is correct
   - Verify that your Supabase project is active in the dashboard
   - Try opening the Supabase dashboard to confirm the service is working

2. **Authentication Failed:**
   - Verify the API key in `.env` is correct (it should be the service_role key)
   - Check if the key has the necessary permissions

3. **Network Issues:**
   - Ensure your network allows connections to Supabase
   - Check if your firewall or network settings block outgoing HTTPS connections

4. **Database Schema Issues:**
   - If tables are missing, make sure you've run the SQL commands provided in the server logs
   - Check the SQL Editor in Supabase dashboard for any error messages from the SQL execution

### Server Startup Issues

1. **Module Not Found Errors:**
   - Run `npm install` again to ensure all dependencies are installed
   - Check for any typos in import statements

2. **Port Already in Use:**
   - Change the PORT in `.env` file
   - Or kill the process using the current port with:
     ```
     # Find the process using port 3001
     lsof -i :3001
     # Kill it (replace <PID> with the process ID)
     kill -9 <PID>
     ```

3. **OpenAI API Issues:**
   - Verify your OpenAI API key is valid and has sufficient credits
   - Check OpenAI service status if encountering consistent errors

### Client Connection to Server

1. **CORS Errors:**
   - Ensure the server is running and the client is configured to connect to the correct URL
   - The CORS settings in the server should already allow connections from localhost:3000

2. **Network Errors:**
   - Check that the server is running (`npm run dev` in the server directory)
   - Verify the port in the client's API configuration matches the server's port

## License

MIT