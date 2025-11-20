const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Events = Matter.Events,
    Body = Matter.Body;

// Game State
let engine;
let render;
let runner;
let score = 0;
let isGameOver = false;
let nextColor = null;
let activeColorCount = 4;
let autoDropTimer = null;
let autoDropTimeRemaining = 10.0; // Default start
let lastTime = 0;

// Colorblind Friendly Palette (Okabe-Ito)
const COLORS = [
    '#E69F00', // Orange
    '#56B4E9', // Sky Blue
    '#009E73', // Bluish Green
    '#F0E442', // Yellow
    '#0072B2', // Blue
    '#D55E00', // Vermilion
    '#CC79A7', // Reddish Purple
    '#999999'  // Grey
];

const GAME_WIDTH = 400; // Reduced to 2/3 (was 600)
const GAME_HEIGHT = 800;
const WALL_THICKNESS = 60;

// DOM Elements
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const gameOverEl = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const nextBlockPreview = document.getElementById('next-block-preview');
const colorCountEl = document.getElementById('color-count');
const timerContainerEl = document.getElementById('timer-container');
const timerEl = document.getElementById('timer');
const notificationEl = document.getElementById('notification');
const tutorialOverlay = document.getElementById('tutorial-overlay');
const startBtn = document.getElementById('start-btn');

function init() {
    // Init next color based on active count
    nextColor = COLORS[Math.floor(Math.random() * activeColorCount)];
    updateNextBlockUI();
    updateStatsUI();

    // Create engine
    engine = Engine.create();

    // Create renderer
    render = Render.create({
        element: document.getElementById('game-container'),
        engine: engine,
        options: {
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            wireframes: false,
            background: '#222'
        }
    });

    // Create walls
    const ground = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + WALL_THICKNESS / 2 - 10, GAME_WIDTH, WALL_THICKNESS, { isStatic: true, render: { fillStyle: '#555' } });
    const leftWall = Bodies.rectangle(0 - WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2, { isStatic: true, render: { fillStyle: '#555' } });
    const rightWall = Bodies.rectangle(GAME_WIDTH + WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2, { isStatic: true, render: { fillStyle: '#555' } });

    Composite.add(engine.world, [ground, leftWall, rightWall]);

    // Run the renderer
    Render.run(render);

    // Create runner
    runner = Runner.create();
    // Don't run yet, wait for start
    // Runner.run(runner, engine);

    // Event Listeners
    render.canvas.addEventListener('mousedown', handleInput);
    render.canvas.addEventListener('touchstart', handleInput, { passive: false });

    Events.on(engine, 'collisionStart', handleCollisions);
    Events.on(engine, 'afterUpdate', (event) => {
        checkGameOver();
        handleAutoDrop(event);
        updateParticles();
    });
    restartBtn.addEventListener('click', resetGame);
    startBtn.addEventListener('click', startGame);
}

function startGame() {
    tutorialOverlay.classList.add('hidden');
    Runner.run(runner, engine);
}

function showNotification(text) {
    notificationEl.textContent = text;
    notificationEl.classList.remove('hidden');
    setTimeout(() => {
        notificationEl.classList.add('hidden');
    }, 2000);
}

// Particle System
let particles = [];

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
        const particle = Bodies.circle(x, y, 3 + Math.random() * 5, {
            render: { fillStyle: color },
            frictionAir: 0.05,
            restitution: 0.8
        });

        Body.setVelocity(particle, {
            x: (Math.random() - 0.5) * 15,
            y: (Math.random() - 0.5) * 15
        });

        Composite.add(engine.world, particle);
        particles.push({ body: particle, life: 60 }); // 60 frames life
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].life--;
        if (particles[i].life <= 0) {
            Composite.remove(engine.world, particles[i].body);
            particles.splice(i, 1);
        } else {
            // Fade out effect (Matter.js render doesn't support opacity easily without custom loop, 
            // but we can shrink them)
            Body.scale(particles[i].body, 0.95, 0.95);
        }
    }
}

function handleAutoDrop(event) {
    if (isGameOver || activeColorCount < 8) return;

    const delta = event.source.timing.lastDelta; // ms
    autoDropTimeRemaining -= delta / 1000;

    if (autoDropTimeRemaining <= 0) {
        // Auto drop!
        const randomX = 30 + Math.random() * (GAME_WIDTH - 60);
        spawnBlock(randomX, 50, nextColor);
        updateScore(1);

        // Reset timer and next color
        autoDropTimeRemaining = getAutoDropInterval();
        nextColor = COLORS[Math.floor(Math.random() * activeColorCount)];
        updateNextBlockUI();
    }

    timerEl.textContent = Math.max(0, autoDropTimeRemaining).toFixed(1);
}

function handleInput(event) {
    if (isGameOver) return;

    // Prevent default touch behavior (scrolling)
    if (event.type === 'touchstart') {
        event.preventDefault();
    }

    // Reset auto-drop timer on manual input if active
    if (activeColorCount >= 8) {
        autoDropTimeRemaining = getAutoDropInterval();
    }

    const rect = render.canvas.getBoundingClientRect();

    // Get clientX from mouse or touch
    let clientX;
    if (event.type === 'touchstart') {
        clientX = event.touches[0].clientX;
    } else {
        clientX = event.clientX;
    }

    // Calculate x relative to canvas and scale it
    // Scale factor = Internal Width / Displayed Width
    const scaleX = GAME_WIDTH / rect.width;
    const x = (clientX - rect.left) * scaleX;

    // Clamp x to be within walls
    const spawnX = Math.max(30, Math.min(x, GAME_WIDTH - 30));

    spawnBlock(spawnX, 50, nextColor);

    // Update Score for drop
    updateScore(1);

    // Set new next color
    nextColor = COLORS[Math.floor(Math.random() * activeColorCount)];
    updateNextBlockUI();
}

function spawnBlock(x, y, color = null, size = 40, mass = 1) {
    const chosenColor = color || COLORS[Math.floor(Math.random() * activeColorCount)];

    const block = Bodies.rectangle(x, y, size, size, {
        restitution: 0.6, // Bounciness
        friction: 0.5,
        render: {
            fillStyle: chosenColor,
            strokeStyle: '#fff',
            lineWidth: 2
        },
        label: 'block',
        custom: {
            color: chosenColor,
            size: size,
            mass: mass
        }
    });

    Composite.add(engine.world, block);
    return block;
}

function handleCollisions(event) {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        if (bodyA.label === 'block' && bodyB.label === 'block') {
            // Check if they are valid for merge (same color)
            // Size check removed as per user request: any same color blocks merge
            if (bodyA.custom.color === bodyB.custom.color) {

                // Merge!
                mergeBlocks(bodyA, bodyB);
            }
        }
    }
}

function mergeBlocks(bodyA, bodyB) {
    // Remove old bodies
    Composite.remove(engine.world, [bodyA, bodyB]);

    // Calculate new position (midpoint)
    const midX = (bodyA.position.x + bodyB.position.x) / 2;
    const midY = (bodyA.position.y + bodyB.position.y) / 2;

    // Calculate new size (Area A + Area B = New Area)
    // Size is side length. Area = size^2.
    // New Size = sqrt(sizeA^2 + sizeB^2)
    const areaA = Math.pow(bodyA.custom.size, 2);
    const areaB = Math.pow(bodyB.custom.size, 2);
    const newSize = Math.sqrt(areaA + areaB);

    // Calculate new mass
    const newMass = (bodyA.custom.mass || 1) + (bodyB.custom.mass || 1);

    // Check for Black Hole (Mass >= 15)
    if (newMass >= 15) {
        // Create explosion/implosion effect (simple visual for now)
        createExplosion(midX, midY, bodyA.custom.color);

        // Just remove them and maybe add score bonus
        updateScore(50); // Bonus for clearing
        // We don't spawn a new block
    } else {
        const newBlock = spawnBlock(midX, midY, bodyA.custom.color, newSize, newMass);

        // Apply "Pop" effect (Upward velocity)
        // Heavier blocks pop less (Inverse to mass)
        // Base pop for mass 1 is around -10 to -12
        // Formula: -12 / sqrt(mass)
        const popStrength = 12 / Math.sqrt(newMass);

        Body.setVelocity(newBlock, {
            x: (Math.random() - 0.5) * 2, // Slight random horizontal movement
            y: -popStrength
        });
    }

    // Update Score for merge
    updateScore(10);
}

function updateScore(points) {
    score += points;
    scoreEl.textContent = score;

    // Check Progression
    // Start with 4. Add 1 every 200 points. Max 8.
    // 0-199: 4
    // 200-399: 5
    // 400-599: 6
    // 600-799: 7
    // 800+: 8
    const targetCount = Math.min(8, 4 + Math.floor(score / 200));
    if (targetCount > activeColorCount) {
        activeColorCount = targetCount;
        updateStatsUI();
        showNotification(`새로운 색상 잠금 해제! (${activeColorCount}/8)`);
    }
}

function getAutoDropInterval() {
    // Base: 10s at 800 points (when 8 colors unlock)
    // Reduce by 1s for every 200 points above 800
    // Min: 2s

    if (score < 800) return 10.0;

    const extraScore = score - 800;
    const reduction = Math.floor(extraScore / 200);
    const interval = 10.0 - reduction;

    return Math.max(2.0, interval);
}

function updateStatsUI() {
    colorCountEl.textContent = `색상: ${activeColorCount}/8`;
    if (activeColorCount >= 8) {
        timerContainerEl.classList.remove('hidden');
    } else {
        timerContainerEl.classList.add('hidden');
    }
}

function updateNextBlockUI() {
    nextBlockPreview.style.backgroundColor = nextColor;
    nextBlockPreview.style.boxShadow = `0 0 15px ${nextColor}`;
}

function checkGameOver() {
    if (isGameOver) return;

    const bodies = Composite.allBodies(engine.world);

    for (let body of bodies) {
        if (body.label === 'block' && !body.isStatic) {
            // Check if body is high enough and relatively stable (not just spawned)
            // We check if y < 100 (near top) and velocity is low
            if (body.position.y < 100 && body.speed < 0.5) {
                // Give a grace period for newly spawned blocks? 
                // Actually, if it's stable at y < 100, it's game over.
                // But we spawn at y=50. So we need to be careful not to kill immediately.
                // Let's say if it's resting above y=100? No, y=0 is top.
                // Spawn is at 50. If stack reaches ~100, it's close.
                // Let's trigger if a block STAYS above 100 for a bit?
                // Simple check: if many blocks are high up.

                // Let's use a "Dead Line" at y=100.
                // If a block is above this line and NOT the one just spawned...
                // It's tricky to distinguish. 
                // Let's just say if y < 80 and speed < 0.1
                if (body.position.y < 80 && body.speed < 0.1) {
                    triggerGameOver();
                }
            }
        }
    }
}

function triggerGameOver() {
    isGameOver = true;
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
    Runner.stop(runner);
}

function resetGame() {
    // Clear world
    Composite.clear(engine.world);
    Engine.clear(engine);

    // Reset state
    score = 0;
    scoreEl.textContent = '0';
    isGameOver = false;
    activeColorCount = 4;
    autoDropTimeRemaining = 10.0;
    gameOverEl.classList.add('hidden');
    updateStatsUI();

    // Reset next color
    nextColor = COLORS[Math.floor(Math.random() * activeColorCount)];
    updateNextBlockUI();

    // Re-init (simplest way is to reload or just clear and rebuild)
    // We need to keep the engine running or restart it.
    // Let's just clear bodies and add walls back.

    const ground = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT + WALL_THICKNESS / 2 - 10, GAME_WIDTH, WALL_THICKNESS, { isStatic: true, render: { fillStyle: '#555' } });
    const leftWall = Bodies.rectangle(0 - WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2, { isStatic: true, render: { fillStyle: '#555' } });
    const rightWall = Bodies.rectangle(GAME_WIDTH + WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2, { isStatic: true, render: { fillStyle: '#555' } });

    Composite.add(engine.world, [ground, leftWall, rightWall]);

    Runner.run(runner, engine);
}

// Start
init();
