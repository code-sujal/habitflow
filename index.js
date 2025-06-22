// Global variables
let currentUser = null;
let selectedHabitIcon = '🎯';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupThemeToggle();
});

function initializeApp() {
    const loggedInUser = localStorage.getItem('currentUser');
    if (loggedInUser) {
        currentUser = loggedInUser;
        showMainApp();
        loadUserData();
    } else {
        showAuthContainer();
    }
}

// Authentication Functions
function showLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
}

function showRegister() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
}

function register() {
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    if (!username || !email || !password) {
        alert('Please fill in all fields');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    // Check if user already exists
    const existingUser = localStorage.getItem(`user_${username}`);
    if (existingUser) {
        alert('Username already exists');
        return;
    }

    // Create new user
    const userData = {
        username,
        email,
        password,
        habits: [],
        tasks: [],
        achievements: {},
        totalPoints: 0,
        streakFreezes: 3,
        streakFreezesUsed: 0,
        lastFreezeRefill: new Date().toISOString(),
        createdAt: new Date().toISOString()
    };

    localStorage.setItem(`user_${username}`, JSON.stringify(userData));
    alert('Registration successful! Please login.');
    showLogin();
}

function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        alert('Please enter username and password');
        return;
    }

    const userData = localStorage.getItem(`user_${username}`);
    if (!userData) {
        alert('User not found');
        return;
    }

    const user = JSON.parse(userData);
    if (user.password !== password) {
        alert('Invalid password');
        return;
    }

    currentUser = username;
    localStorage.setItem('currentUser', username);
    showMainApp();
    loadUserData();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showAuthContainer();
}

function showAuthContainer() {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('userWelcome').textContent = `Welcome, ${currentUser}!`;
}

// Data Management
function getUserData() {
    const userData = localStorage.getItem(`user_${currentUser}`);
    return userData ? JSON.parse(userData) : { habits: [], tasks: [] };
}

function saveUserData(data) {
    const existingData = getUserData();
    const updatedData = { ...existingData, ...data };
    localStorage.setItem(`user_${currentUser}`, JSON.stringify(updatedData));
}

function loadUserData() {
    initializeNewFeatures();
    const userData = getUserData();
    renderHabits(userData.habits || []);
    renderTasks(userData.tasks || []);
    updateStats();
    renderAchievements();
    updatePointsDisplay();
    generateReport('weekly');
}

// Habit Management
function showAddHabit() {
    document.getElementById('habitModal').classList.remove('hidden');
    setupHabitIcons();
}

function closeHabitModal() {
    document.getElementById('habitModal').classList.add('hidden');
    document.getElementById('habitName').value = '';
    selectedHabitIcon = '🎯';
}

function setupHabitIcons() {
    const icons = document.querySelectorAll('.habit-icon');
    icons.forEach(icon => {
        icon.addEventListener('click', () => {
            icons.forEach(i => i.classList.remove('selected'));
            icon.classList.add('selected');
            selectedHabitIcon = icon.dataset.icon;
        });
    });
}

function addHabit() {
    const habitName = document.getElementById('habitName').value.trim();
    if (!habitName) {
        alert('Please enter a habit name');
        return;
    }

    const userData = getUserData();
    const newHabit = {
        id: Date.now(),
        name: habitName,
        icon: selectedHabitIcon,
        streak: 0,
        completedDates: [],
        streakFreezes: [],
        createdAt: new Date().toISOString()
    };

    userData.habits = userData.habits || [];
    userData.habits.push(newHabit);
    saveUserData(userData);
    renderHabits(userData.habits);
    closeHabitModal();
    updateStats();
    checkAchievements();
}

function toggleHabit(habitId) {
    const userData = getUserData();
    const habit = userData.habits.find(h => h.id === habitId);
    const today = new Date().toDateString();

    if (habit.completedDates.includes(today)) {
        // Remove today's completion
        habit.completedDates = habit.completedDates.filter(date => date !== today);
        habit.streak = Math.max(0, habit.streak - 1);
    } else {
        // Add today's completion
        habit.completedDates.push(today);
        habit.streak += 1;
    }

    saveUserData(userData);
    renderHabits(userData.habits);
    updateStats();
    checkAchievements();
}

function deleteHabit(habitId) {
    if (confirm('Are you sure you want to delete this habit?')) {
        const userData = getUserData();
        userData.habits = userData.habits.filter(h => h.id !== habitId);
        saveUserData(userData);
        renderHabits(userData.habits);
        updateStats();
        checkAchievements();
    }
}

function renderHabits(habits) {
    const habitsList = document.getElementById('habitsList');
    const today = new Date().toDateString();
    const userData = getUserData();

    habitsList.innerHTML = habits.map(habit => {
        const isCompletedToday = habit.completedDates.includes(today);
        const progress = habit.completedDates.length > 0 ? 
            Math.min(100, (habit.streak / 30) * 100) : 0;
        
        const hasStreakFreezeToday = habit.streakFreezes && habit.streakFreezes.includes(today);
        const canUseFreeze = (userData.streakFreezes || 0) > 0 && !isCompletedToday && !hasStreakFreezeToday;

        return `
            <div class="habit-card">
                <div class="habit-header">
                    <span class="habit-icon">${habit.icon}</span>
                    <h3>${habit.name}</h3>
                    <span class="habit-streak">
                        ${habit.streak} day${habit.streak !== 1 ? 's' : ''}
                        ${hasStreakFreezeToday ? '<span class="streak-freeze-indicator">❄️ Frozen</span>' : ''}
                    </span>
                    <button onclick="deleteHabit(${habit.id})" class="task-delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="habit-progress">
                    <div class="habit-progress-fill" style="width: ${progress}%"></div>
                </div>
                <div class="habit-controls">
                    <button onclick="toggleHabit(${habit.id})" 
                            class="habit-check ${isCompletedToday ? 'completed' : ''}"
                            style="flex: 1;">
                        ${isCompletedToday ? '✓ Completed Today' : 'Mark as Done'}
                    </button>
                    ${canUseFreeze ? `
                        <button onclick="showStreakFreezeModal(${habit.id})" class="freeze-btn">
                            ❄️ Freeze
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Task Management
function addTask() {
    const taskInput = document.getElementById('taskInput');
    const taskText = taskInput.value.trim();
    
    if (!taskText) return;

    const userData = getUserData();
    const newTask = {
        id: Date.now(),
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString()
    };

    userData.tasks = userData.tasks || [];
    userData.tasks.push(newTask);
    saveUserData(userData);
    renderTasks(userData.tasks);
    taskInput.value = '';
    updateStats();
}

function toggleTask(taskId) {
    const userData = getUserData();
    const task = userData.tasks.find(t => t.id === taskId);
    task.completed = !task.completed;
    saveUserData(userData);
    renderTasks(userData.tasks);
    updateStats();
}

function deleteTask(taskId) {
    const userData = getUserData();
    userData.tasks = userData.tasks.filter(t => t.id !== taskId);
    saveUserData(userData);
    renderTasks(userData.tasks);
    updateStats();
}

function renderTasks(tasks) {
    const tasksList = document.getElementById('tasksList');
    
    if (tasks.length === 0) {
        tasksList.innerHTML = '<div class="task-item">No tasks yet. Add one above!</div>';
        return;
    }

    tasksList.innerHTML = tasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}">
            <input type="checkbox" class="task-checkbox" 
                   ${task.completed ? 'checked' : ''} 
                   onchange="toggleTask(${task.id})">
            <span class="task-text">${task.text}</span>
            <button onclick="deleteTask(${task.id})" class="task-delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Statistics and Progress
function updateStats() {
    const userData = getUserData();
    const habits = userData.habits || [];
    const tasks = userData.tasks || [];
    const today = new Date().toDateString();

    // Today's progress
    const completedHabitsToday = habits.filter(h => h.completedDates.includes(today)).length;
    const totalHabits = habits.length;
    const todayProgress = totalHabits > 0 ? Math.round((completedHabitsToday / totalHabits) * 100) : 0;

    // Active habits
    const activeHabits = habits.length;

    // Longest streak
    const longestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;

    // Update UI
    document.getElementById('todayProgress').textContent = `${todayProgress}%`;
    document.getElementById('activeHabits').textContent = activeHabits;
    document.getElementById('longestStreak').textContent = longestStreak;
    if (document.getElementById('totalPointsDashboard')) {
        document.getElementById('totalPointsDashboard').textContent = userData.totalPoints || 0;
    }

    // Update progress circle
    const progressCircle = document.querySelector('.progress-circle');
    if (progressCircle) {
        const angle = (todayProgress / 100) * 360;
        progressCircle.style.background = `conic-gradient(var(--primary-color) ${angle}deg, var(--secondary-color) ${angle}deg)`;
    }
}

// Theme Management
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Event Listeners
const taskInputElem = document.getElementById('taskInput');
if (taskInputElem) {
    taskInputElem.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    });
}

// Achievement System (updated without mood tracking)
const achievements = [
    {
        id: 'first_habit',
        name: 'Getting Started',
        description: 'Create your first habit',
        icon: '🌱',
        points: 10,
        condition: (userData) => userData.habits && userData.habits.length >= 1
    },
    {
        id: 'week_warrior',
        name: 'Week Warrior',
        description: 'Complete any habit for 7 days straight',
        icon: '🔥',
        points: 50,
        condition: (userData) => userData.habits && userData.habits.some(h => h.streak >= 7)
    },
    {
        id: 'month_master',
        name: 'Month Master',
        description: 'Complete any habit for 30 days straight',
        icon: '👑',
        points: 200,
        condition: (userData) => userData.habits && userData.habits.some(h => h.streak >= 30)
    },
    {
        id: 'multi_tasker',
        name: 'Multi-Tasker',
        description: 'Have 5 active habits',
        icon: '🎯',
        points: 75,
        condition: (userData) => userData.habits && userData.habits.length >= 5
    },
    {
        id: 'perfect_week',
        name: 'Perfect Week',
        description: 'Complete all habits for 7 consecutive days',
        icon: '⭐',
        points: 100,
        condition: (userData) => checkPerfectWeek(userData)
    },
    {
        id: 'comeback_kid',
        name: 'Comeback Kid',
        description: 'Use a streak freeze and continue your habit',
        icon: '💪',
        points: 40,
        condition: (userData) => userData.streakFreezesUsed && userData.streakFreezesUsed > 0
    },
    {
        id: 'task_master',
        name: 'Task Master',
        description: 'Complete 50 tasks',
        icon: '✅',
        points: 60,
        condition: (userData) => {
            const completedTasks = userData.tasks ? userData.tasks.filter(t => t.completed).length : 0;
            return completedTasks >= 50;
        }
    }
];

// Global variables for features
let currentStreakFreezeHabitId = null;

// Initialize new features
function initializeNewFeatures() {
    const userData = getUserData();
    
    // Initialize achievements if not exists
    if (!userData.achievements) {
        userData.achievements = {};
        userData.totalPoints = 0;
    }
    
    // Initialize streak freezes if not exists
    if (typeof userData.streakFreezes !== 'number') {
        userData.streakFreezes = 3;
        userData.lastFreezeRefill = new Date().toISOString();
    }
    if (typeof userData.streakFreezesUsed !== 'number') {
        userData.streakFreezesUsed = 0;
    }
    
    saveUserData(userData);
    checkAchievements();
    refillStreakFreezes();
}

// Achievement System Functions
function checkAchievements() {
    const userData = getUserData();
    let newAchievements = [];
    
    achievements.forEach(achievement => {
        if (!userData.achievements[achievement.id] && achievement.condition(userData)) {
            userData.achievements[achievement.id] = {
                unlockedAt: new Date().toISOString(),
                points: achievement.points
            };
            userData.totalPoints = (userData.totalPoints || 0) + achievement.points;
            newAchievements.push(achievement);
        }
    });
    
    if (newAchievements.length > 0) {
        saveUserData(userData);
        showAchievementNotification(newAchievements);
    }
    
    renderAchievements();
    updatePointsDisplay();
}

function renderAchievements() {
    const userData = getUserData();
    const achievementsList = document.getElementById('achievementsList');
    if (!achievementsList) return;
    achievementsList.innerHTML = achievements.map(achievement => {
        const isUnlocked = userData.achievements && userData.achievements[achievement.id];
        const progress = getAchievementProgress(achievement, userData);
        
        return `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : ''}">
                <div class="achievement-points">${achievement.points}pts</div>
                <div class="achievement-header">
                    <span class="achievement-icon">${achievement.icon}</span>
                    <div class="achievement-info">
                        <h4>${achievement.name}</h4>
                        <p class="achievement-description">${achievement.description}</p>
                    </div>
                </div>
                ${!isUnlocked ? `
                    <div class="achievement-progress">
                        <div class="achievement-progress-bar">
                            <div class="achievement-progress-fill" style="width: ${progress.percentage}%"></div>
                        </div>
                        <div class="achievement-progress-text">${progress.current}/${progress.target}</div>
                    </div>
                ` : '<div class="achievement-unlocked">✓ Unlocked!</div>'}
            </div>
        `;
    }).join('');
}

function getAchievementProgress(achievement, userData) {
    switch (achievement.id) {
        case 'first_habit':
            return { current: userData.habits ? userData.habits.length : 0, target: 1, percentage: Math.min(100, ((userData.habits ? userData.habits.length : 0) / 1) * 100) };
        case 'week_warrior':
            const maxStreak = userData.habits ? Math.max(0, ...userData.habits.map(h => h.streak)) : 0;
            return { current: maxStreak, target: 7, percentage: Math.min(100, (maxStreak / 7) * 100) };
        case 'month_master':
            const maxStreak30 = userData.habits ? Math.max(0, ...userData.habits.map(h => h.streak)) : 0;
            return { current: maxStreak30, target: 30, percentage: Math.min(100, (maxStreak30 / 30) * 100) };
        case 'multi_tasker':
            return { current: userData.habits ? userData.habits.length : 0, target: 5, percentage: Math.min(100, ((userData.habits ? userData.habits.length : 0) / 5) * 100) };
        case 'task_master':
            const completedTasks = userData.tasks ? userData.tasks.filter(t => t.completed).length : 0;
            return { current: completedTasks, target: 50, percentage: Math.min(100, (completedTasks / 50) * 100) };
        default:
            return { current: 0, target: 1, percentage: 0 };
    }
}

function updatePointsDisplay() {
    const userData = getUserData();
    if (document.getElementById('totalPoints')) {
        document.getElementById('totalPoints').textContent = userData.totalPoints || 0;
    }
}

// Achievement notification
function showAchievementNotification(achievements) {
    achievements.forEach(achievement => {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-notification-content">
                <span class="achievement-notification-icon">${achievement.icon}</span>
                <div>
                    <h4>Achievement Unlocked!</h4>
                    <p>${achievement.name}</p>
                    <small>+${achievement.points} points</small>
                </div>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--gradient-accent);
            color: white;
            padding: 1rem;
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-xl);
            z-index: 1001;
            animation: slideInRight 0.5s ease, fadeOut 0.5s ease 3s forwards;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3500);
    });
}

// Streak Freeze Functions
function showStreakFreezeModal(habitId) {
    const userData = getUserData();
    currentStreakFreezeHabitId = habitId;
    if (document.getElementById('availableFreezes')) {
        document.getElementById('availableFreezes').textContent = userData.streakFreezes || 0;
    }
    document.getElementById('streakFreezeModal').classList.remove('hidden');
}

function closeStreakFreezeModal() {
    document.getElementById('streakFreezeModal').classList.add('hidden');
    currentStreakFreezeHabitId = null;
}

function applyStreakFreeze() {
    const userData = getUserData();
    
    if ((userData.streakFreezes || 0) <= 0) {
        alert('No streak freezes available');
        return;
    }
    
    const habit = userData.habits.find(h => h.id === currentStreakFreezeHabitId);
    const today = new Date().toDateString();
    
    if (!habit.streakFreezes) habit.streakFreezes = [];
    habit.streakFreezes.push(today);
    
    userData.streakFreezes--;
    userData.streakFreezesUsed = (userData.streakFreezesUsed || 0) + 1;
    
    saveUserData(userData);
    closeStreakFreezeModal();
    renderHabits(userData.habits);
    checkAchievements();
}

function refillStreakFreezes() {
    const userData = getUserData();
    const lastRefill = new Date(userData.lastFreezeRefill || new Date());
    const now = new Date();
    const daysSinceRefill = Math.floor((now - lastRefill) / (1000 * 60 * 60 * 24));
    
    if (daysSinceRefill >= 7) {
        userData.streakFreezes = Math.min(3, (userData.streakFreezes || 0) + 1);
        userData.lastFreezeRefill = now.toISOString();
        saveUserData(userData);
    }
}

// Reports Functions
function showWeeklyReport() {
    document.getElementById('weeklyBtn').classList.add('active');
    document.getElementById('monthlyBtn').classList.remove('active');
    generateReport('weekly');
}

function showMonthlyReport() {
    document.getElementById('monthlyBtn').classList.add('active');
    document.getElementById('weeklyBtn').classList.remove('active');
    generateReport('monthly');
}

function generateReport(period) {
    const userData = getUserData();
    const habits = userData.habits || [];
    const now = new Date();
    const daysBack = period === 'weekly' ? 7 : 30;
    
    let totalCompletions = 0;
    let totalPossible = habits.length * daysBack;
    let bestPerformer = null;
    let bestPerformance = 0;
    
    const habitPerformance = habits.map(habit => {
        const completionsInPeriod = habit.completedDates.filter(date => {
            const completionDate = new Date(date);
            const daysDiff = Math.floor((now - completionDate) / (1000 * 60 * 60 * 24));
            return daysDiff <= daysBack;
        }).length;
        
        totalCompletions += completionsInPeriod;
        const percentage = Math.round((completionsInPeriod / daysBack) * 100);
        
        if (percentage > bestPerformance) {
            bestPerformance = percentage;
            bestPerformer = habit.name;
        }
        
        return {
            ...habit,
            completionsInPeriod,
            percentage
        };
    });
    
    const overallPercentage = totalPossible > 0 ? Math.round((totalCompletions / totalPossible) * 100) : 0;
    
    const reportsContainer = document.getElementById('reportsContainer');
    if (!reportsContainer) return;
    reportsContainer.innerHTML = `
        <div class="report-content">
            <div class="report-summary">
                <div class="report-metric">
                    <span class="report-metric-value">${overallPercentage}%</span>
                    <span class="report-metric-label">Overall Completion</span>
                </div>
                <div class="report-metric">
                    <span class="report-metric-value">${totalCompletions}</span>
                    <span class="report-metric-label">Total Completions</span>
                </div>
                <div class="report-metric">
                    <span class="report-metric-value">${bestPerformer || 'None'}</span>
                    <span class="report-metric-label">Best Performer</span>
                </div>
                <div class="report-metric">
                    <span class="report-metric-value">${habits.length}</span>
                    <span class="report-metric-label">Active Habits</span>
                </div>
            </div>
            
            <div class="habit-performance">
                <h4>Habit Performance</h4>
                ${habitPerformance.map(habit => `
                    <div class="habit-performance-item">
                        <div class="habit-performance-name">
                            <span>${habit.icon}</span>
                            <span>${habit.name}</span>
                        </div>
                        <div class="habit-performance-stats">
                            <span class="performance-percentage">${habit.percentage}%</span>
                            <span class="performance-streak">${habit.completionsInPeriod}/${daysBack} days</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Helper Functions
function checkPerfectWeek(userData) {
    if (!userData.habits || userData.habits.length === 0) return false;
    
    const now = new Date();
    for (let i = 0; i < 7; i++) {
        const checkDate = new Date(now);
        checkDate.setDate(checkDate.getDate() - i);
        const dateString = checkDate.toDateString();
        
        const allCompleted = userData.habits.every(habit => 
            habit.completedDates.includes(dateString) || 
            (habit.streakFreezes && habit.streakFreezes.includes(dateString))
        );
        
        if (!allCompleted) return false;
    }
    return true;
}

// CSS for achievement notifications
const achievementNotificationCSS = `
@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
}

.achievement-notification-content {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.achievement-notification-icon {
    font-size: 2rem;
}

.achievement-notification h4 {
    margin: 0;
    font-size: 1rem;
}

.achievement-notification p {
    margin: 0;
    font-size: 0.9rem;
}

.achievement-notification small {
    font-size: 0.8rem;
    opacity: 0.9;
}
`;

// Add the CSS to the page
const style = document.createElement('style');
style.textContent = achievementNotificationCSS;
document.head.appendChild(style);


// Navigation Functions
function showDashboard() {
    document.getElementById('dashboardSection').classList.remove('hidden');
    document.getElementById('accountSection').classList.add('hidden');
    
    document.getElementById('dashboardBtn').classList.add('active');
    document.getElementById('accountBtn').classList.remove('active');
}

function showAccount() {
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('accountSection').classList.remove('hidden');
    
    document.getElementById('dashboardBtn').classList.remove('active');
    document.getElementById('accountBtn').classList.add('active');
    
    // Load account data
    loadAccountData();
}

// Account Data Loading
function loadAccountData() {
    const userData = getUserData();
    
    // Update profile info
    document.getElementById('accountUsername').textContent = currentUser;
    document.getElementById('accountEmail').textContent = userData.email || 'user@email.com';
    
    // Update profile stats
    document.getElementById('profileHabits').textContent = userData.habits ? userData.habits.length : 0;
    document.getElementById('profilePoints').textContent = userData.totalPoints || 0;
    
    // Calculate days active
    const createdDate = new Date(userData.createdAt || new Date());
    const daysActive = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));
    document.getElementById('profileDays').textContent = daysActive;
    
    // Update achievements summary
    const unlockedCount = userData.achievements ? Object.keys(userData.achievements).length : 0;
    document.getElementById('unlockedCount').textContent = unlockedCount;
    
    // Update freeze count
    document.getElementById('availableFreezesCount').textContent = userData.streakFreezes || 3;
    
    // Render achievements and reports
    renderAchievements();
    generateReport('weekly');
}

// Data Export Function
function exportUserData() {
    const userData = getUserData();
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `habitflow-backup-${currentUser}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message
    showNotification('Data exported successfully!', 'success');
}

// Reset Data Function
function resetUserData() {
    if (confirm('Are you sure you want to reset all your data? This action cannot be undone.')) {
        const userData = getUserData();
        const resetData = {
            username: userData.username,
            email: userData.email,
            password: userData.password,
            habits: [],
            tasks: [],
            achievements: {},
            totalPoints: 0,
            streakFreezes: 3,
            streakFreezesUsed: 0,
            lastFreezeRefill: new Date().toISOString(),
            createdAt: userData.createdAt
        };
        
        saveUserData(resetData);
        
        // Refresh the display
        loadUserData();
        loadAccountData();
        
        showNotification('All data has been reset!', 'info');
    }
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--${type === 'success' ? 'accent' : type === 'error' ? 'danger' : 'primary'}-color);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-lg);
        z-index: 1001;
        animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.5s forwards;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Update the loadUserData function to include dashboard stats
function loadUserData() {
    initializeNewFeatures();
    const userData = getUserData();
    renderHabits(userData.habits || []);
    renderTasks(userData.tasks || []);
    updateStats();
    checkAchievements();
}

// Footer Enhancement Functions
document.addEventListener('DOMContentLoaded', () => {
    initializeFooter();
});

function initializeFooter() {
    // Add smooth scroll to top functionality
    const footer = document.querySelector('.app-footer');
    
    // Create scroll to top button
    const scrollToTopBtn = document.createElement('button');
    scrollToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    scrollToTopBtn.className = 'scroll-to-top';
    scrollToTopBtn.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 50px;
        height: 50px;
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        opacity: 0;
        transform: translateY(20px);
        transition: var(--transition);
    `;
    
    document.body.appendChild(scrollToTopBtn);
    
    // Show/hide scroll to top button
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            scrollToTopBtn.style.opacity = '1';
            scrollToTopBtn.style.transform = 'translateY(0)';
        } else {
            scrollToTopBtn.style.opacity = '0';
            scrollToTopBtn.style.transform = 'translateY(20px)';
        }
    });
    
    // Scroll to top functionality
    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Add hover effects to footer elements
    const footerElements = document.querySelectorAll('.footer-section ul li');
    footerElements.forEach(element => {
        element.addEventListener('click', () => {
            // Add click animation
            element.style.transform = 'scale(0.95)';
            setTimeout(() => {
                element.style.transform = 'translateX(5px)';
            }, 100);
        });
    });
}
