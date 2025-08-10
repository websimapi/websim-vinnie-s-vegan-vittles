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

// Game State
let score = 0;
let timer = GAME_DURATION;
let currentOrder = null;
let playerDish = [];
let gameInterval = null;

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
    playerDish = [];
    updateScore(0);
    updateTimer();
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
    updateDishDisplay();
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
    const randomIndex = Math.floor(Math.random() * RECIPES.length);
    currentOrder = RECIPES[randomIndex];
    orderDisplay.textContent = currentOrder.name;
    customerSprite.style.display = 'block';
    customerSprite.style.animation = 'none';
    void customerSprite.offsetWidth; // Trigger reflow
    customerSprite.style.animation = 'slideIn 0.5s ease-out forwards';
}

function handleIngredientClick(e) {
    const target = e.target.closest('.ingredient');
    if (!target || !currentOrder) return;
    
    playSound('select.mp3');
    const ingredientId = target.dataset.id;
    playerDish.push(ingredientId);
    updateDishDisplay();
}

function updateDishDisplay() {
    currentDishEl.innerHTML = '';
    playerDish.forEach(ingId => {
        const ingredient = INGREDIENTS.find(i => i.id === ingId);
        const el = document.createElement('div');
        el.classList.add('dish-ingredient');
        el.style.backgroundImage = `url(${ingredient.img})`;
        currentDishEl.appendChild(el);
    });
}

function handleServe() {
    if (!currentOrder || playerDish.length === 0) return;

    const playerDishStr = playerDish.slice().sort().join(',');
    const orderIngredientsStr = currentOrder.ingredients.slice().sort().join(',');

    if (playerDishStr === orderIngredientsStr) {
        playSound('success.mp3');
        updateScore(10);
        
        customerSprite.style.animation = 'slideOut 0.5s ease-in forwards';
        setTimeout(() => {
            generateNewOrder();
        }, 500);

    } else {
        playSound('error.mp3');
        // Maybe add a visual indicator for wrong order
    }
    clearDish();
}

function handleTrash() {
    if (playerDish.length > 0) {
        playSound('trash.mp3');
    }
    clearDish();
}

function clearDish() {
    playerDish = [];
    updateDishDisplay();
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
    startButton.addEventListener('click', async () => {
        if (!audioContext) {
            await setupAudio();
        }
        startGame();
    });
    restartButton.addEventListener('click', startGame);
}

document.addEventListener('DOMContentLoaded', init);

