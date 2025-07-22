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
    const researchBtn = document.getElementById('research-btn');
    const researchModal = document.getElementById('research-modal');

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
        // Quality Control System
        qualityLevel: 1, // 1-10 quality rating
        qualityPoints: 0, // Points to spend on quality improvements
        qualityInspections: 0, // Total inspections performed
        defectivePotatoes: 0, // Potatoes that failed quality control
        qualityBonusMultiplier: 1, // Multiplier based on quality level
        // Fun features
        totalPlayTime: 0,
        gameStartTime: Date.now(),
        randomEventCooldown: 0,
        newsTickerMessages: [],
        // Research
        researchPoints: 0,
        completedResearch: new Set(),
        activeResearch: null, // { id: 'someId', startTime: timestamp }
    };

    // --- Definitions ---

    const researchProjects = {
        'advFertilizers': {
            name: 'Advanced Fertilizers',
            description: 'Potato Sprouts and Tater Tot Farmers are permanently 25% more effective.',
            cost: 100,
            duration: 60 * 5, // 5 minutes
            requirement: () => true,
            effect: () => {} // Applied in recalculatePps
        },
        'potatoPlastics': {
            name: 'Potato-Based Plastics',
            description: 'A global +10% production multiplier from this versatile new material.',
            cost: 500,
            duration: 60 * 20, // 20 minutes
            requirement: () => gameState.completedResearch.has('advFertilizers'),
            effect: () => {} // Applied in recalculatePps
        },
        'spudComputing': {
            name: 'Spud-Powered Computing',
            description: 'Clicks are 50% more effective.',
            cost: 2500,
            duration: 60 * 60, // 1 hour
            requirement: () => gameState.completedResearch.has('potatoPlastics'),
            effect: () => { gameState.clickPower *= 1.5; }
        },
        'gravitationalLensing': {
            name: 'Gravitational Lensing',
            description: 'Potato Planets and Potato-Verse Portals are 100% more effective.',
            cost: 10000,
            duration: 60 * 60 * 4, // 4 hours
            requirement: () => gameState.completedResearch.has('spudComputing') && generators.find(g => g.id === 'planet').owned > 0,
            effect: () => {} // Applied in recalculatePps
        },
        // --- New Research Projects ---
        'potatoAI': {
            name: 'Potato AI',
            description: 'Automates 10% of your clicks for 10 minutes.',
            cost: 2000,
            duration: 60 * 10, // 10 minutes
            requirement: () => gameState.completedResearch.has('spudComputing'),
            effect: () => {
                gameState.buffs.potatoAI = {
                    expires: Date.now() + 10 * 60 * 1000
                };
            }
        },
        'starchSynthesis': {                       
            name: 'Starch Synthesis',
            description: 'Gain 5 free Starch on completion.',
            cost: 5000,
            duration: 60 * 15, // 15 minutes
            requirement: () => gameState.completedResearch.has('potatoAI'),
            effect: () => {
                gameState.starch += 5;
                gameState.totalStarch += 5;
            }
        },
        'quantumTuberTheory': {           
            name: 'Quantum Tuber Theory',
            description: 'Doubles all generator output for 15 minutes.',
            cost: 20000,
            duration: 60 * 15, // 15 minutes
            requirement: () => gameState.completedResearch.has('starchSynthesis'),
            effect: () => {
                gameState.buffs.quantumTuber = {
                    expires: Date.now() + 15 * 60 * 1000
                };
            }
        },
        'goldenGenome': {
            name: 'Golden Genome',
            description: 'Golden Potatoes appear 50% more often for 30 minutes.',
            cost: 50000,
            duration: 60 * 30, // 30 minutes
            requirement: () => gameState.completedResearch.has('quantumTuberTheory'),
            effect: () => {
                gameState.buffs.goldenGenome = {
                    expires: Date.now() + 30 * 60 * 1000
                };
            }
        },
        'infiniteSpudEngine': {
            name: 'Infinite Spud Engine',
            description: 'Permanently increases PPS by 5%.',
            cost: 100000,
            duration: 0, // Instant
            requirement: () => gameState.completedResearch.has('goldenGenome'),
            effect: () => {
                if (!gameState.infiniteSpudBonus) gameState.infiniteSpudBonus = 0;
                gameState.infiniteSpudBonus += 0.05;
                recalculatePps();
            }
        }
    };

    const achievements = {
        'goldenTouch': { name: 'Golden Touch', description: 'Click a Golden Potato.', condition: () => false, reward: 'Unlocks the golden potato mechanic!', icon: '🥇' }, // Will be manually triggered
        'firstMash': { name: 'Spudtastic Voyage', description: 'Reset for the first time.', condition: () => gameState.totalStarch > 0, reward: 'Shows you understand the prestige system!', icon: '🚀' },
        'firstClick': { name: 'First Step', description: 'Click the potato for the first time.', condition: () => gameState.clicks >= 1, reward: 'Your journey begins!', icon: '👆' },
        'hundredClicks': { name: 'Click Happy', description: 'Click the potato 100 times.', condition: () => gameState.clicks >= 100, reward: 'You\'re getting the hang of this!', icon: '💪' },
        'firstGenerator': { name: 'Growing Garden', description: 'Buy your first Potato Sprout.', condition: () => generators[0].owned >= 1, reward: 'Your first step into automation!', icon: '🌱' },
        'tenThousandPotatoes': { name: 'Spud Central', description: 'Accumulate 10,000 potatoes.', condition: () => gameState.totalPotatoesEarned >= 10000, reward: 'A significant potato milestone!', icon: '🥔' },
        'clickMaster': { name: 'Click Master', description: 'Click 1,000 times.', condition: () => gameState.clicks >= 1000, reward: 'Your fingers are getting strong!', icon: '⚡' },
        'millionaire': { name: 'Potato Millionaire', description: 'Accumulate 1,000,000 potatoes.', condition: () => gameState.totalPotatoesEarned >= 1000000, reward: 'You\'re rich in potatoes!', icon: '💰' },
        'dedicated': { name: 'Dedicated Farmer', description: 'Play for 1 hour total.', condition: () => gameState.totalPlayTime >= 3600000, reward: 'True dedication to potato farming!', icon: '⏰' },
        'autoClicker': { name: 'Automation Nation', description: 'Generate 100 PPS.', condition: () => gameState.totalPps >= 100, reward: 'The machines work for you now!', icon: '🤖' },
        'overachiever': { name: 'Overachiever', description: 'Unlock 5 other achievements.', condition: () => gameState.unlockedAchievements.size >= 5, reward: 'You love collecting achievements!', icon: '🏆' },
        // Quality Control Achievements
        'qualityInspector': { name: 'Quality Inspector', description: 'Perform your first quality inspection.', condition: () => gameState.qualityInspections >= 1, reward: 'Quality control begins!', icon: '🔍' },
        'premiumPotatoes': { name: 'Premium Potatoes', description: 'Reach Quality Level 5.', condition: () => gameState.qualityLevel >= 5, reward: 'Your potatoes are getting fancy!', icon: '⭐' },
        'perfectionist': { name: 'Perfectionist', description: 'Reach Quality Level 10.', condition: () => gameState.qualityLevel >= 10, reward: 'Potato perfection achieved!', icon: '💎' },
        'qualityControl': { name: 'Quality Control Master', description: 'Perform 100 quality inspections.', condition: () => gameState.qualityInspections >= 100, reward: 'You know quality when you see it!', icon: '📋' },
    };

    const upgrades = {
        // Early Game PPS Boosts (ordered by cost)
        'betterFingers': { name: 'Better Fingers', description: 'Clicking power +1.', cost: 50, requirement: () => gameState.clicks >= 5, effect: () => gameState.clickPower += 1, type: 'click' },
        'reinforcedThumb': { name: 'Reinforced Thumb', description: 'Clicks are twice as effective.', cost: 200, requirement: () => gameState.clicks >= 25, effect: () => gameState.clickPower *= 2, type: 'click' },
        'cheaperSprouts': { name: 'Cheaper Sprouts', description: 'Potato Sprouts are twice as efficient.', cost: 500, requirement: () => gameState.totalPotatoesEarned >= 500, effect: () => {}, type: 'generator', generator: 'sprout' },
        'sproutBooster': { name: 'Sprout Fertilizer', description: 'Potato Sprouts are twice as effective.', cost: 500, requirement: () => generators[0].owned >= 1, effect: () => {}, type: 'generator', generator: 'sprout' },
        'farmerTools': { name: 'Farmer Tools', description: 'Tater Tot Farmers are twice as effective.', cost: 4000, requirement: () => gameState.totalPotatoesEarned >= 2000, effect: () => {}, type: 'generator', generator: 'farmer' },
        'carpalTunnelSolution': { name: 'Carpal Tunnel Solution', description: 'Clicks are twice as effective again.', cost: 5000, requirement: () => gameState.purchasedUpgrades.has('reinforcedThumb'), effect: () => gameState.clickPower *= 2, type: 'click' },
        'organicFarms': { name: 'Organic Farms', description: 'Tater Tot Farmers are twice as efficient.', cost: 5000, requirement: () => gameState.totalPotatoesEarned >= 5000, effect: () => {}, type: 'generator', generator: 'farmer' },
        'cannonUpgrade': { name: 'Cannon Upgrade', description: 'Potato Cannons are twice as effective.', cost: 25000, requirement: () => gameState.totalPotatoesEarned >= 15000, effect: () => {}, type: 'generator', generator: 'cannon' },
        'potatoMouse': { name: 'Potato Mouse', description: 'Clicks also generate +1% of your total PPS.', cost: 25000, requirement: () => gameState.clicks >= 200, effect: () => {}, type: 'specialClick' },
        'sproutEvolution': { name: 'Sprout Evolution', description: 'Potato Sprouts are twice as effective.', cost: 25000, requirement: () => generators[0].owned >= 5, effect: () => {}, type: 'generator', generator: 'sprout' },
        'potatoSerum': { name: 'Potato Serum', description: 'Potato production gains +5% of your total potatoes made.', cost: 50000, requirement: () => gameState.totalPotatoesEarned >= 50000, effect: () => {}, type: 'production_boost' },
        'adamantiumFingers': { name: 'Adamantium Fingers', description: 'Clicks are twice as effective.', cost: 100000, requirement: () => gameState.purchasedUpgrades.has('carpalTunnelSolution'), effect: () => gameState.clickPower *= 2, type: 'click' },
        'farmerUnion': { name: 'Farmer Union', description: 'Tater Tot Farmers are twice as effective.', cost: 200000, requirement: () => generators[1].owned >= 5, effect: () => {}, type: 'generator', generator: 'farmer' },
        'factoryAutomation': { name: 'Factory Automation', description: 'Fryer Factories are twice as effective.', cost: 200000, requirement: () => gameState.totalPotatoesEarned >= 100000, effect: () => {}, type: 'generator', generator: 'factory' },
        'massProduction': { name: 'Mass Production', description: 'Potato Cannons and Fryer Factories are twice as efficient.', cost: 500000, requirement: () => gameState.totalPotatoesEarned >= 500000, effect: () => {}, type: 'dual_generator' },
        'cannonBarrage': { name: 'Cannon Barrage', description: 'Potato Cannons are twice as effective.', cost: 1250000, requirement: () => generators[2].owned >= 5, effect: () => {}, type: 'generator', generator: 'cannon' },
        'couchComfort': { name: 'Couch Comfort', description: 'Couch Potatoes are twice as effective.', cost: 2500000, requirement: () => gameState.totalPotatoesEarned >= 1000000, effect: () => {}, type: 'generator', generator: 'couch' },
        'potatoEmpire': { name: 'Potato Empire', description: 'Potato production gains +10% of your total potatoes made.', cost: 5000000, requirement: () => gameState.totalPotatoesEarned >= 5000000, effect: () => {}, type: 'production_boost' },
        'factoryNetwork': { name: 'Factory Network', description: 'Fryer Factories are twice as effective.', cost: 10000000, requirement: () => generators[3].owned >= 5, effect: () => {}, type: 'generator', generator: 'factory' },
        'satelliteNetwork': { name: 'Satellite Network', description: 'Spudnik Satellites are twice as effective.', cost: 25000000, requirement: () => gameState.totalPotatoesEarned >= 10000000, effect: () => {}, type: 'generator', generator: 'spudnik' },
        'quantumSpuds': { name: 'Quantum Spuds', description: 'All generators are 50% more efficient.', cost: 50000000, requirement: () => gameState.totalPotatoesEarned >= 50000000, effect: () => {}, type: 'global' },
        'ultimateComfort': { name: 'Ultimate Comfort', description: 'Couch Potatoes are twice as effective.', cost: 125000000, requirement: () => generators[4].owned >= 5, effect: () => {}, type: 'generator', generator: 'couch' },
        'planetMining': { name: 'Planet Mining', description: 'Potato Planets are twice as effective.', cost: 500000000, requirement: () => gameState.totalPotatoesEarned >= 250000000, effect: () => {}, type: 'generator', generator: 'planet' },
        'potatoInfinity': { name: 'Potato Infinity', description: 'Potato production gains +25% of your total potatoes made.', cost: 500000000, requirement: () => gameState.totalPotatoesEarned >= 500000000, effect: () => {}, type: 'production_boost' },
        'portalStabilization': { name: 'Portal Stabilization', description: 'Potato-Verse Portals are twice as effective.', cost: 37500000000, requirement: () => gameState.totalPotatoesEarned >= 15000000000, effect: () => {}, type: 'generator', generator: 'portal' },
        'luckySpud': { name: 'Lucky Spud', description: 'Golden Potatoes have a 10% chance to give a second reward.', cost: 50000000000, requirement: () => gameState.unlockedAchievements.has('goldenTouch'), effect: () => {}, type: 'golden' },
        'tuberAwakening': { name: 'Tuber Awakening', description: 'The Great Tuber is twice as effective.', cost: 500000000000, requirement: () => gameState.totalPotatoesEarned >= 200000000000, effect: () => {}, type: 'generator', generator: 'tuber' },
        'kilotonPotato': { name: 'Kiloton Potato', description: 'All production doubled for every 1000 total generators owned.', cost: 500000000000000, requirement: () => generators.reduce((sum, gen) => sum + gen.owned, 0) >= 50, effect: () => {}, type: 'generator_count' },
        'singularityStabilizers': { name: 'Singularity Stabilizers', description: 'Tuber Singularities are twice as effective.', cost: 5000000000000000, requirement: () => generators[9] && generators[9].owned >= 1, effect: () => {}, type: 'generator', generator: 'singularity' },
        // Quality Control Upgrades
        'qualityInspections': { name: 'Quality Inspections', description: 'Unlock quality control system. +10% potato value per quality level.', cost: 1000, requirement: () => gameState.totalPotatoesEarned >= 1000, effect: () => {}, type: 'quality_unlock' },
        'qualityTraining': { name: 'Quality Training', description: 'Quality points generation +50%.', cost: 15000, requirement: () => gameState.purchasedUpgrades.has('qualityInspections'), effect: () => {}, type: 'quality_boost' },
        'automatedInspection': { name: 'Automated Inspection', description: 'Automatically perform quality inspections every 10 seconds.', cost: 100000, requirement: () => gameState.qualityLevel >= 3, effect: () => {}, type: 'quality_auto' },
        'premiumPackaging': { name: 'Premium Packaging', description: 'Quality bonus doubled for all potatoes.', cost: 1000000, requirement: () => gameState.qualityLevel >= 5, effect: () => {}, type: 'quality_premium' },
        'perfectQuality': { name: 'Perfect Quality', description: 'Unlock Quality Level 10 and triple quality bonus.', cost: 50000000, requirement: () => gameState.qualityLevel >= 8, effect: () => {}, type: 'quality_perfect' },
        'researchLab': {
            name: 'Research Lab',
            description: 'Unlocks the Research Lab, allowing you to spend potatoes on powerful technologies.',
            cost: 1000000,
            requirement: () => gameState.totalPotatoesEarned >= 500000,
            effect: () => {
                researchBtn.style.display = 'inline-block';
            },
            type: 'unlock'
        },
    };

    const prestigeUpgrades = {
        'starchyStart': { name: 'Starchy Start', description: 'Begin every new game with 10 Tater Tot Farmers.', cost: 1, effect: () => {} },
        'cosmicSeasoning': { name: 'Cosmic Seasoning', description: 'All potato production is permanently increased by 10%.', cost: 5, effect: () => {} },
        'eyeForAnEye': { name: 'Eye for an Eye', description: 'Golden Potatoes are twice as likely to appear.', cost: 25, effect: () => {} },
        'prestigePower': { name: 'Prestige Power', description: 'Each unspent Starch boosts total PPS by 1%.', cost: 50, effect: () => {} }, // Handled in recalculatePps
        'goldenAge': { name: 'Golden Age', description: 'Golden Potato effects last twice as long.', cost: 100, effect: () => {} }, // Handled in handleGoldenPotatoClick
        'ultimateTuber': { name: 'The Ultimate Tuber', description: 'Unlocks a final, powerful generator.', cost: 500, effect: () => {} }, // Handled in populateGenerators
    };
    let generators = [
        { id: 'sprout', name: 'Potato Sprout', description: "A tiny, hopeful green shoot.", baseCost: 5, basePps: 1, owned: 0 },
        { id: 'farmer', name: 'Tater Tot Farmer', description: "A stout, grumpy-looking potato person.", baseCost: 75, basePps: 8, owned: 0 },
        { id: 'cannon', name: 'Potato Cannon', description: "Launches psotatoes into a giant pile.", baseCost: 750, basePps: 55, owned: 0 },
        { id: 'factory', name: 'Fryer Factory', description: "Turns raw spuds into valuable fries.", baseCost: 8000, basePps: 320, owned: 0 },
        { id: 'couch', name: 'Couch Potato', description: "Generates spuds via sheer willpower.", baseCost: 90000, basePps: 1900, owned: 0 },
        { id: 'spudnik', name: 'Spudnik Satellite', description: "Beams down potato-multiplying energy.", baseCost: 1000000, basePps: 12000, owned: 0 },
        { id: 'planet', name: 'Potato Planet', description: "Harvest it with giant space-tractors.", baseCost: 15000000, basePps: 85000, owned: 0 },
        { id: 'portal', name: 'Potato-Verse Portal', description: "Siphons potatoes from alternate dimensions.", baseCost: 250000000, basePps: 666666, owned: 0 },
        { id: 'tuber', name: 'The Great Tuber', description: "Its snores generate reality-bending potatoes.", baseCost: 3500000000, basePps: 9876543, owned: 0 },
        { id: 'singularity', name: 'Tuber Singularity', description: "A potato so dense it has its own gravity.", baseCost: 7.5e14, basePps: 1e8, owned: 0, requires: 'ultimateTuber' },
    ];

    // --- Initialization ---
    function init() {
        loadGame();
        populateGenerators();
        populateUpgrades();
        populatePrestigeUpgrades();
        populateAchievementsGrid();
        populateResearch();
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
            // Check for special requirements
            if (gen.requires && !gameState.purchasedPrestigeUpgrades.has(gen.requires)) {
                return; // Don't show this generator yet
            }

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
            elem.addEventListener('click', () => {
                const cost = calculateCost(gen);
                if (!elem.classList.contains('disabled') && gameState.potatoes >= cost) {
                    buyGenerator(gen);
                }
            });
            generatorsContainer.appendChild(elem);
        });
        // We need to call updateDisplay once after populating to set initial states
        updateDisplay();
    }

    function populateUpgrades() {
        upgradesContainer.innerHTML = '';
        for (const id in upgrades) {
            const upgrade = upgrades[id];
            const elem = document.createElement('div');
            elem.id = `upgrade-${id}`;

            // Always show as purchased if owned, never check requirements
            if (gameState.purchasedUpgrades.has(id)) {
                elem.className = 'upgrade purchased';
                elem.innerHTML = `
                    <h3>${upgrade.name}</h3>
                    <p>${upgrade.description}</p>
                    <p class="upgrade-cost">PURCHASED</p>
                `;
            } else {
                // Only check requirements if not purchased
                const requirementMet = !upgrade.requirement || upgrade.requirement();
                if (requirementMet) {
                    elem.className = 'upgrade';
                    elem.innerHTML = `
                        <h3>${upgrade.name}</h3>
                        <p>${upgrade.description}</p>
                        <p class="upgrade-cost">Cost: ${formatNumber(upgrade.cost)}</p>
                    `;
                    elem.addEventListener('click', () => {
                        if (!elem.classList.contains('disabled') && gameState.potatoes >= upgrade.cost) {
                            buyUpgrade(id);
                        }
                    });
                    if (gameState.potatoes < upgrade.cost) {
                        elem.classList.add('disabled');
                    }
                } else { 
                    elem.className = 'upgrade locked';
                    elem.innerHTML = `
                        <h3>${upgrade.name}</h3>
                        <p>${upgrade.description}</p>
                        <p class="upgrade-cost">🔒 Cost: ${formatNumber(upgrade.cost)}</p>
                    `;
                    elem.addEventListener('click', () => {
                        // Try to extract the missing requirement from the requirement function string
                        let prereqMsg = 'You must meet the requirement to purchase this upgrade.';
                        let details = '';
                        if (upgrade.requirement && upgrade.requirement.toString().includes('purchasedUpgrades.has')) {
                            // Try to extract the required upgrade key
                            const match = upgrade.requirement.toString().match(/purchasedUpgrades\\.has\(['"]([a-zA-Z0-9_]+)['"]\)/);
                            if (match && match[1]) {
                                const prereqId = match[1];
                                if (upgrades[prereqId]) {
                                    prereqMsg = `Requires: ${upgrades[prereqId].name}`;
                                    details = upgrades[prereqId].description ? `<div style='margin-top:6px;font-size:0.95em;color:#ffc400;'>${upgrades[prereqId].description}</div>` : '';
                                }
                            }
                        } else if (upgrade.requirementText) {
                            details = `<div style='margin-top:6px;font-size:0.95em;color:#ffc400;'>${upgrade.requirementText}</div>`;
                        }
                        showLockedUpgradePopup(upgrade.name, prereqMsg, details);
                    });
                }
// Show a popup for locked upgrades with missing requirements
function showLockedUpgradePopup(upgradeName, prereqMsg, details = '') {
    // Remove any existing popup
    const existing = document.getElementById('locked-upgrade-popup');
    if (existing) existing.remove(); 
    const popup = document.createElement('div');
    popup.id = 'locked-upgrade-popup';
    popup.className = 'modal-overlay';
    popup.innerHTML = `                  
        <div class="modal-content" style="position: relative;">
            <button class="close-btn" style="position: absolute; top: 10px; right: 15px; font-size: 28px; font-weight: bold; color: #fdfdfd; background: none; border: none; cursor: pointer;">&times;</button>
            <h2 style="margin-top: 0;">Cannot Purchase: ${upgradeName}</h2>
            <p style="margin: 20px 0; font-size: 1.1em; color: #ffc400;">${prereqMsg}</p>
            ${details}
        </div>
    `;
    document.body.appendChild(popup);
    popup.style.display = 'flex';
    popup.querySelector('.close-btn').addEventListener('click', () => popup.remove());
    popup.addEventListener('click', (e) => { if (e.target === popup) popup.remove(); });
}
            }
            upgradesContainer.appendChild(elem);
        }
    }    function populateResearch() {
        const container = document.getElementById('research-container');
        if (!container) return;
        container.innerHTML = '';

        for (const id in researchProjects) {
            const project = researchProjects[id];
            if (!project.requirement()) continue;

            const elem = document.createElement('div');
            elem.id = `research-${id}`;
            elem.className = 'research-project';

            if (gameState.completedResearch.has(id)) {
                elem.classList.add('completed');
                elem.innerHTML = `
                    <h3>${project.name}</h3>
                    <p>${project.description}</p>
                    <div class="research-cost">COMPLETED</div>
                `;
            } else if (gameState.activeResearch && gameState.activeResearch.id === id) {
                elem.classList.add('active');
                const elapsed = (Date.now() - gameState.activeResearch.startTime) / 1000;
                const progress = Math.min(100, (elapsed / project.duration) * 100);
                elem.innerHTML = `
                    <h3>${project.name} (Researching...)</h3>
                    <p>${project.description}</p>
                    <div class="research-progress-bar">
                        <div class="research-progress" style="width: ${progress}%"></div>
                    </div>
                    <div class="research-time-left">${formatNumber(Math.ceil(project.duration - elapsed))}s remaining</div>
                `;
            } else {
                elem.innerHTML = `
                    <h3>${project.name}</h3>
                    <p>${project.description}</p>
                    <div class="research-cost">Cost: ${formatNumber(project.cost)} 🔬</div>
                    <div class="research-duration">Takes ${formatNumber(project.duration)}s</div>
                `;
                if (gameState.activeResearch || gameState.researchPoints < project.cost) {
                    elem.classList.add('disabled');
                } else {
                    elem.addEventListener('click', () => startResearch(id));
                }
            }
            container.appendChild(elem);
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

        // Export/Import listeners
        document.getElementById('export-save-btn').addEventListener('click', exportSave);
        document.getElementById('import-save-btn').addEventListener('click', importSave);

        // Achievements modal
        document.getElementById('achievements-btn').addEventListener('click', () => {
            achievementsModal.style.display = 'flex';
        });
        document.getElementById('achievements-modal').querySelector('.close-btn').addEventListener('click', () => achievementsModal.style.display = 'none');

        // Research modal
        researchBtn.addEventListener('click', () => {
            researchModal.style.display = 'flex';
        });
        researchModal.querySelector('.close-btn').addEventListener('click', () => researchModal.style.display = 'none');

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
        
        // Simple click value calculation
        let clickValue = gameState.clickPower;
        if (gameState.purchasedUpgrades.has('potatoMouse')) {
            clickValue += gameState.totalPps * 0.01;
        }
        
        gameState.potatoes += clickValue;
        gameState.totalPotatoesEarned += clickValue;
        
        // Simple floating text
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
            
            // Add animation
            const genElement = document.getElementById(`generator-${gen.id}`);
            if (genElement) {
                genElement.classList.add('item-purchased-animation');
                setTimeout(() => genElement.classList.remove('item-purchased-animation'), 400);
            }
        }
    }

    function buyUpgrade(id) {
        const upgrade = upgrades[id];
        if (gameState.potatoes >= upgrade.cost && !gameState.purchasedUpgrades.has(id)) {
            gameState.potatoes -= upgrade.cost;
            gameState.purchasedUpgrades.add(id);
            if (upgrade.effect) {
                upgrade.effect();
            }
            recalculatePps();
            populateUpgrades(); // Repopulates to show as purchased
            updateDisplay();

            // Add animation
            const upgradeElement = document.getElementById(`upgrade-${id}`);
            if (upgradeElement) {
                upgradeElement.classList.add('item-purchased-animation');
                setTimeout(() => upgradeElement.classList.remove('item-purchased-animation'), 400);
            }
        }
    }

    // --- Game Loop & Updates ---
    function gameLoop() {
        // Update play time
        gameState.totalPlayTime = Date.now() - gameState.gameStartTime;
        
        // Generate research points
        if (gameState.purchasedUpgrades.has('researchLab')) {
            const pointsPerSecond = gameState.totalPps / 1e9; // 1 point per 1B PPS
            gameState.researchPoints += pointsPerSecond;
        }

        // Check for research completion
        if (gameState.activeResearch) {
            const project = researchProjects[gameState.activeResearch.id];
            const elapsed = (Date.now() - gameState.activeResearch.startTime) / 1000;
            if (elapsed >= project.duration) {
                completeResearch(gameState.activeResearch.id);
            }
        }


        let ppsThisSecond = gameState.totalPps;

        // --- Research Buffs ---
        // Quantum Tuber: double all generator output
        if (gameState.buffs.quantumTuber && gameState.buffs.quantumTuber.expires > Date.now()) {
            ppsThisSecond *= 2;
        } else if (gameState.buffs.quantumTuber) {
            delete gameState.buffs.quantumTuber;
        }

        // Infinite Spud Engine: permanent PPS boost
        if (gameState.infiniteSpudBonus) {
            ppsThisSecond *= (1 + gameState.infiniteSpudBonus);
        }

        // Fry Frenzy, Golden Rush, Potato Boost
        if (gameState.buffs.fryFrenzy) {
            ppsThisSecond *= 777;
        }
        if (gameState.buffs.goldenRush) {
            ppsThisSecond *= 5;
        }
        if (gameState.buffs.potatoBoost) {
            ppsThisSecond *= 2;
        }

        // Potato AI: automate 10% of clickPower per second
        if (gameState.buffs.potatoAI && gameState.buffs.potatoAI.expires > Date.now()) {
            let autoClicks = Math.max(1, Math.floor(gameState.clickPower * 0.1));
            gameState.potatoes += autoClicks;
            gameState.totalPotatoesEarned += autoClicks;
        } else if (gameState.buffs.potatoAI) {
            delete gameState.buffs.potatoAI;
        }

        gameState.potatoes += ppsThisSecond;
        gameState.totalPotatoesEarned += ppsThisSecond;
        
        // Random events
        tryRandomEvent();

        // Automated quality inspections
        if (gameState.purchasedUpgrades.has('automatedInspection')) {
            // Auto-inspect every 10 seconds
            if (gameState.totalPlayTime % 10000 < 1000) {
                performQualityInspection();
            }
        }
        
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

    // --- Research Logic ---
    function startResearch(id) {
        if (gameState.activeResearch) return;
        const project = researchProjects[id];
        if (gameState.researchPoints >= project.cost) {
            gameState.researchPoints -= project.cost;
            gameState.activeResearch = { id: id, startTime: Date.now() };
            populateResearch();
            updateDisplay();
        }
    }

    function completeResearch(id) {
        const project = researchProjects[id];
        gameState.completedResearch.add(id);
        gameState.activeResearch = null;
        project.effect(); // Apply direct effects
        recalculatePps(); // Recalculate for passive effects
        populateResearch();
        updateDisplay();
        showRandomEventNotification(`🔬 Research Complete!`, `${project.name}`);
    }

    // --- Quality Control System ---
    function performQualityInspection() {
        if (!gameState.purchasedUpgrades.has('qualityInspections')) {
            return;
        }

        gameState.qualityInspections++;
        
        // Generate quality points based on current production
        let pointsGained = Math.floor(gameState.totalPps * 0.1) + 1;
        
        // Bonus from quality training
        if (gameState.purchasedUpgrades.has('qualityTraining')) {
            pointsGained = Math.floor(pointsGained * 1.5);
        }
        
        gameState.qualityPoints += pointsGained;
        
        // Random chance to find defective potatoes
        if (Math.random() < 0.15) {
            const defects = Math.floor(gameState.totalPps * 0.02) + 1;
            gameState.defectivePotatoes += defects;
            createFloatingText(window.innerWidth / 2, 200, `Found ${defects} defective potatoes!`, '#ff6b6b');
        }
        
        createFloatingText(window.innerWidth / 2, 150, `+${pointsGained} Quality Points`, '#4CAF50');
        updateQualityDisplay();
    }

    function upgradeQuality() {
        const cost = getQualityUpgradeCost();
        if (gameState.qualityPoints >= cost && gameState.qualityLevel < getMaxQualityLevel()) {
            gameState.qualityPoints -= cost;
            gameState.qualityLevel++;
            updateQualityBonus();
            updateQualityDisplay();
            createFloatingText(window.innerWidth / 2, 100, `Quality Level ${gameState.qualityLevel}!`, '#ffc400');
        }
    }

    function getQualityUpgradeCost() {
        return Math.floor(100 * Math.pow(2.5, gameState.qualityLevel - 1));
    }

    function getMaxQualityLevel() {
        if (gameState.purchasedUpgrades.has('perfectQuality')) return 10;
        return 8;
    }

    function updateQualityBonus() {
        let baseBonus = gameState.qualityLevel * 0.1; // 10% per level
        
        if (gameState.purchasedUpgrades.has('premiumPackaging')) {
            baseBonus *= 2;
        }
        
        if (gameState.purchasedUpgrades.has('perfectQuality')) {
            baseBonus *= 3;
        }
        
        gameState.qualityBonusMultiplier = 1 + baseBonus;
    }

    function updateQualityDisplay() {
        // Update quality display in stats area
        let qualityStats = document.getElementById('quality-stats');
        if (!qualityStats) {
            qualityStats = document.createElement('div');
            qualityStats.id = 'quality-stats';
            document.getElementById('stats').appendChild(qualityStats);
        }
        
        if (gameState.purchasedUpgrades.has('qualityInspections')) {
            qualityStats.style.display = 'block';
            qualityStats.innerHTML = `
                <p>🔍 Quality Level: <span style="color: #ffc400;">${gameState.qualityLevel}/${getMaxQualityLevel()}</span></p>
                <p>📋 Quality Points: <span style="color: #4CAF50;">${formatNumber(gameState.qualityPoints)}</span></p>
                <p>⭐ Quality Bonus: <span style="color: #ffc400;">+${Math.round((gameState.qualityBonusMultiplier - 1) * 100)}%</span></p>
                ${gameState.defectivePotatoes > 0 ? `<p>❌ Defects Found: <span style="color: #ff6b6b;">${formatNumber(gameState.defectivePotatoes)}</span></p>` : ''}
                <div style="margin-top: 10px;">
                    <button id="quality-inspect-btn" ${gameState.qualityInspections % 3 === 0 ? 'disabled' : ''}>
                        ${gameState.qualityInspections % 3 === 0 ? 'Inspecting...' : 'Quality Inspection'}
                    </button>
                    ${gameState.qualityLevel < getMaxQualityLevel() ? `
                        <button id="quality-upgrade-btn" ${gameState.qualityPoints < getQualityUpgradeCost() ? 'disabled' : ''}>
                            Upgrade Quality (${formatNumber(getQualityUpgradeCost())} pts)
                        </button>
                    ` : '<p style="color: #ffc400;">✨ Maximum Quality Achieved! ✨</p>'}
                </div>
            `;
            
            // Add event listeners for quality buttons
            const inspectBtn = document.getElementById('quality-inspect-btn');
            const upgradeBtn = document.getElementById('quality-upgrade-btn');
            
            if (inspectBtn && !inspectBtn.onclick) {
                inspectBtn.onclick = performQualityInspection;
            }
            
            if (upgradeBtn && !upgradeBtn.onclick) {
                upgradeBtn.onclick = upgradeQuality;
            }
        } else {
            qualityStats.style.display = 'none';
        }
    }

    function updateDisplay() {
        // Update main stats
        potatoDisplay.textContent = formatNumber(Math.floor(gameState.potatoes));
        ppsDisplay.textContent = formatNumber(gameState.totalPps);
        document.getElementById('starch').textContent = formatNumber(gameState.starch);
        
        // Update research display
        if (gameState.purchasedUpgrades.has('researchLab')) {
            researchBtn.style.display = 'inline-block';
            document.getElementById('research-points').textContent = formatNumber(Math.floor(gameState.researchPoints));
            // Repopulate to update progress bars and availability
            populateResearch();
        }

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

        // Update quality control display
        updateQualityDisplay();

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

        let durationMultiplier = 1;
        if (gameState.purchasedPrestigeUpgrades.has('goldenAge')) {
            durationMultiplier = 2;
        }

        // Give a random reward
        const roll = Math.random();
        if (roll < 0.9) { // 90% chance for Fry Frenzy
            activateBuff('fryFrenzy', 77 * durationMultiplier);
        } else { // 10% chance for a lump sum
            const lumpSum = (gameState.totalPps * 60 * 15) + 13; // 15 mins of production + 13
            gameState.potatoes += lumpSum;
            createFloatingText(event.clientX, event.clientY, `+${formatNumber(lumpSum)}!`);
        }

        // Lucky Spud check
        if (gameState.purchasedUpgrades.has('luckySpud') && Math.random() < 0.1) {
            // Give the *other* reward
            if (roll >= 0.9) { // If they got the lump sum, give the buff
                 activateBuff('fryFrenzy', 77 * durationMultiplier);
                 showRandomEventNotification('🍀 Lucky Spud!', 'You got a bonus buff!');
            } else { // If they got the buff, give the lump sum
                const lumpSum = (gameState.totalPps * 60 * 15) + 13;
                gameState.potatoes += lumpSum;
                createFloatingText(event.clientX, event.clientY, `+${formatNumber(lumpSum)}! (Lucky)`);
                showRandomEventNotification('🍀 Lucky Spud!', 'You got a bonus lump sum!');
            }
        }   

        // Don't reset the main timer here, let the despawn timer handle it
    }

    function getRandomGoldenPotatoTime() {
        let time = (Math.random() * 600000) + 300000;
        // Eye for an Eye prestige upgrade halves time
        if (gameState.purchasedPrestigeUpgrades.has('eyeForAnEye')) {
            time /= 2;
        }
        // Golden Genome research halves time (stacks multiplicatively)
        if (gameState.buffs.goldenGenome && gameState.buffs.goldenGenome.expires > Date.now()) {
            time /= 2;
        } else if (gameState.buffs.goldenGenome) {
            delete gameState.buffs.goldenGenome;
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
            const expiry = buff.endTime || buff.expires;
            const timeLeft = expiry ? Math.ceil((expiry - Date.now()) / 1000) : 0;
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

        if (confirm(`Are you sure you want to Mash? You will gain ${formatNumber(gain)} Starch (✨) but your potatoes, generators, upgrades, and research will be reset.`)) {
            // Preserve prestige upgrades and achievements
            const prestigeUpgrades = new Set(gameState.purchasedPrestigeUpgrades);
            const achievements = new Set(gameState.unlockedAchievements);

            // Reset all relevant state
            gameState.potatoes = 0;
            gameState.totalPotatoesEarned = 0;
            gameState.clicks = 0;
            gameState.totalPps = 0;
            gameState.clickPower = 1;
            gameState.buffs = {};
            gameState.qualityLevel = 1;
            gameState.qualityPoints = 0;
            gameState.qualityInspections = 0;
            gameState.defectivePotatoes = 0;
            gameState.qualityBonusMultiplier = 1;
            gameState.totalPlayTime = 0;
            gameState.gameStartTime = Date.now();
            gameState.randomEventCooldown = 0;
            gameState.newsTickerMessages = [];
            gameState.researchPoints = 0;
            gameState.completedResearch = new Set();
            gameState.activeResearch = null;
            gameState.purchasedUpgrades = new Set();
            // Add starch
            gameState.starch += gain;
            gameState.totalStarch += gain;
            // Restore prestige upgrades and achievements
            gameState.purchasedPrestigeUpgrades = prestigeUpgrades;
            gameState.unlockedAchievements = achievements;

            // Reset generators
            generators.forEach(g => g.owned = 0);

            // Apply prestige effects
            if (gameState.purchasedPrestigeUpgrades.has('starchyStart')) {
                const farmerGen = generators.find(g => g.id === 'farmer');
                if (farmerGen) farmerGen.owned = 10;
            }

            recalculatePps();
            populateGenerators();
            populateUpgrades();
            populatePrestigeUpgrades();
            populateResearch();
            updateDisplay();
            saveGame();
            document.getElementById('prestige-tab-button').style.display = 'none';
            showAchievementNotification('Spudtastic Voyage');
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


    // --- Export/Import Logic ---
    function exportSave() {
        // Create save data
        const achievementArray = Array.from(gameState.unlockedAchievements);
        const upgradesArray = Array.from(gameState.purchasedUpgrades);
        const prestigeUpgradesArray = Array.from(gameState.purchasedPrestigeUpgrades);
        const completedResearchArray = Array.from(gameState.completedResearch);

        const saveState = {
            gameState: { 
                ...gameState, 
                unlockedAchievements: achievementArray,
                purchasedUpgrades: upgradesArray,
                purchasedPrestigeUpgrades: prestigeUpgradesArray,
                completedResearch: completedResearchArray,
            },
            generators: generators.map(g => ({ id: g.id, owned: g.owned })),
            exportTimestamp: Date.now(),
            version: "1.0"
        };

        // Convert to base64 string
        const saveString = btoa(JSON.stringify(saveState));
        
        // Create a textarea with the save data for easy copying
        const modal = document.createElement('div');
        modal.className = 'modal-overlay export-modal';
        modal.innerHTML = `
            <div class="modal-content export-modal-content">
                <h2>🥔 Export Save Data</h2>
                <p>Copy this text and save it somewhere safe:</p>
                <textarea id="export-textarea" readonly style="width: 100%; height: 200px; font-family: monospace; font-size: 12px;">${saveString}</textarea>
                <div style="margin-top: 10px;">
                    <button id="copy-export-btn">Copy to Clipboard</button>
                    <button id="close-export-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        // Select all text in textarea
        const textarea = document.getElementById('export-textarea');
        textarea.select();

        // Copy button functionality
        document.getElementById('copy-export-btn').addEventListener('click', () => {
            textarea.select();
            document.execCommand('copy');
            alert('Save data copied to clipboard!');
        });

        // Close button functionality
        document.getElementById('close-export-btn').addEventListener('click', () => {
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

    function importSave() {
        // Create import modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay import-modal';
        modal.innerHTML = `
            <div class="modal-content import-modal-content">
                <h2>🥔 Import Save Data</h2>
                <p>Paste your save data here:</p>
                <textarea id="import-textarea" placeholder="Paste your save data here..." style="width: 100%; height: 200px; font-family: monospace; font-size: 12px;"></textarea>
                <div style="margin-top: 10px;">
                    <button id="import-confirm-btn">Import Save</button>
                    <button id="close-import-btn">Cancel</button>
                </div>
                <p style="color: #ff6b6b; font-size: 12px; margin-top: 10px;">
                    ⚠️ Warning: This will overwrite your current save!
                </p>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        // Import button functionality
        document.getElementById('import-confirm-btn').addEventListener('click', () => {
            const importData = document.getElementById('import-textarea').value.trim();
            
            if (!importData) {
                alert('Please paste save data first!');
                return;
            }

            try {
                // Decode from base64 and parse JSON
                const saveState = JSON.parse(atob(importData));
                
                // Validate save data structure
                if (!saveState.gameState || !saveState.generators) {
                    throw new Error('Invalid save data structure');
                }

                // Confirm before importing
                if (confirm('Are you sure you want to import this save? This will overwrite your current progress!')) {
                    // Load the imported data
                    gameState = saveState.gameState;
                    
                    // Convert arrays back to Sets
                    gameState.unlockedAchievements = new Set(saveState.gameState.unlockedAchievements || []);
                    gameState.purchasedUpgrades = new Set(saveState.gameState.purchasedUpgrades || []);
                    gameState.purchasedPrestigeUpgrades = new Set(saveState.gameState.purchasedPrestigeUpgrades || []);
                    
                    // Ensure all required properties exist
                    if (!gameState.buffs) gameState.buffs = {};
                    if (!gameState.totalPotatoesEarned) gameState.totalPotatoesEarned = gameState.potatoes || 0;
                    if (!gameState.clicks) gameState.clicks = 0;
                    if (!gameState.starch) gameState.starch = 0;
                    if (!gameState.totalStarch) gameState.totalStarch = 0;

                    // Re-apply effects from loaded upgrades that don't persist automatically
                    if (gameState.purchasedUpgrades.has('researchLab')) {
                        researchBtn.style.display = 'inline-block';
                    }

                    // Load generator ownership
                    parsedState.generators.forEach(savedGen => {
                        const gameGen = generators.find(g => g.id === savedGen.id);
                        if (gameGen) {
                            gameGen.owned = savedGen.owned || 0;
                        }
                    });

                    // Save the imported data to localStorage
                    saveGame();
                    
                    // Refresh the game display
                    recalculatePps();
                    populateGenerators();
                    populateUpgrades();
                    populatePrestigeUpgrades();
                    populateAchievementsGrid();
                    updateDisplay();

                    alert('Save data imported successfully!');
                    
                    modal.style.display = 'none';
                    modal.remove();
                }
            } catch (error) {
                alert('Invalid save data! Please check your save string and try again.');
                console.error('Import error:', error);
            }
        });

        // Close button functionality
        document.getElementById('close-import-btn').addEventListener('click', () => {
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

    // --- Save/Load Logic ---
    function saveGame() {
        // Convert Sets to Arrays for JSON serialization
        const achievementArray = Array.from(gameState.unlockedAchievements);
        const upgradesArray = Array.from(gameState.purchasedUpgrades);
        const prestigeUpgradesArray = Array.from(gameState.purchasedPrestigeUpgrades);
        const completedResearchArray = Array.from(gameState.completedResearch);

        const saveState = {
            gameState: { 
                ...gameState, 
                unlockedAchievements: achievementArray,
                purchasedUpgrades: upgradesArray,
                purchasedPrestigeUpgrades: prestigeUpgradesArray,
                completedResearch: completedResearchArray,
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

            // Restore gameState by merging, not replacing
            gameState = { ...gameState, ...parsedState.gameState };

            // Correctly restore Sets from arrays, ensuring they exist
            gameState.purchasedUpgrades = new Set(parsedState.gameState.purchasedUpgrades || []);
            gameState.unlockedAchievements = new Set(parsedState.gameState.unlockedAchievements || []);
            gameState.completedResearch = new Set(parsedState.gameState.completedResearch || []);
            gameState.purchasedPrestigeUpgrades = new Set(parsedState.gameState.purchasedPrestigeUpgrades || []);

            // Restore generator ownership
            if (parsedState.generators) {
                parsedState.generators.forEach(savedGen => {
                    const gameGen = generators.find(g => g.id === savedGen.id);
                    if (gameGen) {
                        gameGen.owned = savedGen.owned || 0;
                    }
                });
            }
            
            console.log("Game loaded from localStorage.");
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
            
            // Apply research bonuses
            if (gen.id === 'sprout' || gen.id === 'farmer') {
                if (gameState.completedResearch.has('advFertilizers')) {
                    pps *= 1.25;
                }
            }
            if (gen.id === 'planet' || gen.id === 'portal') {
                if (gameState.completedResearch.has('gravitationalLensing')) {
                    pps *= 2;
                }
            }

            // Only apply upgrades that are for this generator
            for (const upgradeKey in upgrades) {
                const upgrade = upgrades[upgradeKey];
                if (gameState.purchasedUpgrades.has(upgradeKey)) {
                    if (upgrade.type === 'generator' && upgrade.generator === gen.id) {
                        pps *= 2;
                    }
                    // If you have dual_generator or global upgrades, handle them here as needed
                }
            }
            total += gen.owned * pps;
        });

        // Apply production boost upgrades (based on total potatoes made)
        let productionBonus = 0;
        if (gameState.purchasedUpgrades.has('potatoSerum')) {
            productionBonus += gameState.totalPotatoesEarned * 0.05;
        }
        if (gameState.purchasedUpgrades.has('potatoEmpire')) {
            productionBonus += gameState.totalPotatoesEarned * 0.10;
        }
        if (gameState.purchasedUpgrades.has('potatoInfinity')) {
            productionBonus += gameState.totalPotatoesEarned * 0.25;
        }
        total += productionBonus;

        // Apply dual generator upgrades
        if (gameState.purchasedUpgrades.has('massProduction')) {
            const cannonBonus = generators[2].owned * generators[2].basePps;
            const factoryBonus = generators[3].owned * generators[3].basePps;
            total += cannonBonus + factoryBonus; // Additional bonus equal to their base production
        }

        // Apply global multiplier upgrades
        if (gameState.purchasedUpgrades.has('quantumSpuds')) {
            total *= 1.5;
        }

        // Apply research global bonus
        if (gameState.completedResearch.has('potatoPlastics')) {
            total *= 1.10;
        }

        // Apply generator count upgrades
        if (gameState.purchasedUpgrades.has('kilotonPotato')) {
            const totalGenerators = generators.reduce((sum, gen) => sum + gen.owned, 0);
            const multiplier = Math.pow(2, Math.floor(totalGenerators / 1000));
            total *= multiplier;
        }

        // Apply global prestige multiplier
        if (gameState.purchasedPrestigeUpgrades.has('cosmicSeasoning')) {
            total *= 1.10;
        }

        // Apply Prestige Power multiplier
        if (gameState.purchasedPrestigeUpgrades.has('prestigePower')) {
            total *= (1 + (gameState.starch * 0.01));
        }

        // Apply Quality Control bonus
        if (gameState.purchasedUpgrades.has('qualityInspections')) {
            updateQualityBonus(); // Ensure bonus is current
            total *= gameState.qualityBonusMultiplier;
        }

        gameState.totalPps = total;
    }

    function calculateCost(gen) {
        return Math.ceil(gen.baseCost * Math.pow(1.15, gen.owned));
    }

    function createFloatingText(x, y, text, combo = 1) {
        const elem = document.createElement('div');
        elem.className = 'floating-text';
        
        // Color and size based on combo
        if (combo > 5) {
            elem.classList.add('combo-amazing');
        } else if (combo > 3) {
            elem.classList.add('combo-great');
        } else if (combo > 1) {
            elem.classList.add('combo-good');
        }
        
        // To avoid showing "+1.00" for small numbers, format it cleanly.
        const num = parseFloat((text || '').toString().replace(/[+,]/g, ''));
        if (!isNaN(num)) {
            if (num < 10) {
                elem.textContent = `+${num.toFixed(2)}`;
            } else {
                elem.textContent = `+${formatNumber(Math.floor(num))}`;
            }
            if (text.includes('COMBO')) {
                elem.textContent = text; // Keep the full combo text
            }
        } else {
            elem.textContent = text;
        }
        
        // Position the text near the click
        const rect = potatoImg.getBoundingClientRect();
        elem.style.left = `${x - rect.left + Math.random() * 40 - 20}px`;
        elem.style.top = `${y - rect.top + Math.random() * 40 - 20}px`;

        potatoTextOverlay.appendChild(elem);

        // Remove the element after the animation finishes
        setTimeout(() => {
            elem.remove();
        }, 2000);
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
