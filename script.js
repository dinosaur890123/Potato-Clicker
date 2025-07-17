document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const potatoImg = document.getElementById('potato');
    const potatoTextOverlay = document.getElementById('potato-text-overlay');
    const potatoDisplay = document.getElementById('potatoes');
    const ppsDisplay = document.getElementById('pps');
    const generatorsContainer = document.getElementById('generators-container');
    const upgradesContainer = document.getElementById('upgrades-container');
    const goldenPotatoContainer = document.getElementById('golden-potato-container');
    const buffDisplay = document.getElementById('buff-display');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = settingsModal.querySelector('.close-btn');
    const manualSaveBtn = document.getElementById('manual-save-btn');
    const wipeSaveBtn = document.getElementById('wipe-save-btn');
    const achievementsModal = document.getElementById('achievements-modal');

    // Game State
    let gameState = {
        potatoes: 0,
        totalPotatoesEarned: 0,
        clicks: 0,
        totalPps: 0,
        clickPower: 1,
        buffs: {},
        unlockedAchievements: new Set(),
        purchasedUpgrades: new Set(),
        // Prestige
        starch: 0,
        totalStarch: 0, // Starch if we reset now
        purchasedPrestigeUpgrades: new Set(),
        // Fun features
        clickCombo: 0,
        lastClickTime: 0,
        totalPlayTime: 0,
        gameStartTime: Date.now(),
        randomEventCooldown: 0,
    };

    // --- Definitions ---
    const achievements = {
        'goldenTouch': { name: 'Golden Touch', description: 'Click a Golden Potato.', condition: () => false, reward: 'Unlocks the golden potato mechanic!', icon: '🥇' }, // Will be manually triggered
        'firstMash': { name: 'Spudtastic Voyage', description: 'Reset for the first time.', condition: () => gameState.totalStarch > 0, reward: 'Shows you understand the prestige system!', icon: '🚀' },
        'firstClick': { name: 'First Step', description: 'Click the potato for the first time.', condition: () => gameState.clicks >= 1, reward: 'Your journey begins!', icon: '👆' },
        'hundredClicks': { name: 'Click Happy', description: 'Click the potato 100 times.', condition: () => gameState.clicks >= 100, reward: 'You\'re getting the hang of this!', icon: '💪' },
        'firstGenerator': { name: 'Growing Garden', description: 'Buy your first Potato Sprout.', condition: () => generators[0].owned >= 1, reward: 'Your first step into automation!', icon: '🌱' },
        'tenThousandPotatoes': { name: 'Spud Central', description: 'Accumulate 10,000 potatoes.', condition: () => gameState.totalPotatoesEarned >= 10000, reward: 'A significant potato milestone!', icon: '🥔' },
        'clickMaster': { name: 'Click Master', description: 'Click 1,000 times.', condition: () => gameState.clicks >= 1000, reward: 'Your fingers are getting strong!', icon: '⚡' },
        'speedDemon': { name: 'Speed Demon', description: 'Achieve a 10-click combo.', condition: () => false, reward: 'Lightning fast clicking!', icon: '💨' }, // Manual trigger
        'millionaire': { name: 'Potato Millionaire', description: 'Accumulate 1,000,000 potatoes.', condition: () => gameState.totalPotatoesEarned >= 1000000, reward: 'You\'re rich in potatoes!', icon: '💰' },
        'dedicated': { name: 'Dedicated Farmer', description: 'Play for 1 hour total.', condition: () => gameState.totalPlayTime >= 3600000, reward: 'True dedication to potato farming!', icon: '⏰' },
        'autoClicker': { name: 'Automation Nation', description: 'Generate 100 PPS.', condition: () => gameState.totalPps >= 100, reward: 'The machines work for you now!', icon: '🤖' },
        'overachiever': { name: 'Overachiever', description: 'Unlock 5 other achievements.', condition: () => gameState.unlockedAchievements.size >= 5, reward: 'You love collecting achievements!', icon: '🏆' },
    };

    const upgrades = {
        'betterFingers': { name: 'Better Fingers', description: 'Clicking power +1.', cost: 100, requirement: () => gameState.clicks >= 10, effect: () => gameState.clickPower += 1, type: 'click' },
        'reinforcedThumb': { name: 'Reinforced Thumb', description: 'Clicks are twice as effective.', cost: 500, requirement: () => gameState.clicks >= 100, effect: () => gameState.clickPower *= 2, type: 'click' },
        'potatoMouse': { name: 'Potato Mouse', description: 'Clicks also generate +1% of your total PPS.', cost: 10000, requirement: () => gameState.clicks >= 500, effect: () => {}, type: 'specialClick' }, // Special handling in click function
        'sproutBooster': { name: 'Sprout Booster', description: 'Potato Sprouts are twice as effective.', cost: 1000, requirement: () => generators[0].owned >= 5, effect: () => {}, type: 'generator', generator: 'sprout' },
    };

    const prestigeUpgrades = {
        'starchyStart': { name: 'Starchy Start', description: 'Begin every new game with 10 Tater Tot Farmers.', cost: 1, effect: () => {} },
        'cosmicSeasoning': { name: 'Cosmic Seasoning', description: 'All potato production is permanently increased by 10%.', cost: 5, effect: () => {} },
        'eyeForAnEye': { name: 'Eye for an Eye', description: 'Golden Potatoes are twice as likely to appear.', cost: 25, effect: () => {} },
    };
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
        populateUpgrades();
        populatePrestigeUpgrades();
        populateAchievementsGrid();
        addEventListeners();
        recalculatePps();
        setInterval(gameLoop, 1000);
        setInterval(saveGame, 30000);
        setTimeout(trySpawnGoldenPotato, getRandomGoldenPotatoTime());
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

    function populateUpgrades() {
        upgradesContainer.innerHTML = '';
        for (const id in upgrades) {
            const upgrade = upgrades[id];
            
            // Skip upgrades that are already purchased
            if (gameState.purchasedUpgrades.has(id)) {
                const elem = document.createElement('div');
                elem.id = `upgrade-${id}`;
                elem.className = 'upgrade purchased';
                elem.innerHTML = `
                    <h3>${upgrade.name}</h3>
                    <p>${upgrade.description}</p>
                    <p class="upgrade-cost">PURCHASED</p>
                `;
                upgradesContainer.appendChild(elem);
                continue;
            }
            
            // Check if requirements are met
            const requirementMet = !upgrade.requirement || upgrade.requirement();
            
            // Only show upgrades if requirements are met
            if (requirementMet) {
                const elem = document.createElement('div');
                elem.id = `upgrade-${id}`;
                elem.className = 'upgrade';
                elem.innerHTML = `
                    <h3>${upgrade.name}</h3>
                    <p>${upgrade.description}</p>
                    <p class="upgrade-cost">Cost: ${formatNumber(upgrade.cost)}</p>
                `;
                
                elem.addEventListener('click', () => buyUpgrade(id));
                if (gameState.potatoes < upgrade.cost) {
                    elem.classList.add('disabled');
                }
                
                upgradesContainer.appendChild(elem);
            }
        }
    }

    function populateAchievementsGrid() {
        const grid = document.getElementById('achievements-grid');
        if (!grid) return; // Exit if element doesn't exist
        
        grid.innerHTML = '';
        for (const id in achievements) {
            const achievement = achievements[id];
            const isUnlocked = gameState.unlockedAchievements.has(id);
            const elem = document.createElement('div');
            elem.className = isUnlocked ? 'achievement-tile unlocked' : 'achievement-tile locked';
            elem.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-tooltip">
                    <h4>${achievement.name}</h4>
                    <p class="achievement-desc">${achievement.description}</p>
                    <p class="achievement-reward">${achievement.reward}</p>
                    <p class="achievement-status">${isUnlocked ? 'UNLOCKED' : 'LOCKED'}</p>
                </div>
            `;
            
            // Make achievements clickable to show details
            elem.addEventListener('click', () => showAchievementDetails(id, achievement, isUnlocked));
            elem.style.cursor = 'pointer';
            
            grid.appendChild(elem);
        }
    }

    function showAchievementDetails(id, achievement, isUnlocked) {
        // Create modal for achievement details
        const modal = document.createElement('div');
        modal.className = 'modal-overlay achievement-detail-modal';
        modal.innerHTML = `
            <div class="modal-content achievement-detail-content">
                <h2>${achievement.icon} ${achievement.name}</h2>
                <div class="achievement-detail-body">
                    <p class="achievement-desc-large">${achievement.description}</p>
                    <p class="achievement-reward-large"><strong>Reward:</strong> ${achievement.reward}</p>
                    <div class="achievement-status-large ${isUnlocked ? 'unlocked' : 'locked'}">
                        ${isUnlocked ? '✅ UNLOCKED' : '🔒 LOCKED'}
                    </div>
                </div>
                <button class="close-btn">&times;</button>
            </div>
        `;
        
        // Add to document and show
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        // Close modal functionality
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            modal.remove();
        });
        
        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                modal.remove();
            }
        });
    }

    function populatePrestigeUpgrades() {
        const container = document.getElementById('prestige-upgrades-container');
        container.innerHTML = '';
        for (const id in prestigeUpgrades) {
            const upgrade = prestigeUpgrades[id];
            const elem = document.createElement('div');
            elem.id = `prestige-${id}`;
            elem.className = 'prestige-upgrade';
            elem.innerHTML = `
                <h3>${upgrade.name}</h3>
                <p>${upgrade.description}</p>
                <p class="prestige-upgrade-cost">Cost: ${upgrade.cost} ✨</p>
            `;
            if (gameState.purchasedPrestigeUpgrades.has(id)) {
                elem.classList.add('purchased');
            } else {
                elem.addEventListener('click', () => buyPrestigeUpgrade(id));
            }
            container.appendChild(elem);
        }
    }

    // --- Event Listeners ---
    function addEventListeners() {
        potatoImg.addEventListener('click', handlePotatoClick);

        // Settings listeners
        settingsBtn.addEventListener('click', () => settingsModal.style.display = 'flex');
        closeModalBtn.addEventListener('click', () => settingsModal.style.display = 'none');
        manualSaveBtn.addEventListener('click', () => {
            saveGame();
            alert("Game Saved!");
        });
        wipeSaveBtn.addEventListener('click', wipeSave);

        // Achievements modal
        document.getElementById('achievements-btn').addEventListener('click', () => {
            document.getElementById('achievements-modal').style.display = 'flex';
        });
        const closeAchievementsModalBtn = document.getElementById('achievements-modal').querySelector('.close-btn');
        closeAchievementsModalBtn.addEventListener('click', () => achievementsModal.style.display = 'none');

        // Tab listeners
        document.querySelectorAll('.tab-link').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));
                document.getElementById(tabId).classList.add('active');
                button.classList.add('active');
            });
        });

        // Prestige listener
        document.getElementById('prestige-reset-button').addEventListener('click', performPrestigeReset);
    }

    function handlePotatoClick(event) {
        gameState.clicks++;
        
        // Combo system
        const now = Date.now();
        if (now - gameState.lastClickTime < 500) { // Within 500ms for combo
            gameState.clickCombo++;
            if (gameState.clickCombo >= 10 && !gameState.unlockedAchievements.has('speedDemon')) {
                gameState.unlockedAchievements.add('speedDemon');
                showAchievementNotification('Speed Demon');
                populateAchievementsGrid();
            }
        } else {
            gameState.clickCombo = 1;
        }
        gameState.lastClickTime = now;
        
        // Calculate click value with combo bonus
        let clickValue = gameState.clickPower;
        if (gameState.purchasedUpgrades.has('potatoMouse')) {
            clickValue += gameState.totalPps * 0.01;
        }
        
        // Combo multiplier (caps at 3x)
        const comboMultiplier = Math.min(1 + (gameState.clickCombo - 1) * 0.1, 3);
        clickValue *= comboMultiplier;
        
        gameState.potatoes += clickValue;
        gameState.totalPotatoesEarned += clickValue;
        
        // Simple floating text without combo display
        createFloatingText(event.clientX, event.clientY, `+${formatNumber(clickValue)}`);
        
        // Potato shake animation
        potatoImg.classList.add('shake');
        setTimeout(() => potatoImg.classList.remove('shake'), 200);
        
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

    function buyUpgrade(id) {
        const upgrade = upgrades[id];
        if (gameState.potatoes >= upgrade.cost && !gameState.purchasedUpgrades.has(id)) {
            gameState.potatoes -= upgrade.cost;
            gameState.purchasedUpgrades.add(id);
            upgrade.effect();
            recalculatePps();
            populateUpgrades(); // Refresh the upgrade list
            updateDisplay();
        }
    }

    // --- Game Loop & Updates ---
    function gameLoop() {
        // Update play time
        gameState.totalPlayTime = Date.now() - gameState.gameStartTime;
        
        let ppsThisSecond = gameState.totalPps;

        // Apply buffs
        if (gameState.buffs.fryFrenzy) {
            ppsThisSecond *= 777;
        }
        if (gameState.buffs.goldenRush) {
            ppsThisSecond *= 5;
        }
        if (gameState.buffs.potatoBoost) {
            ppsThisSecond *= 2;
        }

        gameState.potatoes += ppsThisSecond;
        gameState.totalPotatoesEarned += ppsThisSecond;
        
        // Random events
        tryRandomEvent();
        
        updateDisplay();
        checkAchievements();
        checkPrestige();
    }

    function tryRandomEvent() {
        if (gameState.randomEventCooldown > 0) {
            gameState.randomEventCooldown--;
            return;
        }
        
        // 0.1% chance per second for a random event
        if (Math.random() < 0.001) {
            const events = [
                { name: 'Potato Rain', effect: () => {
                    const bonus = gameState.totalPps * 30;
                    gameState.potatoes += bonus;
                    showRandomEventNotification('🌧️ Potato Rain!', `+${formatNumber(bonus)} potatoes!`);
                }},
                { name: 'Golden Rush', effect: () => {
                    activateBuff('goldenRush', 30);
                    showRandomEventNotification('✨ Golden Rush!', '5x production for 30 seconds!');
                }},
                { name: 'Potato Boost', effect: () => {
                    activateBuff('potatoBoost', 60);
                    showRandomEventNotification('🚀 Potato Boost!', '2x production for 60 seconds!');
                }},
            ];
            
            const event = events[Math.floor(Math.random() * events.length)];
            event.effect();
            gameState.randomEventCooldown = 300; // 5 minutes cooldown
        }
    }

    function showRandomEventNotification(title, description) {
        const notification = document.createElement('div');
        notification.className = 'random-event-notification';
        notification.innerHTML = `
            <div class="event-title">${title}</div>
            <div class="event-description">${description}</div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 4000);
    }

    function updateDisplay() {
        // Update main stats
        potatoDisplay.textContent = formatNumber(Math.floor(gameState.potatoes));
        ppsDisplay.textContent = formatNumber(gameState.totalPps);
        document.getElementById('starch').textContent = formatNumber(gameState.starch);

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

        // Update upgrades affordability
        for (const id in upgrades) {
            const upgrade = upgrades[id];
            const upgradeElement = document.getElementById(`upgrade-${id}`);
            if (upgradeElement && !gameState.purchasedUpgrades.has(id)) {
                upgradeElement.classList.toggle('disabled', gameState.potatoes < upgrade.cost);
            }
        }

        // Update buff display
        updateBuffDisplay();

        // Update prestige info
        const prestigeGain = calculatePrestigeGain();
        document.getElementById('prestige-gain').textContent = formatNumber(prestigeGain);
        document.getElementById('prestige-reset-button').disabled = prestigeGain === 0;
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

        // Unlock Golden Touch achievement
        if (!gameState.unlockedAchievements.has('goldenTouch')) {
            gameState.unlockedAchievements.add('goldenTouch');
            showAchievementNotification('Golden Touch');
            populateAchievementsGrid();
        }

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
        let time = (Math.random() * 600000) + 300000;
        if (gameState.purchasedPrestigeUpgrades.has('eyeForAnEye')) {
            time /= 2;
        }
        return time;
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


    // --- Prestige Logic ---
    function checkPrestige() {
        const prestigeGain = calculatePrestigeGain();
        if (prestigeGain > 0) {
            document.getElementById('prestige-tab-button').style.display = 'block';
        }
    }

    function calculatePrestigeGain() {
        // Using the formula from Cookie Clicker: cube root of (total potatoes / 1 trillion)
        const gain = Math.floor(Math.cbrt(gameState.totalPotatoesEarned / 1e12));
        return gain;
    }

    function buyPrestigeUpgrade(id) {
        const upgrade = prestigeUpgrades[id];
        if (gameState.starch >= upgrade.cost && !gameState.purchasedPrestigeUpgrades.has(id)) {
            gameState.starch -= upgrade.cost;
            gameState.purchasedPrestigeUpgrades.add(id);
            populatePrestigeUpgrades(); // Refresh display
            updateDisplay();
        }
    }

    function performPrestigeReset() {
        const gain = calculatePrestigeGain();
        if (gain <= 0) return;

        if (confirm(`Are you sure you want to Mash? You will gain ${formatNumber(gain)} Starch (✨) but your potatoes, generators, and upgrades will be reset.`)) {
            const newStarch = gameState.starch + gain;
            const newTotalStarch = gameState.totalStarch + gain;
            const prestigeUpgrades = new Set(gameState.purchasedPrestigeUpgrades);
            const achievements = new Set(gameState.unlockedAchievements);

            // Reset the game state, but keep prestige-related things
            gameState = {
                potatoes: 0,
                totalPotatoesEarned: 0,
                clicks: 0,
                totalPps: 0,
                clickPower: 1,
                buffs: {},
                unlockedAchievements: achievements,
                purchasedUpgrades: new Set(),
                starch: newStarch,
                totalStarch: newTotalStarch,
                purchasedPrestigeUpgrades: prestigeUpgrades,
            };

            // Reset generators
            generators.forEach(g => g.owned = 0);

            // Apply prestige effects
            if (gameState.purchasedPrestigeUpgrades.has('starchyStart')) {
                generators.find(g => g.id === 'farmer').owned = 10;
            }

            recalculatePps();
            populateGenerators();
            populateUpgrades();
            updateDisplay();
            document.getElementById('prestige-tab-button').style.display = 'none';
        }
    }


    // --- Achievement Logic ---
    function checkAchievements() {
        let newAchievements = false;
        for (const [id, ach] of Object.entries(achievements)) {
            if (!gameState.unlockedAchievements.has(id) && ach.condition()) {
                gameState.unlockedAchievements.add(id);
                showAchievementNotification(ach.name);
                newAchievements = true;
            }
        }
        if (newAchievements) {
            populateAchievementsGrid();
        }
    }

    function showAchievementNotification(achievementName) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-icon">🏆</div>
            <div class="achievement-text">
                <div class="achievement-title">Achievement Unlocked!</div>
                <div class="achievement-name">${achievementName}</div>
            </div>
        `;

        // Add to document
        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 500); // Wait for fade out animation
        }, 4000);
    }


    // --- Save/Load Logic ---
    function saveGame() {
        // Convert Sets to Arrays for JSON serialization
        const achievementArray = Array.from(gameState.unlockedAchievements);
        const upgradesArray = Array.from(gameState.purchasedUpgrades);
        const prestigeUpgradesArray = Array.from(gameState.purchasedPrestigeUpgrades);

        const saveState = {
            gameState: { 
                ...gameState, 
                unlockedAchievements: achievementArray,
                purchasedUpgrades: upgradesArray,
                purchasedPrestigeUpgrades: prestigeUpgradesArray,
            },
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
            
            // Load core game state
            gameState = parsedState.gameState;
            // Convert loaded arrays back to Sets
            gameState.unlockedAchievements = new Set(parsedState.gameState.unlockedAchievements);
            gameState.purchasedUpgrades = new Set(parsedState.gameState.purchasedUpgrades);
            gameState.purchasedPrestigeUpgrades = new Set(parsedState.gameState.purchasedPrestigeUpgrades || []); // Backwards compatibility
            if (!gameState.buffs) gameState.buffs = {};
            if (!gameState.totalPotatoesEarned) gameState.totalPotatoesEarned = gameState.potatoes;
            if (!gameState.clicks) gameState.clicks = 0;
            if (!gameState.starch) gameState.starch = 0;
            if (!gameState.totalStarch) gameState.totalStarch = 0;


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
        let total = 0;
        generators.forEach(gen => {
            let pps = gen.basePps;
            // Apply generator-specific upgrade multipliers
            const genUpgrades = Object.values(upgrades).filter(upg => upg.type === 'generator' && upg.generator === gen.id);
            genUpgrades.forEach(upg => {
                if (gameState.purchasedUpgrades.has(upg.id)) {
                    pps *= 2;
                }
            });
            total += gen.owned * pps;
        });

        // Apply global prestige multiplier
        if (gameState.purchasedPrestigeUpgrades.has('cosmicSeasoning')) {
            total *= 1.10;
        }

        gameState.totalPps = total;
    }

    function calculateCost(gen) {
        return Math.ceil(gen.baseCost * Math.pow(1.15, gen.owned));
    }

    function createFloatingText(x, y, text) {
        const elem = document.createElement('div');
        elem.className = 'floating-text';
        
        // To avoid showing "+1.00" for small numbers, format it cleanly.
        const num = parseFloat((text || '').toString().replace(/[+,]/g, ''));
        if (!isNaN(num)) {
            if (num < 10) {
                elem.textContent = `+${num.toFixed(2)}`;
            } else {
                elem.textContent = `+${formatNumber(Math.floor(num))}`;
            }
        } else {
            elem.textContent = text;
        }
        
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
