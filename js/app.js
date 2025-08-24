// ================================================================
// 🍅 APPLICATION POMODORO COMPLÈTE - VERSION RÉVISÉE
// Phases 1, 2, 3 + Corrections et optimisations
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

// Sélection des éléments du DOM - Paramètres
const settingsIcone = document.getElementById('settingsIcone');
const settingsDialog = document.getElementById('settingsDialog');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const changeTimeBtn = document.getElementById('changeTimeBtn');
const workDuration = document.getElementById('workDuration');
const breakDuration = document.getElementById('breakDuration');
const longBreakDurationInput = document.getElementById('longBreakDuration');
const pomodorosUtilLongBreakInput = document.getElementById('pomodorosUtilLongBreak');

// Sélection des éléments du DOM - Tâches
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const tasksList = document.getElementById('tasksList');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

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
let taskId = 1; // Commencer à 1 au lieu de 0

// ================================================================
// 🔧 FONCTIONS UTILITAIRES
// ================================================================

// Fonction pour formater le temps en MM:SS
function formatTemps(seconde) {
    const minutes = Math.floor(seconde / 60);
    const secondes = seconde % 60;
    return String(minutes).padStart(2, '0') + ':' + String(secondes).padStart(2, '0');
}

// Fonction pour échapper le HTML (sécurité XSS)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// Fonction pour formater la date relative d'une tâche
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

    if (Notification.permission === "granted") {
        console.log("Notifications autorisées");
        return true;
    } else {
        console.log("Notifications refusées");
        return false;
    }
}

function sendNotification() {
    if (Notification.permission === "granted") {
        let title, body, icon = "🍅";
        
        if (!isWorkSession) {
            // Session de travail terminée
            title = "🎉 Session de travail terminée !";
            body = `Temps de prendre une pause de ${breakSessionDuration / 60} minutes.`;
        } else {
            // Pause terminée
            title = "⏰ Pause terminée !";
            body = `Temps de reprendre le travail pendant ${workSessionDuration / 60} minutes.`;
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
    // Récupérer les éléments DOM
    const completedPomodorosElement = document.getElementById('completedPomodoros');
    const totalFocusTimeElement = document.getElementById('totalFocusTime');
    const currentStreakElement = document.getElementById('currentStreak');

    // Vérifier que les éléments existent
    if (!completedPomodorosElement || !totalFocusTimeElement || !currentStreakElement) {
        console.error("Éléments de statistiques non trouvés dans le DOM");
        return;
    }

    // Mettre à jour les compteurs
    completedPomodorosElement.textContent = completedPomodoros;
    
    // Convertir le temps total en heures et minutes
    const totalHours = Math.floor(totalFocusTime / 3600);
    const totalMinutes = Math.floor((totalFocusTime % 3600) / 60);
    totalFocusTimeElement.textContent = `${totalHours}h ${totalMinutes}m`;
    
    // Mettre à jour la série actuelle
    currentStreakElement.textContent = currentStreak;
    
    console.log(`📊 Stats mises à jour: ${completedPomodoros} pomodoros, ${totalHours}h${totalMinutes}m, série: ${currentStreak}`);
}

function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    
    if (!progressBar) {
        console.error("Barre de progression non trouvée");
        return;
    }
    
    // Calculer le pourcentage de progression
    const timeElapsed = initialTime - remainingTime;
    const progressPercentage = Math.max(0, Math.min(100, (timeElapsed / initialTime) * 100));
    
    // Appliquer la progression
    progressBar.style.width = progressPercentage + '%';
    
    // Changer la couleur selon le type de session
    if (isWorkSession) {
        progressBar.classList.remove('break');
    } else {
        progressBar.classList.add('break');
    }
    
    console.log(`📊 Progression: ${Math.round(progressPercentage)}%`);
}

function recordCompletedSession() {
    if (isWorkSession) {
        // Session de travail terminée
        completedPomodoros++;
        currentStreak++;
        currentPomodoroInCycle++;
        totalFocusTime += initialTime;
        
        console.log(`✅ Pomodoro #${completedPomodoros} terminé! Série: ${currentStreak}`);
        
        // Proposer de marquer une tâche comme terminée
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
    saveData();
}

// ================================================================
// ⏰ GESTION DU TIMER
// ================================================================

function updateUI() {
    // Mettre à jour l'affichage du timer
    timer.textContent = formatTemps(remainingTime);
    
    // Mettre à jour les boutons actifs
    workBtn.classList.toggle('active', isWorkSession);
    breakBtn.classList.toggle('active', !isWorkSession);
    
    // Mettre à jour le texte du bouton principal
    toggleBtn.innerHTML = isRunning ? 
        '<i class="fas fa-pause"></i> Pause' : 
        '<i class="fas fa-play"></i> Démarrer';

    // Mettre à jour la barre de progression
    updateProgressBar();
    
    // Mettre à jour l'affichage de la tâche en cours
    updateTimerWithCurrentTask();
    
    // Changer la classe du timer selon la session
    timer.className = isWorkSession ? 'work-session' : 'break-session';
    
    // Ajouter l'effet pulse quand il reste moins de 10 secondes
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
        updateUI(); // Mettre à jour toute l'interface à chaque seconde
        
        if (remainingTime <= 0) {
            stopTimer();
            handleSessionComplete();
        }
    }, 1000);
}

function handleSessionComplete() {
    // Enregistrer la session terminée
    recordCompletedSession();

    // Envoyer une notification
    setupNotifications().then(canNotify => {
        if (canNotify) {
            sendNotification();
        }
    });

    // Déterminer et démarrer la session suivante
    const nextSession = determineNextSessionType();
    
    if (nextSession === "pause courte") {
        switchSession();
    } else if (nextSession === "pause longue") {
        startLongBreak();
    } else {
        switchSession(); // Reprendre le travail
    }
}

function switchSession() {
    isWorkSession = !isWorkSession;
    remainingTime = isWorkSession ? workSessionDuration : breakSessionDuration;
    initialTime = remainingTime;
    updateUI();
}

function resetToCurrentSession() {
    // Si on reset pendant une session de travail, casser la série
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
    currentPomodoroInCycle = 0; // Réinitialiser le cycle
    updateUI();
    console.log(`🛌 Pause longue démarrée (${longBreakDuration / 60} min)`);
}

// ================================================================
// 📝 GESTION DES TÂCHES
// ================================================================

function addTask(taskText) {
    // Validation
    const trimmedText = taskText?.trim();
    if (!trimmedText) {
        showTaskError("Veuillez saisir une tâche");
        return false;
    }
    
    if (trimmedText.length > 100) {
        showTaskError("La tâche ne peut pas dépasser 100 caractères");
        return false;
    }

    // Créer la tâche
    const newTask = {
        id: taskId++,
        text: trimmedText,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null
    };

    // Ajouter au début du tableau
    tasks.unshift(newTask);
    renderTasks();
    
    // Vider l'input
    taskInput.value = '';
    
    console.log(`✅ Tâche ajoutée: "${newTask.text}"`);
    saveData();
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
        return true;
    }
    saveData();
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
    taskDiv.setAttribute('data-task-id', task.id); // ✅ CORRECTION: utiliser l'attribut correct
    
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
            // Annuler l'édition
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
    }
    saveData();
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

    // Supprimer les erreurs existantes
    const existingError = tasksList.querySelector('.task-error');
    if (existingError) {
        existingError.remove();
    }

    // Créer la nouvelle erreur
    const errorDiv = document.createElement('div');
    errorDiv.className = 'task-error';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    tasksList.insertBefore(errorDiv, tasksList.firstChild);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 3000);
    
    // Effet sur l'input
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
// 🎯 ÉVÉNEMENTS ET PARAMÈTRES
// ================================================================

function updateSettings() {
    const workDurationMinutes = parseInt(workDuration.value, 10);
    const breakDurationMinutes = parseInt(breakDuration.value, 10);
    const longBreakDurationMinutes = parseInt(longBreakDurationInput.value, 10);
    const pomodorosUtilLongBreakValue = parseInt(pomodorosUtilLongBreakInput.value, 10);

    // Validation
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
    
    // Appliquer les nouveaux paramètres
    workSessionDuration = workDurationMinutes * 60;
    breakSessionDuration = breakDurationMinutes * 60;
    longBreakDuration = longBreakDurationMinutes * 60;
    pomodorosUtilLongBreak = pomodorosUtilLongBreakValue;
    
    // Mettre à jour le timer si nécessaire
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

// ================================================================
// 🎧 GESTIONNAIRES D'ÉVÉNEMENTS
// ================================================================

// Events du timer
toggleBtn.addEventListener('click', () => {
    if (!isRunning) {
        startTimer();
    } else {
        stopTimer();
    }
});

resetBtn.addEventListener('click', () => {
    resetToCurrentSession();
});

// Events des boutons de mode
breakBtn.addEventListener('click', () => {
    if (!isRunning && isWorkSession) {
        switchSession();
    }
});

workBtn.addEventListener('click', () => {
    if (!isRunning && !isWorkSession) {
        switchSession();
    }
});

// Events des paramètres
settingsIcone.addEventListener('click', () => {
    settingsDialog.showModal();
});

closeSettingsBtn.addEventListener('click', () => {
    settingsDialog.close();
});

changeTimeBtn.addEventListener('click', () => {
    updateSettings();
});

// Events des tâches
addTaskBtn.addEventListener('click', () => {
    addTask(taskInput.value);
});

taskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        addTask(taskInput.value);
    }
});

clearCompletedBtn.addEventListener('click', () => {
    clearCompletedTasks();
});

// Fermer le modal avec Escape
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && settingsDialog.open) {
        settingsDialog.close();
    }
});

// ================================================================
// 💾 PERSISTANCE DES DONNÉES
// ================================================================

// ================================================================
// 🗄️ CONSTANTES POUR LE STOCKAGE
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
// 💾 FONCTIONS DE SAUVEGARDE
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

// Fonction principale de sauvegarde
function saveAllData() {
    const results = {
        statistics: saveStatistics(),
        tasks: saveTasks(),
        settings: saveSettings()
    };
    
    const success = Object.values(results).every(r => r);
    
    if (success) {
        console.log('✅ Toutes les données sauvegardées avec succès');
        showDataMessage('💾 Données sauvegardées', 'success');
    } else {
        console.warn('⚠️ Certaines données n\'ont pas pu être sauvegardées');
        showDataMessage('⚠️ Erreur de sauvegarde partielle', 'warning');
    }
    
    return success;
}

// ================================================================
// 📂 FONCTIONS DE CHARGEMENT
// ================================================================

function loadStatistics() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.STATISTICS);
        if (!saved) {
            console.log('📊 Aucune statistique sauvegardée trouvée');
            return false;
        }

        const stats = JSON.parse(saved);
        
        // Vérification de la version et migration si nécessaire
        if (stats.version !== APP_VERSION) {
            console.log('🔄 Migration des statistiques nécessaire');
            return migrateStatistics(stats);
        }
        
        // Restaurer les statistiques
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
        
        // Vérification de la version
        if (tasksData.version !== APP_VERSION) {
            console.log('🔄 Migration des tâches nécessaire');
            return migrateTasks(tasksData);
        }
        
        // Restaurer les tâches
        tasks = tasksData.tasks || [];
        taskId = tasksData.taskId || 1;
        
        // Validation des tâches
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
        
        // Validation et application des paramètres
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
        
        // Mettre à jour les inputs dans le modal
        updateSettingsInputs();
        
        console.log(`⚙️ Paramètres chargés: ${workSessionDuration/60}/${breakSessionDuration/60}/${longBreakDuration/60} min`);
        return true;
    } catch (error) {
        console.error('❌ Erreur de chargement des paramètres:', error);
        return false;
    }
}

// Fonction principale de chargement
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
// 🔄 FONCTIONS DE MIGRATION (pour compatibilité futures versions)
// ================================================================

function migrateStatistics(oldStats) {
    try {
        // Migration v1.0.0 - structure de base
        completedPomodoros = oldStats.completedPomodoros || 0;
        totalFocusTime = oldStats.totalFocusTime || 0;
        currentStreak = oldStats.currentStreak || 0;
        currentPomodoroInCycle = oldStats.currentPomodoroInCycle || 0;
        
        // Sauvegarder avec la nouvelle version
        saveStatistics();
        console.log('✅ Migration des statistiques réussie');
        return true;
    } catch (error) {
        console.error('❌ Erreur de migration des statistiques:', error);
        return false;
    }
}

function migrateTasks(oldTasksData) {
    try {
        // Migration v1.0.0
        tasks = oldTasksData.tasks || [];
        taskId = oldTasksData.taskId || Math.max(...tasks.map(t => t.id), 0) + 1;
        
        // Nettoyer les tâches invalides
        tasks = tasks.filter(task => task && task.id && task.text);
        
        // Sauvegarder avec la nouvelle version
        saveTasks();
        console.log('✅ Migration des tâches réussie');
        return true;
    } catch (error) {
        console.error('❌ Erreur de migration des tâches:', error);
        return false;
    }
}

// ================================================================
// 🎨 FONCTIONS D'INTERFACE POUR LA PERSISTANCE
// ================================================================

function updateSettingsInputs() {
    if (workDuration) workDuration.value = Math.floor(workSessionDuration / 60);
    if (breakDuration) breakDuration.value = Math.floor(breakSessionDuration / 60);
    if (longBreakDurationInput) longBreakDurationInput.value = Math.floor(longBreakDuration / 60);
    if (pomodorosUtilLongBreakInput) pomodorosUtilLongBreakInput.value = pomodorosUtilLongBreak;
}

function showDataMessage(message, type = 'info') {
    // Créer une notification temporaire
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
    
    // Ajouter au body
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Suppression automatique après 3 secondes
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// ================================================================
// 🗑️ FONCTIONS DE NETTOYAGE ET MAINTENANCE
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
        // Effacer le localStorage
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Réinitialiser les variables
        completedPomodoros = 0;
        totalFocusTime = 0;
        currentStreak = 0;
        currentPomodoroInCycle = 0;
        tasks = [];
        taskId = 1;
        
        // Réinitialiser les paramètres par défaut
        workSessionDuration = 1500;
        breakSessionDuration = 300;
        longBreakDuration = 900;
        pomodorosUtilLongBreak = 4;
        
        // Mettre à jour l'interface
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
        info.quota = 5120; // 5MB estimation pour localStorage
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

let autoSaveInterval = null;

function startAutoSave(intervalMinutes = 5) {
    stopAutoSave(); // Arrêter l'ancien interval s'il existe
    
    autoSaveInterval = setInterval(() => {
        saveAllData();
    }, intervalMinutes * 60 * 1000);
    
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
// 🎧 ÉVÉNEMENTS DE SAUVEGARDE
// ================================================================

// Sauvegarder avant de quitter la page
window.addEventListener('beforeunload', (event) => {
    saveAllData();
});

// Sauvegarder quand la page perd le focus
window.addEventListener('blur', () => {
    saveAllData();
});

// Sauvegarder périodiquement quand l'utilisateur est actif
let lastActivity = Date.now();

function updateActivity() {
    lastActivity = Date.now();
}

['click', 'keydown', 'mousemove', 'scroll'].forEach(eventType => {
    document.addEventListener(eventType, updateActivity, { passive: true });
});

// Vérifier l'activité et sauvegarder si nécessaire
setInterval(() => {
    const timeSinceActivity = Date.now() - lastActivity;
    if (timeSinceActivity > 30000) { // 30 secondes d'inactivité
        saveAllData();
    }
}, 60000); // Vérifier chaque minute

console.log('💾 Module de persistance des données chargé');

// ================================================================
// 🔗 PHASE 4 : INTÉGRATION UI - FONCTIONS COMPLÉMENTAIRES
// Ajoutez ce code après le code de persistance dans app.js
// ================================================================

// ================================================================
// 🎨 GESTION DE L'INTERFACE DE PERSISTANCE
// ================================================================

// Sélecteurs pour les nouveaux éléments UI
const dataManagementBtn = document.getElementById('dataManagementBtn');
const dataManagementDialog = document.getElementById('dataManagementDialog');
const closeDataManagementBtn = document.getElementById('closeDataManagementBtn');
const importFileInput = document.getElementById('importFileInput');
const saveIndicator = document.getElementById('saveIndicator');
const saveIcon = document.getElementById('saveIcon');
const saveLabel = document.getElementById('saveLabel');
const statusIndicator = document.getElementById('statusIndicator');

// État de la sauvegarde automatique
let autoSaveEnabled = true;
let nextAutoSaveTime = null;

// ================================================================
// 🎯 FONCTIONS DE MISE À JOUR DE L'INTERFACE
// ================================================================

function updateSaveIndicator(status = 'saved') {
    if (!saveIndicator || !saveIcon || !saveLabel) return;
    
    // Nettoyer les classes précédentes
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

function updateDataManagementModal() {
    if (!dataManagementDialog) return;
    
    // Mettre à jour les statistiques dans le modal
    const modalPomodoros = document.getElementById('modal-pomodoros');
    const modalFocusTime = document.getElementById('modal-focus-time');
    const modalStreak = document.getElementById('modal-streak');
    const modalCompletionRate = document.getElementById('modal-completion-rate');
    
    if (modalPomodoros) modalPomodoros.textContent = completedPomodoros;
    if (modalFocusTime) {
        const hours = Math.floor(totalFocusTime / 3600);
        const minutes = Math.floor((totalFocusTime % 3600) / 60);
        modalFocusTime.textContent = `${hours}h ${minutes}m`;
    }
    if (modalStreak) modalStreak.textContent = currentStreak;
    
    // Mettre à jour les statistiques des tâches
    const taskStats = getTaskStats();
    const modalTotalTasks = document.getElementById('modal-total-tasks');
    const modalCompletedTasks = document.getElementById('modal-completed-tasks');
    const modalPendingTasks = document.getElementById('modal-pending-tasks');
    
    if (modalTotalTasks) modalTotalTasks.textContent = taskStats.total;
    if (modalCompletedTasks) modalCompletedTasks.textContent = taskStats.completed;
    if (modalPendingTasks) modalPendingTasks.textContent = taskStats.pending;
    if (modalCompletionRate) modalCompletionRate.textContent = taskStats.completionRate + '%';
    
    // Mettre à jour les informations de stockage
    updateStorageInfo();
    
    // Mettre à jour les dates de dernière sauvegarde
    updateLastSaveDates();
    
    // Mettre à jour le statut d'auto-sauvegarde
    updateAutoSaveStatus();
}

function updateStorageInfo() {
    const storageInfo = getStorageInfo();
    if (!storageInfo) return;
    
    const storageUsed = document.getElementById('storage-used');
    const storagePercentage = document.getElementById('storage-percentage');
    const storageBarFill = document.getElementById('storage-bar-fill');
    const storageDetails = document.getElementById('storage-details');
    
    if (storageUsed) storageUsed.textContent = `${storageInfo.usedKB} KB`;
    if (storagePercentage) storagePercentage.textContent = `${storageInfo.usagePercent}%`;
    
    if (storageBarFill) {
        storageBarFill.style.width = `${Math.min(storageInfo.usagePercent, 100)}%`;
        
        // Changer la couleur selon l'utilisation
        storageBarFill.classList.remove('warning', 'danger');
        if (storageInfo.usagePercent > 80) {
            storageBarFill.classList.add('danger');
        } else if (storageInfo.usagePercent > 60) {
            storageBarFill.classList.add('warning');
        }
    }
    
    if (storageDetails) {
        storageDetails.textContent = `${storageInfo.keys.length} clés de données sauvegardées`;
    }
}

function updateLastSaveDates() {
    try {
        const statsData = localStorage.getItem(STORAGE_KEYS.STATISTICS);
        const tasksData = localStorage.getItem(STORAGE_KEYS.TASKS);
        
        const statsLastSave = document.getElementById('stats-last-save');
        const tasksLastSave = document.getElementById('tasks-last-save');
        
        if (statsLastSave) {
            if (statsData) {
                const parsed = JSON.parse(statsData);
                const date = new Date(parsed.lastSaveDate);
                statsLastSave.textContent = date.toLocaleString('fr-FR');
            } else {
                statsLastSave.textContent = 'Jamais';
            }
        }
        
        if (tasksLastSave) {
            if (tasksData) {
                const parsed = JSON.parse(tasksData);
                const date = new Date(parsed.lastSaveDate);
                tasksLastSave.textContent = date.toLocaleString('fr-FR');
            } else {
                tasksLastSave.textContent = 'Jamais';
            }
        }
    } catch (error) {
        console.error('Erreur mise à jour dates:', error);
    }
}

function updateAutoSaveStatus() {
    const autosaveStatus = document.getElementById('autosave-status');
    const nextAutosave = document.getElementById('next-autosave');
    const toggleButton = document.getElementById('toggle-autosave');
    
    if (autosaveStatus) {
        autosaveStatus.textContent = autoSaveEnabled ? 
            'Activée (toutes les 2 min)' : 'Désactivée';
    }
    
    if (nextAutosave && nextAutoSaveTime) {
        nextAutosave.textContent = nextAutoSaveTime.toLocaleTimeString('fr-FR');
    } else if (nextAutosave) {
        nextAutosave.textContent = autoSaveEnabled ? 'Bientôt' : '--';
    }
    
    if (toggleButton) {
        toggleButton.innerHTML = autoSaveEnabled ? 
            '<i class="fas fa-pause"></i> Désactiver auto' :
            '<i class="fas fa-play"></i> Activer auto';
    }
}

// ================================================================
// 🗂️ FONCTIONS DE GESTION DES DONNÉES AVANCÉES
// ================================================================

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
    
    // Réinitialiser les statistiques
    completedPomodoros = 0;
    totalFocusTime = 0;
    currentStreak = 0;
    currentPomodoroInCycle = 0;
    
    // Sauvegarder et mettre à jour l'interface
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
    
    // Effacer toutes les tâches
    tasks = [];
    taskId = 1;
    
    // Sauvegarder et mettre à jour l'interface
    saveTasks();
    renderTasks();
    updateDataManagementModal();
    
    showDataMessage('📝 Toutes les tâches ont été effacées', 'warning');
    console.log('📝 Toutes les tâches ont été effacées');
    return true;
}

function importData() {
    importFileInput.click();
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
            
            // Validation basique
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
                event.target.value = ''; // Reset l'input
                return;
            }
            
            // Importer les statistiques
            if (importedData.statistics) {
                completedPomodoros = importedData.statistics.completedPomodoros || 0;
                totalFocusTime = importedData.statistics.totalFocusTime || 0;
                currentStreak = importedData.statistics.currentStreak || 0;
                currentPomodoroInCycle = importedData.statistics.currentPomodoroInCycle || 0;
            }
            
            // Importer les tâches
            if (importedData.tasks && Array.isArray(importedData.tasks)) {
                tasks = importedData.tasks.filter(task => 
                    task && task.id && task.text && task.text.trim().length > 0
                );
                taskId = Math.max(...tasks.map(t => t.id), 0) + 1;
            }
            
            // Importer les paramètres
            if (importedData.settings) {
                const settings = importedData.settings;
                if (settings.workSessionDuration > 0) workSessionDuration = settings.workSessionDuration;
                if (settings.breakSessionDuration > 0) breakSessionDuration = settings.breakSessionDuration;
                if (settings.longBreakDuration > 0) longBreakDuration = settings.longBreakDuration;
                if (settings.pomodorosUtilLongBreak > 0) pomodorosUtilLongBreak = settings.pomodorosUtilLongBreak;
            }
            
            // Sauvegarder toutes les données importées
            saveAllData();
            
            // Mettre à jour l'interface
            updateUI();
            updateStats();
            renderTasks();
            updateSettingsInputs();
            updateDataManagementModal();
            
            showDataMessage('📥 Données importées avec succès', 'success');
            console.log('📥 Import réussi depuis:', file.name);
            
        } catch (error) {
            console.error('❌ Erreur d\'import:', error);
            showDataMessage('❌ Erreur lors de l\'import - fichier invalide', 'error');
        } finally {
            event.target.value = ''; // Reset l'input
        }
    };
    
    reader.readAsText(file);
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
    updateAutoSaveStatus();
}

// ================================================================
// 🔄 AMÉLIORATION DES FONCTIONS DE SAUVEGARDE EXISTANTES
// ================================================================

// Surcharger la fonction saveAllData pour inclure l'UI
const originalSaveAllData = saveAllData;
function saveAllData() {
    // Montrer l'indicateur de sauvegarde
    updateSaveIndicator('saving');
    updateStatusIndicator('syncing');
    
    // Appeler la fonction originale
    const success = originalSaveAllData();
    
    // Mettre à jour l'indicateur selon le résultat
    setTimeout(() => {
        updateSaveIndicator(success ? 'saved' : 'error');
        updateStatusIndicator(success ? 'online' : 'offline');
    }, 500);
    
    return success;
}

// Améliorer startAutoSave pour inclure la planification
const originalStartAutoSave = startAutoSave;
function startAutoSave(intervalMinutes = 2) {
    originalStartAutoSave(intervalMinutes);
    
    // Calculer la prochaine sauvegarde
    const updateNextSaveTime = () => {
        nextAutoSaveTime = new Date(Date.now() + intervalMinutes * 60 * 1000);
        updateAutoSaveStatus();
    };
    
    updateNextSaveTime();
    
    // Mettre à jour le temps restant chaque minute
    const timeUpdateInterval = setInterval(() => {
        if (!autoSaveEnabled || !autoSaveInterval) {
            clearInterval(timeUpdateInterval);
            return;
        }
        updateNextSaveTime();
    }, 60000);
}

// ================================================================
// 🎧 GESTIONNAIRES D'ÉVÉNEMENTS POUR L'UI DE PERSISTANCE
// ================================================================

// Bouton de gestion des données
if (dataManagementBtn) {
    dataManagementBtn.addEventListener('click', () => {
        updateDataManagementModal();
        dataManagementDialog.showModal();
    });
}

// Fermeture du modal de gestion des données
if (closeDataManagementBtn) {
    closeDataManagementBtn.addEventListener('click', () => {
        dataManagementDialog.close();
    });
}

// Import de fichier
if (importFileInput) {
    importFileInput.addEventListener('change', handleImportFile);
}

// Fermeture avec Escape
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (dataManagementDialog && dataManagementDialog.open) {
            dataManagementDialog.close();
        }
    }
});

// Détecter si l'utilisateur est hors ligne
window.addEventListener('online', () => {
    console.log('🌐 Connexion rétablie');
    updateStatusIndicator('online');
    updateSaveIndicator('saved');
    // Sauvegarder les modifications en attente
    saveAllData();
});

window.addEventListener('offline', () => {
    console.log('📶 Connexion perdue');
    updateStatusIndicator('offline');
    updateSaveIndicator('offline');
});

// ================================================================
// 🚀 AMÉLIORATION DE L'INITIALISATION
// ================================================================

// Améliorer l'initialisation DOMContentLoaded existante
const originalDOMContentLoaded = document.querySelector('script[src="js/app.js"]');

// Ajouter ces lignes à votre initialisation DOMContentLoaded existante :
/*
document.addEventListener('DOMContentLoaded', () => {
    console.log('🍅 Application Pomodoro démarrée');
    
    // AJOUTER CES LIGNES À VOTRE INITIALISATION EXISTANTE :
    
    // Charger les données sauvegardées AVANT d'initialiser l'interface
    loadAllData();
    
    // Initialiser l'état des indicateurs
    updateSaveIndicator('saved');
    updateStatusIndicator(navigator.onLine ? 'online' : 'offline');
    
    // Démarrer la sauvegarde automatique
    startAutoSave(2); // Toutes les 2 minutes
    
    // Initialiser l'état
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
*/

// ================================================================
// 🔧 MODIFICATIONS À APPORTER AUX FONCTIONS EXISTANTES
// ================================================================

/*
AJOUTEZ CES APPELS DE SAUVEGARDE À VOS FONCTIONS EXISTANTES :

Dans recordCompletedSession() - APRÈS updateStats() :
    updateStats();
    saveStatistics(); // ← AJOUTER CETTE LIGNE

Dans addTask() - APRÈS le console.log :
    console.log(`✅ Tâche ajoutée: "${newTask.text}"`);
    saveTasks(); // ← AJOUTER CETTE LIGNE

Dans toggleTaskComplete() - APRÈS le console.log :
    console.log(`🔄 Tâche ${task.completed ? 'terminée' : 'réactivée'}: "${task.text}"`);
    saveTasks(); // ← AJOUTER CETTE LIGNE

Dans deleteTask() - APRÈS le console.log :
    console.log(`🗑️ Tâche supprimée: "${deletedTask.text}"`);
    saveTasks(); // ← AJOUTER CETTE LIGNE

Dans editTask() - APRÈS le console.log :
    console.log(`✏️ Tâche modifiée: "${task.text}"`);
    saveTasks(); // ← AJOUTER CETTE LIGNE

Dans clearCompletedTasks() - APRÈS le console.log :
    console.log(`🧹 ${completedCount} tâche(s) effacée(s)`);
    saveTasks(); // ← AJOUTER CETTE LIGNE

Dans updateSettings() - AVANT return true :
    saveSettings(); // ← AJOUTER CETTE LIGNE
    return true;
*/

// ================================================================
// 🎨 FONCTIONS D'AMÉLIORATION UX
// ================================================================

function showQuickStats() {
    const stats = getTaskStats();
    const focusHours = Math.floor(totalFocusTime / 3600);
    const focusMinutes = Math.floor((totalFocusTime % 3600) / 60);
    
    const message = `📊 Résumé rapide :\n\n` +
        `🍅 Pomodoros : ${completedPomodoros}\n` +
        `⏱️ Temps de focus : ${focusHours}h ${focusMinutes}min\n` +
        `🔥 Série actuelle : ${currentStreak}\n` +
        `📝 Tâches : ${stats.completed}/${stats.total} terminées (${stats.completionRate}%)\n` +
        `💾 Dernière sauvegarde : ${new Date().toLocaleTimeString('fr-FR')}`;
    
    alert(message);
}

// Fonction pour afficher les raccourcis clavier
function showKeyboardShortcuts() {
    const shortcuts = `⌨️ Raccourcis clavier :\n\n` +
        `• Espace : Démarrer/Pause le timer\n` +
        `• R : Reset le timer\n` +
        `• W : Passer en mode Travail\n` +
        `• B : Passer en mode Pause\n` +
        `• S : Ouvrir les paramètres\n` +
        `• D : Ouvrir la gestion des données\n` +
        `• T : Focus sur l'input de tâche\n` +
        `• Ctrl+S : Sauvegarder maintenant\n` +
        `• Escape : Fermer les modals`;
    
    alert(shortcuts);
}

// Ajouter des raccourcis clavier
document.addEventListener('keydown', (event) => {
    // Ignorer si on tape dans un input
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
    
    // Ignorer si un modal est ouvert
    if (settingsDialog.open || dataManagementDialog.open) return;
    
    switch(event.key.toLowerCase()) {
        case ' ':
            event.preventDefault();
            toggleBtn.click();
            break;
        case 'r':
            resetBtn.click();
            break;
        case 'w':
            if (!isRunning) workBtn.click();
            break;
        case 'b':
            if (!isRunning) breakBtn.click();
            break;
        case 's':
            settingsIcone.click();
            break;
        case 'd':
            dataManagementBtn.click();
            break;
        case 't':
            taskInput.focus();
            break;
        case 'f1':
            event.preventDefault();
            showKeyboardShortcuts();
            break;
    }
    
    // Ctrl+S pour sauvegarder
    if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveAllData();
        showDataMessage('💾 Sauvegarde manuelle effectuée', 'success');
    }
});

console.log("🔗 Module d'intégration UI pour la persistance chargé");

// ================================================================
// 🚀 INITIALISATION
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🍅 Application Pomodoro démarrée');

    loadAllData(); // Charger les données sauvegardées
    startAutoSave(2); // Démarrer la sauvegarde auto (2 min)

    // Initialiser l'état
    initialTime = remainingTime;
    
    // Initialiser l'interface
    updateUI();
    updateStats();
    renderTasks();
    

    // Demander la permission pour les notifications
    setupNotifications().then(canNotify => {
        if (canNotify) {
            console.log('🔔 Notifications prêtes');
        }
    });
    
    console.log('✅ Initialisation terminée');
});