# GlobalFreight AI Platform - Next.js Frontend

Modern, high-performance frontend built with Next.js 15, TypeScript, Tailwind CSS, and Framer Motion.

## 🚀 Features

### Enhanced Visuals
- **Liquid Glass Design**: Deep glassmorphism with 30px blur, layered shadows, and gradient overlays
- **Smooth Animations**: Framer Motion for fluid transitions and micro-interactions
- **Compact Tab Switcher**: Space-efficient design with gradient accents
- **Beautiful Level 2**: Enhanced three-panel layout with glowing effects

### Technical Stack
- **Next.js 15**: Latest App Router with React Server Components
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling with custom glass effects
- **Framer Motion**: Production-ready animation library
- **Lucide React**: Beautiful, consistent icons

## 📦 Installation

```bash
cd frontend
npm install
```

## 🏃 Running the Application

### Development Mode
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm start
```

## 🎨 Design System

### Colors
- **Neon Green**: `#00ff88` - Primary accent
- **Neon Blue**: `#00d4ff` - Secondary accent
- **Glass Layers**: Multiple opacity levels for depth

### Components

#### GlassCard
Reusable glass morphism card with:
- 30px backdrop blur
- Gradient backgrounds
- Layered shadows with colored glows
- Top highlight line
- Hover animations

#### TabSwitcher
Compact tab navigation with:
- Horizontal layout
- Icon + label design
- Gradient top border on active
- Smooth transitions with layoutId

#### Level 1 - RAG Assistant
- Chat interface with animated messages
- Sample query buttons
- Document management
- Real-time typing indicators

#### Level 2 - Exception Handler
- Three-panel layout (320px | flex | 380px)
- Event list with severity badges
- Detailed event viewer
- Control panel with guardrail status
- Results display with animations

## 🔧 Configuration

### Environment Variables
Create `.env.local`:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5001
```

### Tailwind Config
Custom utilities in `tailwind.config.ts`:
- Glass effects
- Neon shadows
- Custom animations
- Gradient presets

## 📁 Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page with tab switching
│   └── globals.css         # Global styles
├── components/
│   ├── Header.tsx          # App header with status
│   ├── TabSwitcher.tsx     # Tab navigation
│   ├── GlassCard.tsx       # Reusable glass card
│   ├── Level1/
│   │   ├── Level1.tsx      # RAG Assistant main
│   │   └── ChatContainer.tsx
│   └── Level2/
│       ├── Level2.tsx      # Exception Handler main
│       ├── EventList.tsx   # Event stream list
│       ├── EventDetails.tsx
│       └── ControlPanel.tsx
├── public/
│   └── data/               # Copy event_stream.json here
└── tailwind.config.ts      # Tailwind configuration
```

## 🎯 Key Improvements Over Vanilla HTML/CSS

1. **Component Reusability**: DRY principle with React components
2. **Type Safety**: TypeScript catches errors at compile time
3. **Better State Management**: React hooks for clean state logic
4. **Optimized Performance**: Automatic code splitting and lazy loading
5. **Smooth Animations**: Framer Motion for production-ready animations
6. **Better Developer Experience**: Hot reload, better debugging
7. **SEO Ready**: Server-side rendering capabilities
8. **Maintainability**: Organized file structure and clear separation of concerns

## 🎨 Animation Features

### Framer Motion Animations
- **Page transitions**: Fade and slide between tabs
- **List animations**: Staggered entry for event items
- **Hover effects**: Scale and translate on interaction
- **Loading states**: Shimmer effects on buttons
- **Layout animations**: Smooth tab indicator movement
- **Scroll animations**: Reveal on scroll for cards

### Custom Animations
- **Gradient shift**: Background animation (20s loop)
- **Pulse glow**: Warning state animation
- **Shimmer**: Progress bar shine effect
- **Status pulse**: Connection indicator

## 🔌 Backend Integration

The frontend connects to the Python backend at `http://localhost:5001`:

### Endpoints Used
- `GET /health` - Backend health check
- `POST /query` - Level 1 RAG queries
- `POST /process-event` - Level 2 event processing
- `GET /documents` - Document management
- `GET /guardrail-status` - Safety guardrail status

## 📱 Responsive Design

- Desktop-first approach
- Grid layouts with auto-fit
- Flexible spacing with Tailwind
- Mobile breakpoints ready for implementation

## 🚀 Performance Optimizations

- Automatic code splitting by Next.js
- Image optimization (if images added)
- CSS purging in production
- Component lazy loading
- Memoization where needed

## 🛠️ Development Tips

### Adding New Components
1. Create in `components/` directory
2. Use TypeScript for props
3. Apply glass effects with utility classes
4. Add Framer Motion for animations

### Styling Guidelines
- Use Tailwind utilities first
- Custom CSS in `globals.css` for complex effects
- Maintain consistent spacing (4px grid)
- Use semantic color names

### Animation Best Practices
- Keep animations under 0.5s for interactions
- Use `cubic-bezier` for natural easing
- Respect `prefers-reduced-motion`
- Test on lower-end devices

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)

## 🐛 Troubleshooting

### Backend Connection Issues
- Ensure backend is running on port 5001
- Check CORS settings in backend
- Verify `.env.local` configuration

### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run type-check`

### Styling Issues
- Rebuild Tailwind: `npm run dev` (auto-rebuilds)
- Check browser compatibility for backdrop-filter
- Verify custom utilities in `tailwind.config.ts`

## 📄 License

Same as parent project.
