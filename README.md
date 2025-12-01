<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1-3hGBkeijY-cFOZ6g7vj9zkcxFmFoegg

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.local.example](.env.local.example) to `.env.local` and set one of the supported AI keys:
   - `VITE_CHATGPT_API_KEY` (preferred) for OpenAI/ChatGPT.
   - `VITE_GEMINI_API_KEY` for Google Gemini (Gemini still works as the fallback).
3. Run the app:
   `npm run dev`
