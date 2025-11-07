# Welcome to your Lovable project

## Project info

**URL**: [https://lovable.dev/projects/5aedea86-e4f8-4fa7-b37d-1f2238c18e9c](https://canvas-sync-live.vercel.app/)

Canvas Sync Live

A live-synchronised collaborative canvas application built with modern web technologies.

🚀 Overview

Canvas Sync Live is a web application that enables real-time collaborative drawing, annotation and sharing on a canvas in the browser. It is built using Vite, TypeScript, React, Tailwind CSS, and the UI components from shadcn-ui.

Users can draw, annotate or sketch together and their actions are synchronised live across clients.

✅ Key Features

Real-time canvas updates among multiple users

Drawing, erasing and annotation tools

React + TypeScript frontend with a fast dev workflow

Tailwind CSS for styling and responsive layout

Component-based UI via shadcn-ui

Easy deployment via Vercel (or any static host)

🧰 Tech Stack

Frontend: React + TypeScript

Build tool: Vite

Styling: Tailwind CSS

UI Components: shadcn-ui

Configuration: ESLint, PostCSS, TSConfig, etc.

📦 Getting Started
Prerequisites

Node.js (v16+ recommended)

npm (or yarn/pnpm)

Setup & Run Locally
git clone https://github.com/varun200418/canvas-sync-live.git
cd canvas-sync-live
npm install
npm run dev


This will launch a development server (e.g., at http://localhost:3000) with hot-reload.

Build for Production
npm run build
npm run preview

🌐 Deployment

You can deploy the application by building it, and then hosting the production output on a static hosting platform (for example, Vercel). The project is set up with appropriate config (vite.config.ts, tsconfig.json, tailwind.config.ts) to enable a smooth deploy.

📁 Project Structure
/src           – source code (React components, pages)
 /supabase     – [if using Supabase backend] configuration & functions  
/.env          – environment variables (do **not** commit secrets)  
package.json   
vite.config.ts
tailwind.config.ts
tsconfig.json  

🧩 Usage

Once deployed, users can open the application, access the shared canvas session (via URL or room code if applicable), and begin drawing. Changes made by one user appear for all connected users in real-time.
