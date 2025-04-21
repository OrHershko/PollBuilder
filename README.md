# PollBuilder API Documentation

## Team Info

*   **Full Name:** Or Herhsko
*   **Full Name:** Tom
*   **Full Name:** Adva Levine
*   **Full Name:** Amir



*(Please fill in the actual names and IDs)*

## Design Assumptions

*   **Framework:** The application uses Node.js with the Express framework for the web server.
*   **Persistence:** Data (users and polls) is persisted to JSON files located in the `data/` directory ([`data/users.json`](data/users.json), [`data/polls.json`](data/polls.json)).
*   **Architecture:** The application follows a layered architecture:
    *   **Routes:** Handle incoming HTTP requests and responses ([`src/routes/userRoutes.js`](src/routes/userRoutes.js), [`src/routes/pollRoutes.js`](src/routes/pollRoutes.js)).
    *   **Services:** Contain the core business logic and validation ([`src/services/UserService.js`](src/services/UserService.js), [`src/services/PollService.js`](src/services/PollService.js)).
    *   **Storage:** Abstract the data persistence mechanism ([`src/storage/StorageInterface.js`](src/storage/StorageInterface.js), [`src/storage/JsonFileStorage.js`](src/storage/JsonFileStorage.js), etc.).
*   **Poll Identification:** Polls are identified using unique UUIDs generated upon creation.
*   **User Identification:** Usernames are unique and serve as the primary identifier (ID) for users.
*   **Authorization:**
    *   Poll deletion requires the username of the poll creator for verification. Only the creator can delete their poll.
*   **Voting:** Users can vote only once per poll. Votes are recorded by mapping the username to the chosen option index.
*   **Error Handling:** Services and routes perform validation and throw errors for invalid operations (e.g., non-existent users/polls, duplicate votes, invalid data). Errors are generally returned as JSON responses with appropriate HTTP status codes.

## API Summary

### Endpoints

**User Management** (`/users`)

*   `POST /users`: Create a new user.
*   `GET /users/:username/polls`: Get all polls created by a specific user.
*   `GET /users/:username/votes`: Get all polls a specific user has voted in.

**Poll Management** (`/polls`)

*   `POST /polls`: Create a new poll.
*   `GET /polls`: Get a list of all polls.
*   `GET /polls?createdBy=username`: Get polls filtered by the creator's username.
*   `GET /polls/:id`: Get details of a specific poll by its ID.
*   `DELETE /polls/:id?username=creatorUsername`: Delete a specific poll (requires the creator's username in the query string).
*   `POST /polls/:id/vote`: Cast a vote on a specific poll.
*   `GET /polls/:id/results`: Get the voting results for a specific poll.

### Request/Response Examples

**1. Create User**

*   **Request:** `POST /users`
    ```json
    {
      "username": "newUser123"
    }
    ```
*   **Response (Success 201):**
    ```json
    {
      "id": "newUser123",
      "username": "newUser123"
    }
    ```
*   **Response (Error 400 - Duplicate):**
    ```json
    {
      "error": "Username 'newUser123' already exists"
    }
    ```

**2. Create Poll**

*   **Request:** `POST /polls`
    ```json
    {
      "question": "Favorite framework?",
      "options": ["React", "Vue", "Angular"],
      "creator": "newUser123"
    }
    ```
*   **Response (Success 201):**
    ```json
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef", // Example UUID
      "question": "Favorite framework?",
      "options": ["React", "Vue", "Angular"],
      "createdBy": "newUser123",
      "votes": {}
    }
    ```
*   **Response (Error 400 - Invalid Data):**
    ```json
    {
      "error": "Poll must have at least 2 options"
    }
    ```

**3. Vote on Poll**

*   **Request:** `POST /polls/a1b2c3d4-e5f6-7890-1234-567890abcdef/vote`
    ```json
    {
      "username": "anotherUser",
      "optionIndex": 1 // Vote for "Vue"
    }
    ```
*   **Response (Success 200):**
    ```json
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "question": "Favorite framework?",
      "options": ["React", "Vue", "Angular"],
      "createdBy": "newUser123",
      "votes": {
        "anotherUser": 1
      }
    }
    ```
*   **Response (Error 400 - Already Voted):**
    ```json
    {
      "error": "User anotherUser has already voted in this poll"
    }
    ```

**4. Get Poll Results**

*   **Request:** `GET /polls/a1b2c3d4-e5f6-7890-1234-567890abcdef/results`
*   **Response (Success 200):**
    ```json
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "question": "Favorite framework?",
      "createdBy": "newUser123",
      "totalVotes": 1,
      "results": [
        { "option": "React", "votes": 0 },
        { "option": "Vue", "votes": 1 },
        { "option": "Angular", "votes": 0 }
      ]
    }
    ```

## Interface Contracts

### Business Logic (Services)

**[`UserService`](src/services/UserService.js)**

*   `createUser(username: string): Promise<User>`
*   `getUser(username: string): Promise<User>`
*   `userExists(username: string): Promise<boolean>`

**[`PollService`](src/services/PollService.js)**

*   `createPoll(pollData: { question: string, options: string[], creator: string }): Promise<Poll>`
*   `getPoll(pollId: string): Promise<Poll>`
*   `getAllPolls(): Promise<Poll[]>`
*   `getPollsByCreator(username: string): Promise<Poll[]>`
*   `getPollsVotedByUser(username: string): Promise<Poll[]>`
*   `vote(pollId: string, username: string, optionIndex: number): Promise<Poll>`
*   `getPollResults(pollId: string): Promise<PollResults>`
*   `deletePoll(pollId: string, username: string): Promise<boolean>`

### Storage Interface ([`StorageInterface`](src/storage/StorageInterface.js))

*   `create(id: string, data: Object): Promise<Object>`
*   `getById(id: string): Promise<Object | null>`
*   `update(id: string, data: Object): Promise<Object>`
*   `delete(id: string): Promise<boolean>`
*   `getAll(): Promise<Array<Object>>`
*   `filter(filterFn: Function): Promise<Array<Object>>`

**Specific Storage Implementations:**

*   **User Storage** ([`JsonFileUserStorage`](src/storage/JsonFileUserStorage.js), [`UserStorage`](src/storage/UserStorage.js)):
    *   `createUser(username: string): Promise<User>`
    *   `getUserByUsername(username: string): Promise<User | null>`
    *   `usernameExists(username: string): Promise<boolean>`
    *   `getAllUsers(): Promise<User[]>`
*   **Poll Storage** ([`JsonFilePollStorage`](src/storage/JsonFilePollStorage.js), [`PollStorage`](src/storage/PollStorage.js)):
    *   `createPoll(id: string, pollData: { question: string, options: string[], createdBy: string }): Promise<Poll>`
    *   `getPollsByCreator(username: string): Promise<Poll[]>`
    *   `getPollsVotedByUser(username: string): Promise<Poll[]>`
    *   `addVote(pollId: string, username: string, optionIndex: number): Promise<Poll>`
    *   `getPollResults(pollId: string): Promise<PollResults>`

## Team Retrospective

*(This section should be filled out by the team based on their experience.)*

**Reflections on Collaboration:**

*   What worked well in terms of teamwork and communication?
*   What challenges did we face working together?
*   How did we resolve disagreements or different approaches?
*   How was the workload distributed? Was it fair?

**Lessons Learned on AI Usage:**

*   How did we use AI tools (like GitHub Copilot) during development?
*   What were the benefits of using AI? (e.g., code suggestions, boilerplate generation, debugging help, documentation assistance)
*   What were the limitations or challenges? (e.g., incorrect suggestions, understanding context, over-reliance)
*   Did using AI change our development process? How?
*   What would we do differently regarding AI usage next time?
