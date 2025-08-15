## Rednote AI Agent

Rednote AI Agent is an AI-powered automation tool designed for **Rednote** to automate social media interactions such as liking, bookmarking, and commenting. It leverages advanced AI models to generate engaging content, automate interactions, and manage Rednote accounts efficiently.

## Features

- **Rednote Automation**: Securely log in via QR code, search posts, like posts, bookmark posts, and leave insightful comments.
- **AI-Powered Content Generation**: Use Google AI to create engaging titles and comments.
- **Smart Interaction Selection**: Choose to execute liking, bookmarking, commenting, and other operations at startup, supporting multiple selections or browsing only.
- **Proxy Support**: Use proxies to manage multiple accounts and avoid rate limits.
- **Cookie Management**: Save and load cookies to maintain sessions across restarts.
- **Detailed Logging**: Record information and operation results for each post, facilitating debugging and monitoring.

**Upcoming Features:**

- Posting new content.

## Installation

1. **Clone the repository**:

   ```sh
   git clone https://github.com/lukailun/Rednote-AI-Agent.git
   cd Rednote-AI-Agent
   ```

2. **Install dependencies**:

   ```sh
   npm install
   ```

3. **Set up environment variables**:
   Rename the `.env.example` file to `.env` in the root directory and configure the necessary environment variables. Refer to the `.env.example` file for the required variables.
   ```dotenv
   MONGODB_URI = #MongoDB URI

   GEMINI_API_KEY = #Gemini API Key
   ```

## MongoDB Setup (Using Docker)

1. **Install Docker**:
   If you don't have Docker installed, download and install it from the [official website](https://www.docker.com/products/docker-desktop/).

2. **Run MongoDB using Docker Container**:

    **Option 1:**
      ```sh
      docker run -d -p 27017:27017 --name rednote-ai-mongodb mongodb/mongodb-community-server:latest
      ```
    **Option 2:**
      ```sh
      docker run -d -p 27017:27017 --name rednote-ai-mongodb -v mongodb_data:/data/db mongodb/mongodb-community-server:latest
      ```   
      (Option 2: Use this if you want permanent storage so your data won't be lost when you stop or remove the Docker container)

3. **Modify the MONGODB_URI in the .env file**:
   ```dotenv
   MONGODB_URI = mongodb://localhost:27017/rednote-ai-agent
   ```

4. **Verify the connection**:
   Open a new terminal and run the following command:
   ```sh
   docker ps
   ```
   You should see the MongoDB container running.

   Docker Commands (Additional Info):
   - To stop the MongoDB container:
     ```sh
     docker stop rednote-ai-mongodb
     ```
   - To start the MongoDB container:
       ```sh
       docker start rednote-ai-mongodb
       ```
   - To remove the MongoDB container:
      ```sh
      docker rm rednote-ai-mongodb
      ```
   - To remove the MongoDB container and its data:
      ```sh
      docker rm -v rednote-ai-mongodb
      ```

## Usage

1. **Run the Rednote agent**:
   ```sh
   npm start
   ```

2. **Select operation type**:
   After the program starts, you'll be prompted to select the operations to execute:
   ```
   === Select operations to execute ===
   1. Like
   2. Bookmark
   3. Comment
   Enter numbers (press Enter to browse only), separated by commas (e.g., 1,2,3):
   Your choice:
   ```
   - Enter a single number (e.g., 1) to execute a single operation
   - Enter multiple numbers (e.g., 1,2,3) to execute multiple operations
   - Press Enter directly to only browse posts without executing any operations

3. **Search posts with keywords**:
   ```
   Search posts with keywords (press Enter to skip search):
   ```
   - Enter keywords to search for posts
   - Press Enter to skip search and browse homepage content

4. **Automatic execution**:
   The program will automatically execute the selected operations, including:
   - Login verification (using saved cookies or QR code login)
   - Post search (if keywords were entered)
   - Browse posts and execute selected operations
   - Record detailed operation logs

## Project Structure

- **src/client**: Contains the main logic for interacting with the Rednote platform.
- **src/config**: Configuration files, including the logger setup.
- **src/utils**: Utility functions for handling errors, cookies, data saving, etc.
- **src/Agent**: Contains the AI agent logic and training scripts.
- **src/Agent/training**: Training scripts for the AI agent.
- **src/schema**: Schema definitions for AI-generated content and database models.
- **src/test**: Contains test data and scripts for Rednote automation.

## Logging

The project uses a custom logger to log information, warnings, and errors. Logs are saved in the `logs` directory.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgements

- [Google AI](https://ai.google/tools/) for providing the AI models.
- [Puppeteer](https://github.com/puppeteer/puppeteer) for browser automation.
- [puppeteer-extra](https://github.com/berstend/puppeteer-extra) for additional plugins and enhancements.