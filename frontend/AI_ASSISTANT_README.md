# AI Assistant Frontend - Notion-like Editor

A modern AI assistant frontend built with React, TypeScript, and Tailwind CSS, inspired by Notion AI.

## Features

### ✨ Core Features
- **Rich Text Editor**: Built with TipTap, providing a clean, minimal editing experience
- **AI Command Menu**: Floating menu triggered by "/" or button click
- **AI Actions**: 
  - Continue writing
  - Add a summary
  - Add action items
  - Make a flowchart
  - Make a table
  - Write anything
- **Inline AI Responses**: AI responses appear inline below the text (Notion-style)
- **Keyboard Navigation**: Full keyboard support (↑ ↓ Enter Esc)
- **Loading Indicators**: Smooth loading animations while AI is processing
- **Dark Mode**: Full dark mode support with theme toggle
- **Accessibility**: ARIA roles and keyboard navigation

### 🎨 Design
- Clean, minimal Notion-like UI
- Soft gray backgrounds
- Rounded cards with subtle shadows
- Smooth animations using Framer Motion
- Responsive design

## Project Structure

```
frontend/src/
├── components/
│   ├── AICommandMenu.tsx      # Floating AI command menu
│   ├── AIResponseBlock.tsx    # Inline AI response display
│   ├── AIEditor.tsx            # Main TipTap editor with AI integration
│   ├── ThemeToggle.tsx         # Dark mode toggle
│   └── ui/
│       ├── Button.tsx          # Reusable button component
│       └── Card.tsx            # Reusable card component
├── pages/
│   └── AIEditorPage.tsx        # Main AI editor page
└── api/
    └── ai.ts                   # AI API client
```

## Key Components

### AIEditor
The main editor component that integrates TipTap with AI functionality:
- Handles "/" slash commands
- Manages text selection
- Coordinates AI requests and responses
- Provides toolbar with AI assistant button

### AICommandMenu
Floating command menu with:
- Searchable command list
- Keyboard navigation (arrow keys, Enter, Esc)
- Visual feedback for selected items
- Context-aware positioning

### AIResponseBlock
Displays AI responses with:
- Loading states
- Copy to clipboard
- Insert into document
- Dismiss functionality

## Usage

### Access the AI Editor
Navigate to `/ai-editor` in your application (protected route).

### Using AI Commands

1. **Slash Command**: Type "/" at the start of a line to open the AI command menu
2. **Button Click**: Click the "AI Assistant" button in the toolbar
3. **Text Selection**: Select text and open the menu to get context-aware responses

### Keyboard Shortcuts
- `/` - Open AI command menu
- `↑` / `↓` - Navigate commands
- `Enter` - Select command
- `Esc` - Close menu

### AI Actions

- **Continue writing**: AI continues from where you left off
- **Add a summary**: Creates a concise summary of selected text
- **Add action items**: Extracts action items from text
- **Make a flowchart**: Creates a flowchart representation
- **Make a table**: Converts text into table format
- **Write anything**: Free-form AI writing

## API Integration

The frontend connects to the backend AI endpoint at `/ai/ask`:

```typescript
POST /ai/ask
{
  "context": "Full document content",
  "question": "AI prompt/question"
}

Response:
{
  "answer": "AI generated response"
}
```

## Styling

The project uses Tailwind CSS with:
- Custom dark mode support (class-based)
- Typography plugin for prose styling
- Custom color scheme matching Notion's aesthetic

## Dependencies

- `@tiptap/react` - Rich text editor
- `@tiptap/starter-kit` - TipTap extensions
- `@tiptap/extension-placeholder` - Placeholder support
- `framer-motion` - Animations
- `lucide-react` - Icons
- `@tailwindcss/typography` - Typography plugin

## Development

```bash
cd frontend
npm install
npm run dev
```

The editor will be available at `http://localhost:5173/ai-editor` (or your configured port).

## Future Enhancements

- [ ] Slash command shortcuts (/summary, /table, etc.)
- [ ] AI response editing
- [ ] Multiple AI response blocks
- [ ] AI conversation history
- [ ] Export functionality
- [ ] Collaborative AI editing

