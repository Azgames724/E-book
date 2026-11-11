
# Page & Co. Digital Library

A beautiful online PDF library with an administrator dashboard.

## Features

- Responsive digital library
- Administrator login
- Upload PDF books
- Upload book covers
- Book search
- PDF reading interface
- Zoom controls
- Page navigation
- Delete books
- Server-side storage

## Requirements

- Node.js 18+
- npm

## Installation

Install dependencies:

npm install

Configure environment variables:

ADMIN_PASSWORD=YourStrongPassword
SESSION_SECRET=YourRandomSecret
PORT=3000
NODE_ENV=development

Start the server:

npm start

Open:

http://localhost:3000

## Storage

Books are saved inside uploads/.

Book information is stored inside data/books.json.

## Deployment

Use a Node.js hosting provider with persistent disk storage.

Set ADMIN_PASSWORD, SESSION_SECRET and NODE_ENV=production
in the hosting environment.

Never upload your real .env file to GitHub.
