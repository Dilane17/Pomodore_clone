// ================================================================
// 🍅 APPLICATION POMODORO COMPLÈTE - VERSION CORRIGÉE
// ================================================================

// ================================================================
// 📋 VARIABLES GLOBALES
// ================================================================

// Sélection des éléments du DOM - Timer
const toggleBtn = document.getElementById('toggleBtn');
const breakBtn = document.getElementById('breakBtn');
const resetBtn = document.getElementById('resetBtn');
const timer = document.getElementById('timer');
const workBtn = document.getElementById('workBtn');
const progressBar = document.getElementById('progressBar');

// Sélection des éléments du DOM - Paramètres
const settingsIcone = document.getElementById('settingsIcone');
const settingsDialog = document.getElementById('settingsDialog');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const changeTimeBtn = document.getElementById('changeTimeBtn');
const workDuration = document.getElementById('workDuration');
const breakDuration = document.getElementById('breakDuration');
const longBreakDurationInput = document.getElementById('longBreakDuration');
const pomodorosUtilLongBreakInput = document.getElementById('pomodorosUntilLongBreak');

// Sélection des éléments du DOM - Tâches
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const tasksList = document.getElementById('tasksList');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// Sélection des éléments du DOM - Persistance
const dataManagementBtn = document.getElementById('dataManagementBtn');
const dataManagementDialog = document.getElementById('dataManagementDialog');
const closeDataManagementBtn = document.getElementById('closeDataManagementBtn');
const importFileInput = document.getElementById('importFileInput');
const saveIndicator = document.getElementById('saveIndicator');
const saveIcon = document.getElementById('saveIcon');
const saveLabel = document.getElementById('saveLabel');
const statusIndicator = document.getElementById('statusIndicator');

// Variables d'état du timer
let remainingTime = 1500; // 25 minutes en secondes
let isRunning = false; 
let countDown = null;
let isWorkSession = true; // true = travail, false = pause
let workSessionDuration = 1500; // 25 minutes en secondes
let breakSessionDuration = 300; // 5 minutes en secondes
let longBreakDuration = 900; // 15 minutes en secondes
let pomodorosUtilLongBreak = 4; // Nombre de pomodoros avant pause longue
let initialTime = 1500; // Temps initial de la session (pour barre de progression)

// Variables de statistiques
let completedPomodoros = 0; // Compteur de sessions terminées
let totalFocusTime = 0; // Temps total de concentration en secondes
let currentStreak = 0; // Compteur de sessions consécutives
let currentPomodoroInCycle = 0; // Compteur de pomodoros dans le cycle actuel

// Variables de gestion des tâches
let tasks = [];
let taskId = 1;

// Variables de persistance
let autoSaveEnabled = true;
let autoSaveInterval = null;
let nextAutoSaveTime = null;

// ================================================================
// 💾 CONSTANTS DE STOCKAGE
// ================================================================

const STORAGE_KEYS = {
    STATISTICS: 'pomodoro_statistics',
    TASKS: 'pomodoro_tasks',
    SETTINGS: 'pomodoro_settings',
    TASK_ID_COUNTER: 'pomodoro_task_id',
    APP_VERSION: 'pomodoro_version'
};

const APP_VERSION = '1.0.0';

// ================================================================
// 🔧 FONCTIONS UTILITAIRES
// ================================================================

function formatTemps(seconde) {
    const minutes = Math.floor(seconde / 60);
    const secondes = seconde % 60;
    return String(minutes).padStart(2, '0') + ':' + String(secondes).padStart(2, '0');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function formatTaskDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('fr-FR');
}

// ================================================================
// 🔔 GESTION DES NOTIFICATIONS
// ================================================================

async function setupNotifications() {
    if (!("Notification" in window)) {
        console.error("Ce navigateur ne supporte pas les notifications.");
        return false;
    }

    if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        console.log("Permission de notification:", permission);
    }

    return Notification.permission === "granted";
}

function sendNotification() {
    if (Notification.permission === "granted") {
        let title, body;
        
        if (!isWorkSession) {
            // Session de travail terminée
            title = "🎉 Session de travail terminée !";
            body = `Temps de prendre une pause de ${Math.floor(breakSessionDuration / 60)} minutes.`;
        } else {
            // Pause terminée
            title = "⏰ Pause terminée !";
            body = `Temps de reprendre le travail pendant ${Math.floor(workSessionDuration / 60)} minutes.`;
        }
        
        new Notification(title, {
            body: body,
            icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><text y='50' font-size='50'>🍅</text></svg>",
            requireInteraction: true
        });
    }
}

// ================================================================
// 📊 GESTION DES STATISTIQUES
// ================================================================

function updateStats() {
    const completedPomodorosElement = document.getElementById('completedPomodoros');
    const totalFocusTimeElement = document.getElementById('totalFocusTime');
    const currentStreakElement = document.getElementById('currentStreak');

    if (!completedPomodorosElement || !totalFocusTimeElement || !currentStreakElement) {
        console.error("Éléments de statistiques non trouvés dans le DOM");
        return;
    }

    completedPomodorosElement.textContent = completedPomodoros;
    
    const totalHours = Math.floor(totalFocusTime / 3600);
    const totalMinutes = Math.floor((totalFocusTime % 3600) / 60);
    totalFocusTimeElement.textContent = `${totalHours}h ${totalMinutes}m`;
    
    currentStreakElement.textContent = currentStreak;
    
    console.log(`📊 Stats mises à jour: ${completedPomodoros} pomodoros, ${totalHours}h${totalMinutes}m, série: ${currentStreak}`);
}

function updateProgressBar() {
    if (!progressBar) {
        console.error("Barre de progression non trouvée");
        return;
    }
    
    const timeElapsed = initialTime - remainingTime;
    const progressPercentage = Math.max(0, Math.min(100, (timeElapsed / initialTime) * 100));
    
    progressBar.style.width = progressPercentage + '%';
    
    if (isWorkSession) {
        progressBar.classList.remove('break');
    } else {
        progressBar.classList.add('break');
    }
}

function recordCompletedSession() {
    if (isWorkSession) {
        completedPomodoros++;
        currentStreak++;
        currentPomodoroInCycle++;
        totalFocusTime += initialTime;
        
        console.log(`✅ Pomodoro #${completedPomodoros} terminé! Série: ${currentStreak}`);
        
        setTimeout(() => {
            const currentTask = getCurrentTask();
            if (currentTask) {
                completeTaskAfterPomodoro();
            }
        }, 1000);
    } else {
        console.log(`☕ Pause terminée`);
    }
    
    updateStats();
    saveStatistics();
}

function resetStreak() {
    currentStreak = 0;
    updateStats();
    console.log("🔄 Série remise à zéro");
    saveAllData();
}

// ================================================================
// ⏰ GESTION DU TIMER
// ================================================================

function updateUI() {
    timer.textContent = formatTemps(remainingTime);
    
    workBtn.classList.toggle('active', isWorkSession);
    breakBtn.classList.toggle('active', !isWorkSession);
    
    if (isWorkSession) {
        breakBtn.classList.remove('active');
        breakBtn.classList.remove('break');
    } else {
        workBtn.classList.remove('active');
        breakBtn.classList.add('break');
    }
    
    toggleBtn.innerHTML = isRunning ? 
        '<i class="fas fa-pause"></i> Pause' : 
        '<i class="fas fa-play"></i> Démarrer';

    updateProgressBar();
    updateTimerWithCurrentTask();
    
    timer.className = isWorkSession ? 'work-session' : 'break-session';
    
    if (remainingTime <= 10 && remainingTime > 0 && isRunning) {
        timer.classList.add('pulse');
    } else {
        timer.classList.remove('pulse');
    }
}

function stopTimer() {
    if (countDown !== null) {
        clearInterval(countDown);
        countDown = null;
    }
    isRunning = false;
    toggleBtn.disabled = false;
    timer.classList.remove('pulse');
    updateUI();
}

function startTimer() {
    isRunning = true;
    updateUI();
    
    countDown = setInterval(() => {
        remainingTime--;
        updateUI();
        
        if (remainingTime <= 0) {
            stopTimer();
            handleSessionComplete();
        }
    }, 1000);
}

function handleSessionComplete() {
    recordCompletedSession();

    setupNotifications().then(canNotify => {
        if (canNotify) {
            sendNotification();
        }
    });

    const nextSession = determineNextSessionType();
    
    if (nextSession === "pause courte") {
        switchSession();
    } else if (nextSession === "pause longue") {
        startLongBreak();
    } else {
        switchSession();
    }
}

function switchSession() {
    isWorkSession = !isWorkSession;
    remainingTime = isWorkSession ? workSessionDuration : breakSessionDuration;
    initialTime = remainingTime;
    updateUI();
}

function resetToCurrentSession() {
    if (isRunning && isWorkSession) {
        resetStreak();
    }

    stopTimer();
    remainingTime = isWorkSession ? workSessionDuration : breakSessionDuration;
    initialTime = remainingTime;
    updateUI();
}

// ================================================================
// 🔄 GESTION DES CYCLES DE POMODORO
// ================================================================

function isTimeForLongBreak() {
    return currentPomodoroInCycle >= pomodorosUtilLongBreak;
}

function determineNextSessionType() {
    if (!isWorkSession) {
        return "travail";
    } else if (isWorkSession && isTimeForLongBreak()) {
        return "pause longue";
    } else {
        return "pause courte";
    }
}

function startLongBreak() {
    isWorkSession = false;
    remainingTime = longBreakDuration;
    initialTime = longBreakDuration;
    currentPomodoroInCycle = 0;
    updateUI();
    console.log(`🛌 Pause longue démarrée (${Math.floor(longBreakDuration / 60)} min)`);
}

// ================================================================
// 📝 GESTION DES TÂCHES
// ================================================================

function addTask(taskText) {
    const trimmedText = taskText?.trim();
    if (!trimmedText) {
        showTaskError("Veuillez saisir une tâche");
        return false;
    }
    
    if (trimmedText.length > 100) {
        showTaskError("La tâche ne peut pas dépasser 100 caractères");
        return false;
    }

    const newTask = {
        id: taskId++,
        text: trimmedText,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null
    };

    tasks.unshift(newTask);
    renderTasks();
    
    taskInput.value = '';
    
    console.log(`✅ Tâche ajoutée: "${newTask.text}"`);
    saveTasks();
    return true;
}

function toggleTaskComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    
    renderTasks();
    console.log(`🔄 Tâche ${task.completed ? 'terminée' : 'réactivée'}: "${task.text}"`);
    saveTasks();
}

function deleteTask(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const deletedTask = tasks.splice(taskIndex, 1)[0];
    renderTasks();
    console.log(`🗑️ Tâche supprimée: "${deletedTask.text}"`);
    saveTasks();
}

function editTask(taskId, newText) {
    const trimmedText = newText?.trim();
    if (!trimmedText) {
        showTaskError('Le texte ne peut pas être vide');
        return false;
    }

    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.text = trimmedText;
        renderTasks();
        console.log(`✏️ Tâche modifiée: "${task.text}"`);
        saveTasks();
        return true;
    }
    return false;
}

function renderTasks() {
    if (!tasksList) {
        console.error("Liste des tâches non trouvée");
        return;
    }

    tasksList.innerHTML = '';

    if (tasks.length === 0) {
        tasksList.innerHTML = `
            <div class="no-tasks">
                <i class="fas fa-clipboard-list"></i>
                <p>Aucune tâche ajoutée</p>
                <small>Ajoutez une tâche pour commencer !</small>
            </div>
        `;
    } else {
        tasks.forEach(task => {
            const taskElement = createTaskElement(task);
            tasksList.appendChild(taskElement);
        });
    }

    updateClearButton();
}

function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-item ${task.completed ? 'completed' : ''}`;
    taskDiv.setAttribute('data-task-id', task.id);
    
    taskDiv.innerHTML = `
        <div class="task-content">
            <button class="task-checkbox ${task.completed ? 'checked' : ''}" 
                    onclick="toggleTaskComplete(${task.id})"
                    title="${task.completed ? 'Marquer comme non terminée' : 'Marquer comme terminée'}">
                <i class="fas ${task.completed ? 'fa-check' : 'fa-circle'}"></i>
            </button>
            
            <span class="task-text ${task.completed ? 'completed-text' : ''}" 
                  ondblclick="startEditingTask(${task.id})">
                ${escapeHtml(task.text)}
            </span>
            
            <input type="text" class="task-edit-input" 
                   value="${escapeHtml(task.text)}" 
                   style="display: none;"
                   onblur="finishEditingTask(${task.id})"
                   onkeydown="handleTaskEditKeydown(event, ${task.id})">
        </div>
        
        <div class="task-actions">
            <button class="task-edit-btn" 
                    onclick="startEditingTask(${task.id})"
                    title="Modifier la tâche">
                <i class="fas fa-edit"></i>
            </button>
            
            <button class="task-delete-btn" 
                    onclick="deleteTask(${task.id})"
                    title="Supprimer la tâche">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        
        <div class="task-meta">
            <small class="task-date">
                ${task.completed ? '✅ Terminée' : '⏳ En cours'} • 
                ${formatTaskDate(task.createdAt)}
            </small>
        </div>
    `;
    
    return taskDiv;
}

function startEditingTask(taskId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!taskElement) return;

    const taskText = taskElement.querySelector('.task-text');
    const editInput = taskElement.querySelector('.task-edit-input');

    if (taskText && editInput) {
        taskText.style.display = 'none';
        editInput.style.display = 'block';
        editInput.focus();
        editInput.select();
    }
}

function finishEditingTask(taskId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!taskElement) return;

    const taskText = taskElement.querySelector('.task-text');
    const editInput = taskElement.querySelector('.task-edit-input');

    if (taskText && editInput) {
        const newText = editInput.value.trim();
        const originalText = taskText.textContent.trim();

        if (newText && newText !== originalText) {
            editTask(taskId, newText);
        } else {
            taskText.style.display = 'block';
            editInput.style.display = 'none';
            editInput.value = originalText;
        }
    }
}

function handleTaskEditKeydown(event, taskId) {
    if (event.key === 'Enter') {
        event.preventDefault();
        finishEditingTask(taskId);
    } else if (event.key === 'Escape') {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            const taskText = taskElement.querySelector('.task-text');
            const editInput = taskElement.querySelector('.task-edit-input');
            
            if (taskText && editInput) {
                editInput.value = taskText.textContent;
                taskText.style.display = 'block';
                editInput.style.display = 'none';
            }
        }
    }
}

function clearCompletedTasks() {
    const completedCount = tasks.filter(t => t.completed).length;
    
    if (completedCount === 0) {
        showTaskError('Aucune tâche terminée à effacer');
        return;
    }
    
    if (confirm(`Voulez-vous vraiment effacer ${completedCount} tâche(s) terminée(s) ?`)) {
        tasks = tasks.filter(t => !t.completed);
        renderTasks();
        console.log(`🧹 ${completedCount} tâche(s) effacée(s)`);
        saveTasks();
    }
}

function updateClearButton() {
    if (!clearCompletedBtn) return;

    const completedCount = tasks.filter(t => t.completed).length;
    
    if (completedCount > 0) {
        clearCompletedBtn.style.display = 'block';
        clearCompletedBtn.title = `Effacer ${completedCount} tâche(s) terminée(s)`;
        clearCompletedBtn.classList.add('has-completed');
    } else {
        clearCompletedBtn.style.display = 'none';
        clearCompletedBtn.classList.remove('has-completed');
    }
}

function showTaskError(message) {
    if (!tasksList) return;

    const existingError = tasksList.querySelector('.task-error');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'task-error';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    tasksList.insertBefore(errorDiv, tasksList.firstChild);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 3000);
    
    if (taskInput) {
        taskInput.classList.add('error');
        setTimeout(() => taskInput.classList.remove('error'), 2000);
    }
}

// ================================================================
// 🔗 INTÉGRATION TÂCHES & POMODORO
// ================================================================

function getCurrentTask() {
    return tasks.find(t => !t.completed) || null;
}

function updateTimerWithCurrentTask() {
    const currentTask = getCurrentTask();
    let taskDisplay = document.getElementById('current-task-display');
    
    if (currentTask && isWorkSession) {
        if (!taskDisplay) {
            taskDisplay = document.createElement('div');
            taskDisplay.id = 'current-task-display';
            taskDisplay.className = 'current-task';
            timer.parentNode.insertBefore(taskDisplay, timer.nextSibling);
        }
        taskDisplay.innerHTML = `<i class="fas fa-tasks"></i> ${escapeHtml(currentTask.text)}`;
        taskDisplay.style.display = 'block';
    } else if (taskDisplay) {
        taskDisplay.style.display = 'none';
    }
}

function completeTaskAfterPomodoro() {
    const currentTask = getCurrentTask();
    if (currentTask) {
        if (confirm(`Marquer la tâche "${currentTask.text}" comme terminée ?`)) {
            toggleTaskComplete(currentTask.id);
            return true;
        }
    }
    return false;
}

function getTaskStats() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return { total: totalTasks, completed: completedTasks, pending: pendingTasks, completionRate };
}

// ================================================================
// ⚙️ GESTION DES PARAMÈTRES
// ================================================================

function updateSettings() {
    const workDurationMinutes = parseInt(workDuration.value, 10);
    const breakDurationMinutes = parseInt(breakDuration.value, 10);
    const longBreakDurationMinutes = parseInt(longBreakDurationInput.value, 10);
    const pomodorosUtilLongBreakValue = parseInt(pomodorosUtilLongBreakInput.value, 10);

    if (isNaN(workDurationMinutes) || workDurationMinutes <= 0 || workDurationMinutes > 120) {
        alert("La durée de travail doit être entre 1 et 120 minutes");
        return false;
    }
    
    if (isNaN(breakDurationMinutes) || breakDurationMinutes <= 0 || breakDurationMinutes > 60) {
        alert("La durée de pause doit être entre 1 et 60 minutes");
        return false;
    }

    if (isNaN(longBreakDurationMinutes) || longBreakDurationMinutes <= 0 || longBreakDurationMinutes > 60) {
        alert("La durée de pause longue doit être entre 1 et 60 minutes");
        return false;
    }
    
    if (isNaN(pomodorosUtilLongBreakValue) || pomodorosUtilLongBreakValue <= 0 || pomodorosUtilLongBreakValue > 10) {
        alert("Le nombre de pomodoros avant pause longue doit être entre 1 et 10");
        return false;
    }
    
    workSessionDuration = workDurationMinutes * 60;
    breakSessionDuration = breakDurationMinutes * 60;
    longBreakDuration = longBreakDurationMinutes * 60;
    pomodorosUtilLongBreak = pomodorosUtilLongBreakValue;
    
    remainingTime = isWorkSession ? workSessionDuration : breakSessionDuration;
    initialTime = remainingTime;
    
    if (isRunning) {
        stopTimer();
        alert("Timer arrêté pour appliquer les nouveaux paramètres");
    }
    
    updateUI();
    saveSettings();
    settingsDialog.close();
    
    console.log(`⚙️ Paramètres mis à jour: ${workDurationMinutes}/${breakDurationMinutes}/${longBreakDurationMinutes} min`);
    return true;
}

function updateSettingsInputs() {
    if (workDuration) workDuration.value = Math.floor(workSessionDuration / 60);
    if (breakDuration) breakDuration.value = Math.floor(breakSessionDuration / 60);
    if (longBreakDurationInput) longBreakDurationInput.value = Math.floor(longBreakDuration / 60);
    if (pomodorosUtilLongBreakInput) pomodorosUtilLongBreakInput.value = pomodorosUtilLongBreak;
}

// ================================================================
// 💾 FONCTIONS DE PERSISTANCE
// ================================================================

function saveStatistics() {
    try {
        const stats = {
            completedPomodoros,
            totalFocusTime,
            currentStreak,
            currentPomodoroInCycle,
            lastSaveDate: new Date().toISOString(),
            version: APP_VERSION
        };
        
        localStorage.setItem(STORAGE_KEYS.STATISTICS, JSON.stringify(stats));
        console.log('📊 Statistiques sauvegardées');
        return true;
    } catch (error) {
        console.error('❌ Erreur de sauvegarde des statistiques:', error);
        return false;
    }
}

function saveTasks() {
    try {
        const tasksData = {
            tasks,
            taskId,
            lastSaveDate: new Date().toISOString(),
            version: APP_VERSION
        };
        
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasksData));
        console.log(`📝 ${tasks.length} tâches sauvegardées`);
        return true;
    } catch (error) {
        console.error('❌ Erreur de sauvegarde des tâches:', error);
        return false;
    }
}

function saveSettings() {
    try {
        const settings = {
            workSessionDuration,
            breakSessionDuration,
            longBreakDuration,
            pomodorosUtilLongBreak,
            lastSaveDate: new Date().toISOString(),
            version: APP_VERSION
        };
        
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        console.log('⚙️ Paramètres sauvegardés');
        return true;
    } catch (error) {
        console.error('❌ Erreur de sauvegarde des paramètres:', error);
        return false;
    }
}

function saveAllData() {
    updateSaveIndicator('saving');
    updateStatusIndicator('syncing');
    
    const results = {
        statistics: saveStatistics(),
        tasks: saveTasks(),
        settings: saveSettings()
    };
    
    const success = Object.values(results).every(r => r);
    
    setTimeout(() => {
        updateSaveIndicator(success ? 'saved' : 'error');
        updateStatusIndicator(success ? 'online' : 'offline');
    }, 500);
    
    if (success) {
        console.log('✅ Toutes les données sauvegardées avec succès');
        showDataMessage('💾 Données sauvegardées', 'success');
    } else {
        console.warn('⚠️ Certaines données n\'ont pas pu être sauvegardées');
        showDataMessage('⚠️ Erreur de sauvegarde partielle', 'warning');
    }
    
    return success;
}

function loadStatistics() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.STATISTICS);
        if (!saved) {
            console.log('📊 Aucune statistique sauvegardée trouvée');
            return false;
        }

        const stats = JSON.parse(saved);
        
        completedPomodoros = stats.completedPomodoros || 0;
        totalFocusTime = stats.totalFocusTime || 0;
        currentStreak = stats.currentStreak || 0;
        currentPomodoroInCycle = stats.currentPomodoroInCycle || 0;
        
        console.log(`📊 Statistiques chargées: ${completedPomodoros} pomodoros, ${Math.floor(totalFocusTime/3600)}h de focus`);
        return true;
    } catch (error) {
        console.error('❌ Erreur de chargement des statistiques:', error);
        return false;
    }
}

function loadTasks() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
        if (!saved) {
            console.log('📝 Aucune tâche sauvegardée trouvée');
            return false;
        }

        const tasksData = JSON.parse(saved);
        
        tasks = tasksData.tasks || [];
        taskId = tasksData.taskId || 1;
        
        tasks = tasks.filter(task => {
            return task && 
                   typeof task.id === 'number' && 
                   typeof task.text === 'string' && 
                   task.text.trim().length > 0;
        });
        
        console.log(`📝 ${tasks.length} tâches chargées`);
        return true;
    } catch (error) {
        console.error('❌ Erreur de chargement des tâches:', error);
        return false;
    }
}

function loadSettings() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (!saved) {
            console.log('⚙️ Aucun paramètre sauvegardé trouvé');
            return false;
        }

        const settings = JSON.parse(saved);
        
        if (settings.workSessionDuration && settings.workSessionDuration > 0 && settings.workSessionDuration <= 7200) {
            workSessionDuration = settings.workSessionDuration;
        }
        
        if (settings.breakSessionDuration && settings.breakSessionDuration > 0 && settings.breakSessionDuration <= 3600) {
            breakSessionDuration = settings.breakSessionDuration;
        }
        
        if (settings.longBreakDuration && settings.longBreakDuration > 0 && settings.longBreakDuration <= 3600) {
            longBreakDuration = settings.longBreakDuration;
        }
        
        if (settings.pomodorosUtilLongBreak && settings.pomodorosUtilLongBreak > 0 && settings.pomodorosUtilLongBreak <= 20) {
            pomodorosUtilLongBreak = settings.pomodorosUtilLongBreak;
        }
        
        updateSettingsInputs();
        
        console.log(`⚙️ Paramètres chargés: ${workSessionDuration/60}/${breakSessionDuration/60}/${longBreakDuration/60} min`);
        return true;
    } catch (error) {
        console.error('❌ Erreur de chargement des paramètres:', error);
        return false;
    }
}

function loadAllData() {
    console.log('📂 Chargement des données sauvegardées...');
    
    const results = {
        statistics: loadStatistics(),
        tasks: loadTasks(),
        settings: loadSettings()
    };
    
    const loadedCount = Object.values(results).filter(r => r).length;
    
    if (loadedCount > 0) {
        console.log(`✅ ${loadedCount}/3 types de données chargées avec succès`);
        showDataMessage(`📂 ${loadedCount}/3 sections restaurées`, 'success');
    } else {
        console.log('📝 Nouvelle session - aucune donnée à charger');
    }
    
    return results;
}

// ================================================================
// 🎨 FONCTIONS D'INTERFACE POUR LA PERSISTANCE
// ================================================================

function updateSaveIndicator(status = 'saved') {
    if (!saveIndicator || !saveIcon || !saveLabel) return;
    
    saveIndicator.classList.remove('saving', 'saved', 'error');
    
    switch(status) {
        case 'saving':
            saveIndicator.classList.add('saving');
            saveIcon.className = 'fas fa-sync-alt';
            saveLabel.textContent = 'Sauvegarde...';
            break;
        case 'saved':
            saveIndicator.classList.add('saved');
            saveIcon.className = 'fas fa-cloud-upload-alt';
            saveLabel.textContent = 'Sauvegardé';
            break;
        case 'error':
            saveIndicator.classList.add('error');
            saveIcon.className = 'fas fa-exclamation-triangle';
            saveLabel.textContent = 'Erreur';
            break;
        case 'offline':
            saveIndicator.classList.remove('saving', 'saved', 'error');
            saveIcon.className = 'fas fa-cloud-download-alt';
            saveLabel.textContent = 'Hors ligne';
            break;
    }
}

function updateStatusIndicator(status = 'online') {
    if (!statusIndicator) return;
    
    statusIndicator.classList.remove('offline', 'syncing');
    
    switch(status) {
        case 'online':
            statusIndicator.className = 'status-indicator';
            statusIndicator.style.color = '#27ae60';
            statusIndicator.title = 'Application en ligne - données sauvegardées';
            break;
        case 'offline':
            statusIndicator.classList.add('offline');
            statusIndicator.style.color = '#e74c3c';
            statusIndicator.title = 'Application hors ligne';
            break;
        case 'syncing':
            statusIndicator.classList.add('syncing');
            statusIndicator.style.color = '#f39c12';
            statusIndicator.title = 'Synchronisation en cours...';
            break;
    }
}

function showDataMessage(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `data-notification ${type}`;
    notification.innerHTML = `
        <div class="data-notification-content">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getStorageInfo() {
    try {
        const info = {
            used: 0,
            keys: Object.keys(localStorage).filter(key => key.startsWith('pomodoro_')),
            details: {}
        };
        
        info.keys.forEach(key => {
            const value = localStorage.getItem(key);
            const size = new Blob([value]).size;
            info.used += size;
            info.details[key] = {
                size: size,
                lastModified: JSON.parse(value).lastSaveDate || 'Inconnu'
            };
        });
        
        info.usedKB = Math.round(info.used / 1024 * 100) / 100;
        info.quota = 5120;
        info.usagePercent = Math.round(info.used / (info.quota * 1024) * 10000) / 100;
        
        return info;
    } catch (error) {
        console.error('❌ Erreur d\'analyse du stockage:', error);
        return null;
    }
}

// ================================================================
// 🔄 SAUVEGARDE AUTOMATIQUE
// ================================================================

function startAutoSave(intervalMinutes = 2) {
    stopAutoSave();
    
    autoSaveInterval = setInterval(() => {
        saveAllData();
    }, intervalMinutes * 60 * 1000);
    
    const updateNextSaveTime = () => {
        nextAutoSaveTime = new Date(Date.now() + intervalMinutes * 60 * 1000);
    };
    
    updateNextSaveTime();
    
    const timeUpdateInterval = setInterval(() => {
        if (!autoSaveEnabled || !autoSaveInterval) {
            clearInterval(timeUpdateInterval);
            return;
        }
        updateNextSaveTime();
    }, 60000);
    
    console.log(`⏰ Sauvegarde automatique activée (${intervalMinutes} min)`);
}

function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
        console.log('⏹️ Sauvegarde automatique désactivée');
    }
}

// ================================================================
// 🗂️ FONCTIONS DE GESTION DES DONNÉES AVANCÉES
// ================================================================

function clearAllData() {
    const confirmation = confirm(
        '⚠️ ATTENTION ⚠️\n\n' +
        'Voulez-vous vraiment effacer TOUTES les données ?\n\n' +
        '• Statistiques (pomodoros, temps de focus, séries)\n' +
        '• Tâches\n' +
        '• Paramètres personnalisés\n\n' +
        'Cette action est IRRÉVERSIBLE !'
    );
    
    if (!confirmation) return false;
    
    try {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        
        completedPomodoros = 0;
        totalFocusTime = 0;
        currentStreak = 0;
        currentPomodoroInCycle = 0;
        tasks = [];
        taskId = 1;
        
        workSessionDuration = 1500;
        breakSessionDuration = 300;
        longBreakDuration = 900;
        pomodorosUtilLongBreak = 4;
        
        updateUI();
        updateStats();
        renderTasks();
        updateSettingsInputs();
        
        console.log('🗑️ Toutes les données effacées');
        showDataMessage('🗑️ Toutes les données ont été effacées', 'warning');
        return true;
    } catch (error) {
        console.error('❌ Erreur lors de l\'effacement des données:', error);
        showDataMessage('❌ Erreur lors de l\'effacement', 'error');
        return false;
    }
}

function exportData() {
    try {
        const exportData = {
            statistics: {
                completedPomodoros,
                totalFocusTime,
                currentStreak,
                currentPomodoroInCycle
            },
            tasks: tasks,
            settings: {
                workSessionDuration,
                breakSessionDuration,
                longBreakDuration,
                pomodorosUtilLongBreak
            },
            exportDate: new Date().toISOString(),
            appVersion: APP_VERSION
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(dataBlob);
        downloadLink.download = `pomodoro-backup-${new Date().toISOString().split('T')[0]}.json`;
        downloadLink.style.display = 'none';
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        console.log('📤 Données exportées avec succès');
        showDataMessage('📤 Sauvegarde exportée', 'success');
        return true;
    } catch (error) {
        console.error('❌ Erreur d\'exportation:', error);
        showDataMessage('❌ Erreur d\'exportation', 'error');
        return false;
    }
}

function importData() {
    if (importFileInput) {
        importFileInput.click();
    }
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
        showDataMessage('❌ Format de fichier invalide (JSON requis)', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!importedData.appVersion) {
                throw new Error('Fichier de sauvegarde invalide');
            }
            
            const confirmation = confirm(
                '📥 Importer les données ?\n\n' +
                'Cette action remplacera vos données actuelles par :\n' +
                `• ${importedData.statistics?.completedPomodoros || 0} pomodoros\n` +
                `• ${importedData.tasks?.length || 0} tâches\n` +
                `• Paramètres personnalisés\n\n` +
                '⚠️ Vos données actuelles seront perdues !\n' +
                'Voulez-vous continuer ?'
            );
            
            if (!confirmation) {
                event.target.value = '';
                return;
            }
            
            if (importedData.statistics) {
                completedPomodoros = importedData.statistics.completedPomodoros || 0;
                totalFocusTime = importedData.statistics.totalFocusTime || 0;
                currentStreak = importedData.statistics.currentStreak || 0;
                currentPomodoroInCycle = importedData.statistics.currentPomodoroInCycle || 0;
            }
            
            if (importedData.tasks && Array.isArray(importedData.tasks)) {
                tasks = importedData.tasks.filter(task => 
                    task && task.id && task.text && task.text.trim().length > 0
                );
                taskId = Math.max(...tasks.map(t => t.id), 0) + 1;
            }
            
            if (importedData.settings) {
                const settings = importedData.settings;
                if (settings.workSessionDuration > 0) workSessionDuration = settings.workSessionDuration;
                if (settings.breakSessionDuration > 0) breakSessionDuration = settings.breakSessionDuration;
                if (settings.longBreakDuration > 0) longBreakDuration = settings.longBreakDuration;
                if (settings.pomodorosUtilLongBreak > 0) pomodorosUtilLongBreak = settings.pomodorosUtilLongBreak;
            }
            
            saveAllData();
            
            updateUI();
            updateStats();
            renderTasks();
            updateSettingsInputs();
            
            showDataMessage('📥 Données importées avec succès', 'success');
            console.log('📥 Import réussi depuis:', file.name);
            
        } catch (error) {
            console.error('❌ Erreur d\'import:', error);
            showDataMessage('❌ Erreur lors de l\'import - fichier invalide', 'error');
        } finally {
            event.target.value = '';
        }
    };
    
    reader.readAsText(file);
}

// ================================================================
// 🎧 GESTIONNAIRES D'ÉVÉNEMENTS
// ================================================================

// Events du timer
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        if (!isRunning) {
            startTimer();
        } else {
            stopTimer();
        }
    });
}

if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        resetToCurrentSession();
    });
}

// Events des boutons de mode
if (breakBtn) {
    breakBtn.addEventListener('click', () => {
        if (!isRunning && isWorkSession) {
            switchSession();
        }
    });
}

if (workBtn) {
    workBtn.addEventListener('click', () => {
        if (!isRunning && !isWorkSession) {
            switchSession();
        }
    });
}

// Events des paramètres
if (settingsIcone) {
    settingsIcone.addEventListener('click', () => {
        settingsDialog.showModal();
    });
}

if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
        settingsDialog.close();
    });
}

if (changeTimeBtn) {
    changeTimeBtn.addEventListener('click', () => {
        updateSettings();
    });
}

// Events des tâches
if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
        addTask(taskInput.value);
    });
}

if (taskInput) {
    taskInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addTask(taskInput.value);
        }
    });
}

if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener('click', () => {
        clearCompletedTasks();
    });
}

// Events de persistance
if (dataManagementBtn) {
    dataManagementBtn.addEventListener('click', () => {
        updateDataManagementModal();
        dataManagementDialog.showModal();
    });
}

if (closeDataManagementBtn) {
    closeDataManagementBtn.addEventListener('click', () => {
        dataManagementDialog.close();
    });
}

if (importFileInput) {
    importFileInput.addEventListener('change', handleImportFile);
}

// Événements globaux
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (settingsDialog && settingsDialog.open) {
            settingsDialog.close();
        }
        if (dataManagementDialog && dataManagementDialog.open) {
            dataManagementDialog.close();
        }
    }
    
    // Raccourcis clavier (uniquement si pas dans un input et aucun modal ouvert)
    if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA' &&
        (!settingsDialog || !settingsDialog.open) && 
        (!dataManagementDialog || !dataManagementDialog.open)) {
        
        switch(event.key.toLowerCase()) {
            case ' ':
                event.preventDefault();
                if (toggleBtn) toggleBtn.click();
                break;
            case 'r':
                if (resetBtn) resetBtn.click();
                break;
            case 'w':
                if (!isRunning && workBtn) workBtn.click();
                break;
            case 'b':
                if (!isRunning && breakBtn) breakBtn.click();
                break;
            case 's':
                if (settingsIcone) settingsIcone.click();
                break;
            case 'd':
                if (dataManagementBtn) dataManagementBtn.click();
                break;
            case 't':
                if (taskInput) taskInput.focus();
                break;
        }
        
        // Ctrl+S pour sauvegarder
        if (event.ctrlKey && event.key.toLowerCase() === 's') {
            event.preventDefault();
            saveAllData();
            showDataMessage('💾 Sauvegarde manuelle effectuée', 'success');
        }
    }
});

// Sauvegarde avant de quitter
window.addEventListener('beforeunload', (event) => {
    saveAllData();
});

window.addEventListener('blur', () => {
    saveAllData();
});

// Détection en ligne/hors ligne
window.addEventListener('online', () => {
    console.log('🌐 Connexion rétablie');
    updateStatusIndicator('online');
    updateSaveIndicator('saved');
    saveAllData();
});

window.addEventListener('offline', () => {
    console.log('📶 Connexion perdue');
    updateStatusIndicator('offline');
    updateSaveIndicator('offline');
});

// Sauvegarde périodique basée sur l'activité
let lastActivity = Date.now();

function updateActivity() {
    lastActivity = Date.now();
}

['click', 'keydown', 'mousemove', 'scroll'].forEach(eventType => {
    document.addEventListener(eventType, updateActivity, { passive: true });
});

setInterval(() => {
    const timeSinceActivity = Date.now() - lastActivity;
    if (timeSinceActivity > 30000) {
        saveAllData();
    }
}, 60000);

// ================================================================
// 🎨 FONCTIONS D'INTERFACE SPÉCIALES
// ================================================================

function updateDataManagementModal() {
    if (!dataManagementDialog) return;
    
    // Créer le contenu du modal si il n'existe pas
    const content = dataManagementDialog.querySelector('.data-modal-content');
    if (!content) return;
    
    const taskStats = getTaskStats();
    const storageInfo = getStorageInfo();
    
    content.innerHTML = `
        <div class="data-section">
            <h4><i class="fas fa-chart-bar"></i> Statistiques générales</h4>
            <div class="data-stats">
                <div class="data-stat">
                    <span class="data-stat-value" id="modal-pomodoros">${completedPomodoros}</span>
                    <div class="data-stat-label">Pomodoros</div>
                </div>
                <div class="data-stat">
                    <span class="data-stat-value" id="modal-focus-time">${Math.floor(totalFocusTime/3600)}h ${Math.floor((totalFocusTime%3600)/60)}m</span>
                    <div class="data-stat-label">Focus</div>
                </div>
                <div class="data-stat">
                    <span class="data-stat-value" id="modal-streak">${currentStreak}</span>
                    <div class="data-stat-label">Série</div>
                </div>
                <div class="data-stat">
                    <span class="data-stat-value" id="modal-completion-rate">${taskStats.completionRate}%</span>
                    <div class="data-stat-label">Tâches</div>
                </div>
            </div>
            <div class="data-actions">
                <button class="data-btn danger" onclick="resetAllStats()">
                    <i class="fas fa-chart-line"></i> Réinitialiser stats
                </button>
            </div>
        </div>

        <div class="data-section">
            <h4><i class="fas fa-tasks"></i> Gestion des tâches</h4>
            <p>Total: <strong>${taskStats.total}</strong> | Terminées: <strong>${taskStats.completed}</strong> | En cours: <strong>${taskStats.pending}</strong></p>
            <div class="data-actions">
                <button class="data-btn warning" onclick="clearCompletedTasks()">
                    <i class="fas fa-check-circle"></i> Effacer terminées
                </button>
                <button class="data-btn danger" onclick="clearAllTasks()">
                    <i class="fas fa-trash"></i> Effacer toutes
                </button>
            </div>
        </div>

        <div class="data-section">
            <h4><i class="fas fa-download"></i> Sauvegarde & Import</h4>
            <p>Exportez vos données ou importez une sauvegarde précédente.</p>
            <div class="data-actions">
                <button class="data-btn success" onclick="exportData()">
                    <i class="fas fa-download"></i> Exporter
                </button>
                <button class="data-btn primary" onclick="importData()">
                    <i class="fas fa-upload"></i> Importer
                </button>
            </div>
        </div>

        <div class="data-section">
            <h4><i class="fas fa-hdd"></i> Stockage local</h4>
            <p>Utilisation: <strong>${storageInfo ? storageInfo.usedKB : '0'} KB</strong> sur ~5 MB disponibles</p>
            ${storageInfo ? `
            <div class="storage-bar">
                <div class="storage-bar-fill ${storageInfo.usagePercent > 80 ? 'danger' : storageInfo.usagePercent > 60 ? 'warning' : ''}" 
                     style="width: ${Math.min(storageInfo.usagePercent, 100)}%"></div>
            </div>
            ` : ''}
            <div class="data-actions">
                <button class="data-btn secondary" onclick="showStorageDetails()">
                    <i class="fas fa-info-circle"></i> Détails
                </button>
                <button class="data-btn danger" onclick="clearAllData()">
                    <i class="fas fa-trash-alt"></i> Tout effacer
                </button>
            </div>
        </div>

        <div class="data-section">
            <h4><i class="fas fa-sync"></i> Sauvegarde automatique</h4>
            <p>État: <strong>${autoSaveEnabled ? 'Activée' : 'Désactivée'}</strong></p>
            <div class="data-actions">
                <button class="data-btn ${autoSaveEnabled ? 'warning' : 'success'}" onclick="toggleAutoSave()">
                    <i class="fas fa-${autoSaveEnabled ? 'pause' : 'play'}"></i> 
                    ${autoSaveEnabled ? 'Désactiver' : 'Activer'} auto
                </button>
                <button class="data-btn primary" onclick="saveAllData()">
                    <i class="fas fa-save"></i> Sauvegarder maintenant
                </button>
            </div>
        </div>
    `;
}

function resetAllStats() {
    const confirmation = confirm(
        '⚠️ Réinitialiser toutes les statistiques ?\n\n' +
        'Cette action effacera :\n' +
        `• ${completedPomodoros} pomodoros terminés\n` +
        `• ${Math.floor(totalFocusTime/3600)}h de temps de focus\n` +
        `• Série actuelle de ${currentStreak}\n\n` +
        'Cette action est irréversible !'
    );
    
    if (!confirmation) return false;
    
    completedPomodoros = 0;
    totalFocusTime = 0;
    currentStreak = 0;
    currentPomodoroInCycle = 0;
    
    saveStatistics();
    updateStats();
    updateDataManagementModal();
    
    showDataMessage('📊 Statistiques réinitialisées', 'warning');
    console.log('📊 Toutes les statistiques ont été réinitialisées');
    return true;
}

function clearAllTasks() {
    const confirmation = confirm(
        `⚠️ Effacer toutes les ${tasks.length} tâches ?\n\n` +
        'Cette action effacera TOUTES vos tâches :\n' +
        `• ${tasks.filter(t => t.completed).length} tâches terminées\n` +
        `• ${tasks.filter(t => !t.completed).length} tâches en cours\n\n` +
        'Cette action est irréversible !'
    );
    
    if (!confirmation) return false;
    
    tasks = [];
    taskId = 1;
    
    saveTasks();
    renderTasks();
    updateDataManagementModal();
    
    showDataMessage('📝 Toutes les tâches ont été effacées', 'warning');
    console.log('📝 Toutes les tâches ont été effacées');
    return true;
}

function showStorageDetails() {
    const storageInfo = getStorageInfo();
    if (!storageInfo) return;
    
    let details = '💾 Détails du stockage :\n\n';
    details += `📊 Utilisation : ${storageInfo.usedKB} KB / ~5 MB (${storageInfo.usagePercent}%)\n\n`;
    
    details += '📂 Fichiers sauvegardés :\n';
    Object.entries(storageInfo.details).forEach(([key, info]) => {
        const name = key.replace('pomodoro_', '').toUpperCase();
        const sizeKB = Math.round(info.size / 1024 * 100) / 100;
        details += `• ${name} : ${sizeKB} KB\n`;
    });
    
    alert(details);
}

function toggleAutoSave() {
    if (autoSaveEnabled) {
        stopAutoSave();
        autoSaveEnabled = false;
        showDataMessage('⏹️ Sauvegarde automatique désactivée', 'warning');
    } else {
        startAutoSave(2);
        autoSaveEnabled = true;
        showDataMessage('▶️ Sauvegarde automatique activée', 'success');
    }
    updateDataManagementModal();
}

// ================================================================
// 🚀 INITIALISATION DE L'APPLICATION
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🍅 Application Pomodoro démarrée');

    // Charger les données sauvegardées AVANT d'initialiser l'interface
    loadAllData();
    
    // Initialiser l'état des indicateurs
    updateSaveIndicator('saved');
    updateStatusIndicator(navigator.onLine ? 'online' : 'offline');
    
    // Démarrer la sauvegarde automatique
    startAutoSave(2);
    
    // Initialiser l'état du timer
    initialTime = remainingTime;
    remainingTime = isWorkSession ? workSessionDuration : breakSessionDuration;
    initialTime = remainingTime;
    
    // Initialiser l'interface (ordre important!)
    updateUI();
    updateStats();
    renderTasks();
    
    // Demander la permission pour les notifications
    setupNotifications().then(canNotify => {
        if (canNotify) {
            console.log('🔔 Notifications prêtes');
        }
    });
    
    console.log('✅ Initialisation terminée avec persistance');
});

console.log('💾 Module de persistance des données chargé');