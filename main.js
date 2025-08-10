import { RECIPES, INGREDIENTS } from './recipes.js';

const GAME_DURATION = 60;

// DOM Elements
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const ingredientsBar = document.getElementById('ingredients-bar');
const orderDisplay = document.getElementById('order-display');
const currentDishEl = document.getElementById('current-dish');
const serveButton = document.getElementById('serve-button');
const trashButton = document.getElementById('trash-button');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const customerSprite = document.getElementById('customer-sprite');

// New Workstation Elements
const prepStations = document.querySelectorAll('.prep-station');
const plateContainers = document.querySelectorAll('.plate-container');

// Game State
let score = 0;
let timer = GAME_DURATION;
let currentOrder = null;
let gameInterval = null;

// Represents the state of our two main work slots
let workSlots = [
    {
        order: null,
        station: null, // 'pan-1', 'blender', 'plate-1'
        state: 'empty', // 'empty', 'prepping', 'ready_for_plate', 'on_plate'
        items: [],
        cookInterval: null,
        cookProgress: 0,
        ui: {
            prep: document.querySelector('#pan-1'),
            plate: document.querySelector('#plate-1'),
        }
    },
    {
        order: null,
        station: null,
        state: 'empty',
        items: [],
        cookInterval: null,
        cookProgress: 0,
        ui: {
            prep: document.querySelector('#pan-2'),
            plate: document.querySelector('#plate-2'),
        }
    }
];
// Blender has its own state as it's a single station
let blenderSlot = {
    order: null,
    state: 'empty', // 'empty', 'blending'
    items: [],
    ui: {
        prep: document.querySelector('#blender'),
    }
};

// Audio Context
let audioContext;
const audioBuffers = {};

async function setupAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const sounds = ['select.mp3', 'success.mp3', 'error.mp3', 'trash.mp3'];
    for (const sound of sounds) {
        const response = await fetch(sound);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers[sound] = audioBuffer;
    }
}

function playSound(soundFile) {
    if (!audioContext || !audioBuffers[soundFile]) return;
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers[soundFile];
    source.connect(audioContext.destination);
    source.start(0);
}

function init() {
    renderIngredients();
    bindEvents();
}

function startGame() {
    score = 0;
    timer = GAME_DURATION;
    
    // Reset work slots
    workSlots.forEach(slot => {
        slot.order = null;
        slot.station = null;
        slot.state = 'empty';
        slot.items = [];
        if (slot.cookInterval) clearInterval(slot.cookInterval);
        slot.cookInterval = null;
        slot.cookProgress = 0;
    });
    blenderSlot.order = null;
    blenderSlot.state = 'empty';
    blenderSlot.items = [];

    updateScore(0);
    updateTimer();
    updateAllDisplays();
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }

    gameInterval = setInterval(() => {
        timer--;
        updateTimer();
        if (timer <= 0) {
            endGame();
        }
    }, 1000);

    generateNewOrder();
}

function endGame() {
    clearInterval(gameInterval);
    gameInterval = null;
    finalScoreEl.textContent = score;
    gameOverScreen.classList.add('active');
    customerSprite.style.display = 'none';
    orderDisplay.textContent = "We're closed!";
}

function renderIngredients() {
    ingredientsBar.innerHTML = '';
    INGREDIENTS.forEach(ingredient => {
        const ingEl = document.createElement('div');
        ingEl.classList.add('ingredient');
        ingEl.dataset.id = ingredient.id;
        ingEl.style.backgroundImage = `url(${ingredient.img})`;
        ingEl.title = ingredient.name;
        ingredientsBar.appendChild(ingEl);
    });
}

function generateNewOrder() {
    // For simplicity, we'll only have one order at a time.
    // This can be expanded later to handle multiple orders.
    if (currentOrder) return;

    const randomIndex = Math.floor(Math.random() * RECIPES.length);
    currentOrder = RECIPES[randomIndex];
    
    // Assign order to a work slot
    assignOrderToSlot(currentOrder);
    
    // Update order display to show name and ingredient icons
    orderDisplay.innerHTML = '';
    const orderNameEl = document.createElement('h3');
    orderNameEl.textContent = currentOrder.name;
    
    const ingredientsContainer = document.createElement('div');
    ingredientsContainer.classList.add('order-ingredients-container');

    currentOrder.ingredients.forEach(ingId => {
        const ingredient = INGREDIENTS.find(i => i.id === ingId);
        if(ingredient) {
            const iconEl = document.createElement('div');
            iconEl.classList.add('order-ingredient-icon');
            iconEl.style.backgroundImage = `url(${ingredient.img})`;
            iconEl.title = ingredient.name;
            ingredientsContainer.appendChild(iconEl);
        }
    });

    orderDisplay.appendChild(orderNameEl);
    orderDisplay.appendChild(ingredientsContainer);

    customerSprite.style.display = 'block';
    customerSprite.style.animation = 'none';
    void customerSprite.offsetWidth; // Trigger reflow
    customerSprite.style.animation = 'slideIn 0.5s ease-out forwards';
}

function assignOrderToSlot(order) {
    let targetSlot;
    if (order.type === 'smoothie') {
        if (blenderSlot.state === 'empty') {
            blenderSlot.order = order;
            blenderSlot.state = 'blending';
            blenderSlot.station = 'blender';
            highlightStation(blenderSlot.ui.prep);
        }
    } else if (order.type === 'salad') {
        targetSlot = workSlots.find(s => s.state === 'empty');
        if (targetSlot) {
            targetSlot.order = order;
            targetSlot.state = 'on_plate';
            targetSlot.station = targetSlot.ui.plate.id;
            highlightStation(targetSlot.ui.plate);
        }
    } else if (order.type === 'cooked') {
        targetSlot = workSlots.find(s => s.state === 'empty');
        if (targetSlot) {
            targetSlot.order = order;
            targetSlot.state = 'prepping';
            targetSlot.station = targetSlot.ui.prep.dataset.station;
            highlightStation(targetSlot.ui.prep);
        }
    }
}

function highlightStation(element) {
    // Clear previous highlights
    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
    if (element) {
        element.classList.add('highlight');
    }
}

function handleIngredientClick(e) {
    const target = e.target.closest('.ingredient');
    if (!target || !currentOrder) return;

    playSound('select.mp3');
    const ingredientId = target.dataset.id;
    
    let consumed = false;

    // Check blender first
    if (blenderSlot.state === 'blending' && blenderSlot.order.ingredients.includes(ingredientId)) {
        blenderSlot.items.push(ingredientId);
        consumed = true;
    }

    // Check plate and pan slots
    if (!consumed) {
        for (const slot of workSlots) {
            if (slot.order && slot.order.ingredients.includes(ingredientId)) {
                if (slot.state === 'prepping' || slot.state === 'on_plate') {
                    slot.items.push(ingredientId);
                    
                    // If it's a cooking recipe and all ingredients are in the pan, start cooking
                    if (slot.state === 'prepping' && slot.items.length === slot.order.ingredients.length) {
                        startCooking(slot);
                    }
                    consumed = true;
                    break; 
                }
            }
        }
    }
    
    updateAllDisplays();
}

function startCooking(slot) {
    slot.cookProgress = 0;
    const progressBar = slot.ui.prep.querySelector('.cook-progress');
    const finishButton = slot.ui.prep.querySelector('.finish-cook-button');
    finishButton.style.display = 'block';
    
    slot.cookInterval = setInterval(() => {
        slot.cookProgress += 2; // Speed of cooking
        progressBar.style.width = `${slot.cookProgress}%`;

        if (slot.cookProgress >= 100) {
            finishCooking(slot, true); // Overcooked
        }
    }, 100);
}

function finishCooking(slot, overcooked = false) {
    clearInterval(slot.cookInterval);
    slot.cookInterval = null;
    const finishButton = slot.ui.prep.querySelector('.finish-cook-button');
    finishButton.style.display = 'none';
    const progressBar = slot.ui.prep.querySelector('.cook-progress');
    progressBar.style.width = '0%';

    // Perfect cook is between 70% and 95%
    if (overcooked || slot.cookProgress < 70) {
        playSound('error.mp3');
        slot.items = []; // Ruined food
        slot.state = 'empty';
        slot.order = null;
        // Maybe add visual feedback for burnt food
    } else {
        playSound('success.mp3');
        slot.state = 'ready_for_plate';
        // Items are "cooked", now move them to plate visually
        slot.ui.prep.querySelector('.current-dish').innerHTML = '';
        slot.ui.plate.querySelector('.current-dish').innerHTML = slot.ui.prep.querySelector('.current-dish').innerHTML;
        updateDishDisplay(slot.ui.plate.querySelector('.current-dish'), slot.items);
        highlightStation(slot.ui.plate);
    }
    updateAllDisplays();
}

function updateAllDisplays() {
    updateDishDisplay(blenderSlot.ui.prep.querySelector('.current-dish'), blenderSlot.items);
    workSlots.forEach(slot => {
        const prepDish = slot.ui.prep.querySelector('.current-dish');
        const plateDish = slot.ui.plate.querySelector('.current-dish');
        
        // This logic needs to be state-aware
        if (slot.state === 'prepping') {
            updateDishDisplay(prepDish, slot.items);
            updateDishDisplay(plateDish, []);
        } else if (slot.state === 'ready_for_plate' || slot.state === 'on_plate') {
            updateDishDisplay(prepDish, []);
            updateDishDisplay(plateDish, slot.items);
        } else { // empty
             updateDishDisplay(prepDish, []);
             updateDishDisplay(plateDish, []);
        }
    });
}

function updateDishDisplay(container, items) {
    container.innerHTML = '';
    items.forEach(ingId => {
        const ingredient = INGREDIENTS.find(i => i.id === ingId);
        if (ingredient) {
            const el = document.createElement('div');
            el.classList.add('dish-ingredient');
            el.style.backgroundImage = `url(${ingredient.img})`;
            container.appendChild(el);
        }
    });
}

function handleServe() {
    // This function now needs to check all slots
    let served = false;

    // Check blender
    if (blenderSlot.order) {
        const playerDishStr = blenderSlot.items.slice().sort().join(',');
        const orderIngredientsStr = blenderSlot.order.ingredients.slice().sort().join(',');
        if (playerDishStr === orderIngredientsStr) {
            served = true;
            blenderSlot.state = 'empty';
            blenderSlot.order = null;
            blenderSlot.items = [];
        }
    }

    // Check plate slots
    if (!served) {
        for (const slot of workSlots) {
            if (slot.order && (slot.state === 'on_plate' || slot.state === 'ready_for_plate')) {
                const playerDishStr = slot.items.slice().sort().join(',');
                const orderIngredientsStr = slot.order.ingredients.slice().sort().join(',');
                 if (playerDishStr === orderIngredientsStr) {
                    served = true;
                    slot.state = 'empty';
                    slot.order = null;
                    slot.items = [];
                    break;
                }
            }
        }
    }

    if (served) {
        playSound('success.mp3');
        updateScore(10);
        customerSprite.style.animation = 'slideOut 0.5s ease-in forwards';
        currentOrder = null; // Clear current order
        highlightStation(null); // Clear highlights
        setTimeout(() => {
            generateNewOrder();
        }, 500);
    } else {
        playSound('error.mp3');
        // Handle incorrect serve attempt if needed
    }
    updateAllDisplays();
}

function handleTrash() {
    // A simplified trash that clears everything
    playSound('trash.mp3');
    
    if(currentOrder) {
         if (blenderSlot.order === currentOrder) {
            blenderSlot.state = 'empty';
            blenderSlot.order = null;
            blenderSlot.items = [];
        }
        workSlots.forEach(slot => {
            if(slot.order === currentOrder){
                slot.state = 'empty';
                slot.order = null;
                slot.items = [];
                if(slot.cookInterval) clearInterval(slot.cookInterval);
                const finishButton = slot.ui.prep.querySelector('.finish-cook-button');
                finishButton.style.display = 'none';
                const progressBar = slot.ui.prep.querySelector('.cook-progress');
                progressBar.style.width = '0%';
            }
        });

        // Generate a new order after trashing the current one
        customerSprite.style.animation = 'slideOut 0.5s ease-in forwards';
        currentOrder = null;
        highlightStation(null);
        setTimeout(() => {
            generateNewOrder();
        }, 500);
    }
    
    updateAllDisplays();
}

function updateScore(points) {
    score += points;
    scoreEl.textContent = score;
}

function updateTimer() {
    timerEl.textContent = timer;
}

function bindEvents() {
    ingredientsBar.addEventListener('click', handleIngredientClick);
    serveButton.addEventListener('click', handleServe);
    trashButton.addEventListener('click', handleTrash);

    workSlots.forEach(slot => {
        const finishButton = slot.ui.prep.querySelector('.finish-cook-button');
        if (finishButton) {
            finishButton.addEventListener('click', () => finishCooking(slot));
        }
    });

    startButton.addEventListener('click', async () => {
        if (!audioContext) {
            await setupAudio();
        }
        startGame();
    });
    restartButton.addEventListener('click', startGame);
}

document.addEventListener('DOMContentLoaded', init);