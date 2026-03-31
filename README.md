# Live Avatar

**Live Avatar** is a simple Next.js application that allows real-time interaction with an AI-powered avatar via chat or speech. The avatar is rendered and streamed using the [HeyGen API](https://docs.liveavatar.com/), offering a responsive and engaging user experience.

## Getting Started

### 1. Set up environment variables:

Create .env.production file based on the provided .env.example:

```bash
cp .env.example .env.production
```

Then fill in the required variable:

```
API_KEY_HEYGEN=your-api-key
NEXT_PUBLIC_BASE_API_URL_HEYGEN=https://api.liveavatar.com
```

To get the API_KEY, you need to create it on the official website https://app.liveavatar.com.

Other variables in .env.example are optional and can be configured as needed.

### 2. Install dependencies:

Choose your preferred package manager:

```bash
npm install
# or
yarn
# or
pnpm install
```

### 3. Run the app locally:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open http://localhost:3000 to view it in the browser.

## Running with Docker

To launch the app in a Docker container:

```bash
docker compose up --build -d
```

Make sure to update the environment variables in the .env file or configure them through Docker.
