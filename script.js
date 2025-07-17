document.addEventListener('DOMContentLoaded', () => {
    // Game State
    let gameState = {
        potatoes: 0,
        totalPps: 0,
        clickPower: 1,
        clickUpgradeCost: 10,
    };

    // DOM Elements
    const potatoDisplay = document.getElementById('potatoes');
    const ppsDisplay = document.getElementById('pps');
    const potatoImg = document.getElementById('potato');
    const potatoTextOverlay = document.getElementById('potato-text-overlay');
    const generatorsContainer = document.getElementById('generators-container');
    const upgradesContainer = document.getElementById('upgrades-container');
    const clickUpgradeCostDisplay = document.getElementById('click-upgrade-cost');
    const buyClickUpgradeBtn = document.getElementById('buy-click-upgrade');
    const clickPowerDisplay = document.getElementById('click-power-display');

    // Golden Potato & Buff Elements
    const goldenPotatoContainer = document.getElementById('golden-potato-container');
    const buffDisplay = document.getElementById('buff-display');

    // Settings Modal Elements
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = settingsModal.querySelector('.close-btn');
    const manualSaveBtn = document.getElementById('manual-save-btn');
    const wipeSaveBtn = document.getElementById('wipe-save-btn');

    // Generator Definitions from GDD
    let generators = [
        { id: 'sprout', name: 'Potato Sprout', description: "A tiny, hopeful green shoot.", baseCost: 15, basePps: 1, owned: 0 },
        { id: 'farmer', name: 'Tater Tot Farmer', description: "A stout, grumpy-looking potato person.", baseCost: 100, basePps: 8, owned: 0 },
        { id: 'cannon', name: 'Potato Cannon', description: "Launches potatoes into a giant pile.", baseCost: 1100, basePps: 55, owned: 0 },
        { id: 'factory', name: 'Fryer Factory', description: "Turns raw spuds into valuable fries.", baseCost: 12000, basePps: 320, owned: 0 },
        { id: 'couch', name: 'Couch Potato', description: "Generates spuds via sheer willpower.", baseCost: 130000, basePps: 1900, owned: 0 },
        { id: 'spudnik', name: 'Spudnik Satellite', description: "Beams down potato-multiplying energy.", baseCost: 1400000, basePps: 12000, owned: 0 },
        { id: 'planet', name: 'Potato Planet', description: "Harvest it with giant space-tractors.", baseCost: 20000000, basePps: 85000, owned: 0 },
        { id: 'portal', name: 'Potato-Verse Portal', description: "Siphons potatoes from alternate dimensions.", baseCost: 330000000, basePps: 666666, owned: 0 },
        { id: 'tuber', name: 'The Great Tuber', description: "Its snores generate reality-bending potatoes.", baseCost: 5100000000, basePps: 9876543, owned: 0 },
    ];

    // --- Initialization ---
    function init() {
        loadGame();
        populateGenerators();
        addEventListeners();
        recalculatePps();
        setInterval(gameLoop, 1000);
        setInterval(saveGame, 30000);
        setTimeout(trySpawnGoldenPotato, getRandomGoldenPotatoTime()); // Start the golden potato timer
    }

    function populateGenerators() {
        // Clear the container before repopulating
        generatorsContainer.innerHTML = ''; 
        generators.forEach(gen => {
            const elem = document.createElement('div');
            elem.id = `gen-${gen.id}`;
            elem.className = 'generator disabled';
            elem.innerHTML = `
                <div class="generator-info">
                    <h3>${gen.name}</h3>
                    <p>${gen.description}</p>
                    <p>PPS: ${gen.basePps} each</p>
                </div>
                <div class="generator-details">
                    <p class="cost">Cost: <span id="cost-${gen.id}">${formatNumber(gen.baseCost)}</span></p>
                    <p class="generator-owned" id="owned-${gen.id}">0</p>
                </div>
            `;
            elem.addEventListener('click', () => buyGenerator(gen));
            generatorsContainer.appendChild(elem);
        });
        // We need to call updateDisplay once after populating to set initial states
        updateDisplay();
    }

    // --- Event Listeners ---
    function addEventListeners() {
        potatoImg.addEventListener('click', handlePotatoClick);
        buyClickUpgradeBtn.addEventListener('click', buyClickUpgrade);

        // Settings listeners
        settingsBtn.addEventListener('click', () => settingsModal.style.display = 'flex');
        closeModalBtn.addEventListener('click', () => settingsModal.style.display = 'none');
        manualSaveBtn.addEventListener('click', () => {
            saveGame();
            alert("Game Saved!");
        });
        wipeSaveBtn.addEventListener('click', wipeSave);
    }

    function handlePotatoClick(event) {
        gameState.potatoes += gameState.clickPower;
        createFloatingText(event.clientX, event.clientY, `+${gameState.clickPower}`);
        updateDisplay();
    }

    // --- Buying Logic ---
    function buyGenerator(gen) {
        const currentCost = calculateCost(gen);
        if (gameState.potatoes >= currentCost) {
            gameState.potatoes -= currentCost;
            gen.owned++;
            recalculatePps();
            updateDisplay();
        }
    }

    function buyClickUpgrade() {
        if (gameState.potatoes >= gameState.clickUpgradeCost) {
            gameState.potatoes -= gameState.clickUpgradeCost;
            gameState.clickPower++;
            gameState.clickUpgradeCost = Math.ceil(gameState.clickUpgradeCost * 1.25);
            updateDisplay();
        }
    }

    // --- Game Loop & Updates ---
    function gameLoop() {
        let ppsThisSecond = gameState.totalPps;

        // Apply buffs
        if (gameState.buffs.fryFrenzy) {
            ppsThisSecond *= 777;
        }

        gameState.potatoes += ppsThisSecond;
        updateDisplay();
    }

    function updateDisplay() {
        // Update main stats
        potatoDisplay.textContent = formatNumber(Math.floor(gameState.potatoes));
        ppsDisplay.textContent = formatNumber(gameState.totalPps);

        // Update click upgrade
        clickUpgradeCostDisplay.textContent = formatNumber(gameState.clickUpgradeCost);
        clickPowerDisplay.textContent = formatNumber(gameState.clickPower);
        buyClickUpgradeBtn.disabled = gameState.potatoes < gameState.clickUpgradeCost;
        document.getElementById('click-upgrade').classList.toggle('disabled', gameState.potatoes < gameState.clickUpgradeCost);


        // Update generators
        generators.forEach(gen => {
            const cost = calculateCost(gen);
            const genElement = document.getElementById(`gen-${gen.id}`);
            if (genElement) {
                genElement.querySelector(`#cost-${gen.id}`).textContent = formatNumber(cost);
                genElement.querySelector(`#owned-${gen.id}`).textContent = gen.owned;
                genElement.classList.toggle('disabled', gameState.potatoes < cost);
            }
        });

        // Update buff display
        updateBuffDisplay();
    }

    // --- Golden Potato Logic ---
    function trySpawnGoldenPotato() {
        // If a golden potato already exists, don't spawn another
        if (goldenPotatoContainer.hasChildNodes()) {
            // Reset timer and try again later
            setTimeout(trySpawnGoldenPotato, getRandomGoldenPotatoTime());
            return;
        }

        const goldenPotato = document.createElement('div');
        goldenPotato.className = 'golden-potato';

        // Random position within the game container
        const gameRect = document.getElementById('game-container').getBoundingClientRect();
        const x = Math.random() * (gameRect.width - 100); // -100 to keep it from spawning off-edge
        const y = Math.random() * (gameRect.height - 100);
        goldenPotato.style.left = `${x}px`;
        goldenPotato.style.top = `${y}px`;

        goldenPotato.addEventListener('click', handleGoldenPotatoClick);
        goldenPotatoContainer.appendChild(goldenPotato);

        // Despawn after a certain time
        setTimeout(() => {
            goldenPotato.remove();
            // After it despawns (or is clicked), set a timer for the next one
            setTimeout(trySpawnGoldenPotato, getRandomGoldenPotatoTime());
        }, 10000); // Golden potato lasts for 10 seconds
    }

    function handleGoldenPotatoClick(event) {
        const potato = event.target;
        potato.remove(); // Remove it immediately

        // Give a random reward
        const roll = Math.random();
        if (roll < 0.9) { // 90% chance for Fry Frenzy
            activateBuff('fryFrenzy', 77);
        } else { // 10% chance for a lump sum
            const lumpSum = (gameState.totalPps * 60 * 15) + 13; // 15 mins of production + 13
            gameState.potatoes += lumpSum;
            createFloatingText(event.clientX, event.clientY, `+${formatNumber(lumpSum)}!`);
        }

        // Don't reset the main timer here, let the despawn timer handle it
    }

    function getRandomGoldenPotatoTime() {
        // Returns a random time between 5 and 15 minutes in milliseconds
        return (Math.random() * 600000) + 300000;
    }

    // --- Buff Logic ---
    function activateBuff(buffName, durationSeconds) {
        gameState.buffs = gameState.buffs || {};
        
        // If buff is already active, just reset its timer
        if (gameState.buffs[buffName]) {
            clearTimeout(gameState.buffs[buffName].timerId);
        }

        gameState.buffs[buffName] = {
            endTime: Date.now() + durationSeconds * 1000,
            timerId: setTimeout(() => {
                delete gameState.buffs[buffName];
                updateBuffDisplay();
            }, durationSeconds * 1000)
        };
        updateBuffDisplay();
    }

    function updateBuffDisplay() {
        buffDisplay.innerHTML = '';
        if (!gameState.buffs) return;

        for (const buffName in gameState.buffs) {
            const buff = gameState.buffs[buffName];
            const timeLeft = Math.ceil((buff.endTime - Date.now()) / 1000);
            if (timeLeft > 0) {
                const buffElem = document.createElement('div');
                buffElem.className = 'buff';
                let buffText = '';
                if (buffName === 'fryFrenzy') {
                    buffText = `Fry Frenzy! (777x PPS) - ${timeLeft}s`;
                }
                buffElem.textContent = buffText;
                buffDisplay.appendChild(buffElem);
            }
        }
    }


    // --- Save/Load Logic ---
    function saveGame() {
        const saveState = {
            gameState: gameState,
            generators: generators.map(g => ({ id: g.id, owned: g.owned })),
            lastSaveTimestamp: Date.now()
        };
        localStorage.setItem('potatoClickerSave', JSON.stringify(saveState));
        console.log("Game Saved.");
    }

    function loadGame() {
        const savedState = localStorage.getItem('potatoClickerSave');
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            
            // Load core game state, ensuring buffs object exists
            gameState = parsedState.gameState;
            if (!gameState.buffs) {
                gameState.buffs = {};
            }

            // Load generator ownership
            parsedState.generators.forEach(savedGen => {
                const gameGen = generators.find(g => g.id === savedGen.id);
                if (gameGen) {
                    gameGen.owned = savedGen.owned;
                }
            });

            // Recalculate PPS from the loaded generator counts BEFORE calculating offline gains
            recalculatePps();

            // Do not award offline progress for active buffs
            const timeOffline = Date.now() - parsedState.lastSaveTimestamp;
            const secondsOffline = Math.floor(timeOffline / 1000);
            if (secondsOffline > 0) {
                const offlinePotatoes = secondsOffline * gameState.totalPps;
                if (offlinePotatoes > 0) {
                    gameState.potatoes += offlinePotatoes;
                    // Use a timeout to ensure the alert doesn't block the initial render
                    setTimeout(() => {
                        alert(`Welcome back! You earned ${formatNumber(offlinePotatoes)} potatoes while you were away.`);
                    }, 100);
                }
            }
            
            console.log("Game Loaded.");
        }
    }

    function wipeSave() {
        if (confirm("Are you sure you want to wipe your save? This cannot be undone!")) {
            localStorage.removeItem('potatoClickerSave');
            // Hard reload to reset the game state completely
            window.location.reload();
        }
    }


    // --- Helper Functions ---
    function recalculatePps() {
        gameState.totalPps = generators.reduce((total, gen) => total + (gen.owned * gen.basePps), 0);
    }

    function calculateCost(gen) {
        return Math.ceil(gen.baseCost * Math.pow(1.15, gen.owned));
    }

    function createFloatingText(x, y, text) {
        const elem = document.createElement('div');
        elem.className = 'floating-text';
        elem.textContent = text;
        
        // Position the text near the click
        const rect = potatoImg.getBoundingClientRect();
        elem.style.left = `${x - rect.left}px`;
        elem.style.top = `${y - rect.top}px`;

        potatoTextOverlay.appendChild(elem);

        // Remove the element after the animation finishes
        setTimeout(() => {
            elem.remove();
        }, 1500);
    }

    function formatNumber(num) {
        if (num < 1000) return num.toString();
        const suffixes = ["", "k", "M", "B", "T", "q", "Q", "s", "S"];
        const i = Math.floor(Math.log10(num) / 3);
        const shortNum = (num / Math.pow(1000, i)).toFixed(2);
        return shortNum + suffixes[i];
    }

    // --- Start the game ---
    init();
});
