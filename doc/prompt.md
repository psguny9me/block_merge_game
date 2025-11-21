# Block Merge Game Implementation Prompt

I want to build a web-based "Block Merge Game" using HTML5 Canvas, Vanilla JavaScript, and the Matter.js physics engine.

## Core Concept
A physics-based puzzle game where players drop blocks from the top of the screen. When blocks of the same color collide, they merge into a larger block. The goal is to score points and prevent the stack of blocks from reaching the top.

## Tech Stack
- **HTML5**: For game container and UI overlays.
- **CSS3**: For styling, responsive design, and animations.
- **JavaScript (Vanilla)**: Game logic.
- **Matter.js**: For 2D physics (gravity, collisions, bouncing).

## Key Features & Mechanics

### 1. Physics & Controls
- **Engine**: Use Matter.js for realistic physics.
- **Walls**: Static ground and side walls to keep blocks inside.
- **Input**: 
    - Mouse click or Touch to spawn a block at that X-coordinate (clamped within walls).
    - Spawn height should be fixed near the top.
- **Bounciness**: Blocks should have restitution (0.6) and friction (0.5) for a satisfying "bouncy" feel.

### 2. Block Spawning
- **Colors**: Use a colorblind-friendly palette (e.g., Okabe-Ito).
- **Next Block**: Display the color of the *next* block to be dropped in a UI preview.
- **Randomness**: Randomly select colors from the currently unlocked set.

### 3. Merge Logic
- **Rule**: When two blocks of the **same color** collide, they merge.
- **Result**:
    - Remove the two old blocks.
    - Create one new block at the midpoint.
    - **Size Calculation**: The new block's area must equal the sum of the two old blocks' areas (`newSize = sqrt(sizeA^2 + sizeB^2)`).
    - **Pop Effect**: Apply a small upward velocity to the new block to make it "pop" up, creating space and visual feedback. Heavier (larger) blocks should pop less (`velocity.y = -12 / sqrt(mass)`).

### 4. Special Mechanics
- **Black Hole**: If a block's mass (number of merged base blocks) reaches 15:
    - It explodes (remove from world).
    - Show a particle explosion effect.
    - Award bonus points (+50).
- **Progression**:
    - Start with 4 colors.
    - Unlock a new color every 200 points (max 8 colors).
    - Show a toast notification when a new color is unlocked.
- **Auto-Drop (Sudden Death)**:
    - Once all 8 colors are unlocked, enable Auto-Drop.
    - If the player doesn't drop a block within a time limit, the game drops one automatically.
    - **Timer Logic**: Starts at 10s. Reduces by 1s for every 200 points gained after unlocking, down to a minimum of 2s.

### 5. Scoring & Game Over
- **Score**: +1 per drop, +10 per merge, +50 per Black Hole.
- **Game Over**: If a block stays near the top of the screen (y < 80) and is stable (low velocity) for a moment.
- **Restart**: "Play Again" button resets the game state completely.

### 6. UI & Polish
- **Dark Theme**: Dark radial gradient background.
- **Mobile Responsive**:
    - Canvas width should fit the screen (`max-width: 100%`, `height: 100svh`).
    - Handle `safe-area-inset` for iOS devices (padding at bottom).
    - Raise the physics ground level (e.g., by 120px) to ensure the play area is visible above mobile browser UI bars.
- **Tutorial**: Show a start screen overlay with instructions.
- **Localization**: All text should be in Korean.

## Implementation Steps
1.  Setup `index.html` with Matter.js CDN and UI structure.
2.  Create `style.css` for the dark theme and responsive layout.
3.  Initialize Matter.js engine in `game.js`.
4.  Implement block spawning and input handling (mouse/touch).
5.  Implement collision detection (`collisionStart` event) and merge logic.
6.  Add game loop features: Score, Game Over, Next Block.
7.  Implement advanced features: Black Hole, Progression, Auto-Drop.
8.  Polish: Particle effects, Merge Pop, Notifications.
9.  Mobile Optimization: Safe area handling, `svh` units, touch events.
