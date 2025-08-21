//Gérer les notifications
async function setupNotifications() {
    if (!("Notification" in window)) {
        console.error("Ce navigateur ne supporte pas les notifications.");
        return false;
    }

    if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        console.log("Nouvelle permission de notification:", permission);
    }

    // ✅ CORRECTION : Logique corrigée
    if (Notification.permission === "granted") {
        console.log("Prêt à envoyer des notifications");
        return true;
    } else {
        console.error("Permission de notification refusée");
        return false;
    }
}

// Sélection des éléments du DOM
const toggleBtn = document.getElementById('toggleBtn');
const breakBtn = document.getElementById('breakBtn');
const resetBtn = document.getElementById('resetBtn');
const timer = document.getElementById('timer')
const workBtn = document.getElementById('workBtn');
const settingsIcone = document.getElementById('settingsIcone')
const settingsDialog = document.getElementById('settingsDialog')
const closeSettingsBtn = document.getElementById('closeSettingsBtn')
const changeTimeBtn = document.getElementById('changeTimeBtn')
const workDuration = document.getElementById('workDuration')
const breakDuration = document.getElementById('breakDuration')
const longBreakDurationInput = document.getElementById('longBreakDuration')
const pomodorosUtilLongBreakInput = document.getElementById('pomodorosUtilLongBreak')

// Variables d'état du timer
let remainingTime = 1500; // 25 minutes en 1500 secondes
let isRunning = false; 
let countDown = null;
let isWorkSession = true; // AMÉLIORATION: Logique claire - true = travail, false = pause
let workSessionDuration = 1500; // 25 minutes en secondes
let breakSessionDuration = 300; // 5 minutes en secondes
let completedPomodoros = 0; // Compteur de sessions terminées
let totalFocusTime = 0; // Temps total de concentration en secondes
let currentStreak = 0; // Compteur de sessions consécutives
let initialTime = 1500; // temps initial de la session (pour calculer la progression) 
let sessionStartTime = null; // Timestamp de début de session pour calculs précis
let longBreakDuration = 900; // Durée de la pause longue en secondes (15 minutes)
let pomodorosUtilLongBreak = 4; // Nombre de pomodoros avant une pause longue
let currentPomodoroInCycle = 0; // Compteur de pomodoros dans le cycle actuel

// Fonction pour formater le temps en minutes et secondes
function formatTemps(seconde) {
    const minutes = Math.floor(seconde / 60);
    const secondes = seconde % 60;
    return (
        String(minutes).padStart(2, '0') +
        ':' +
        String(secondes).padStart(2, '0')
    );
}

// AMÉLIORATION: Fonction centralisée pour mettre à jour l'interface utilisateur
function updateUI() {
    // Met à jour l'affichage du timer
    timer.textContent = formatTemps(remainingTime);
    
    // Met à jour les boutons actifs selon la session courante
    workBtn.classList.toggle('active', isWorkSession);
    breakBtn.classList.toggle('active', !isWorkSession);
    
    // Met à jour le texte du bouton principal selon l'état
    toggleBtn.textContent = isRunning ? "Pause" : "Démarrer";

    // Mettre à jour la barre de progression
    updateProgressBar();
}

// AMÉLIORATION: Fonction pour arrêter complètement le timer
function stopTimer() {
    if (countDown !== null) {
        clearInterval(countDown);
        countDown = null;
    }
    isRunning = false;
    toggleBtn.disabled = false; // S'assurer que le bouton est toujours activé
    updateUI();
}

// AMÉLIORATION: Fonction pour démarrer le timer
function startTimer() {
    isRunning = true;
    updateUI();
    
    countDown = setInterval(() => {
        remainingTime--;
        timer.textContent = formatTemps(remainingTime);
        
        // Quand le timer atteint zéro
        if (remainingTime === 0) {
            stopTimer();
            handleSessionComplete(); // AMÉLIORATION: Gestion séparée de la fin de session
        }
    }, 1000);
}

// AMÉLIORATION: Fonction pour gérer la fin d'une session
function handleSessionComplete() {
    timer.classList.remove('pulse');

    //Enregistrer la session terminée avant de proposer la suivante
    recordCompletedSession();

    // Envoyer une notification
    setupNotifications().then(canNotify => {
        if (canNotify) {
            sendNotification();
        }
    });

    // ✅ CORRECTION : Logique simplifiée sans async/await inutile
    const nextSession = determineNextSessionType();
    if (nextSession === "pause courte") {
        switchSession(); // Basculer vers une pause courte
    } else if (nextSession === "pause longue") {
        startLongBreak(); // Démarrer une pause longue
    } else {
        switchSession(); // Reprendre le travail
    }
}

// AMÉLIORATION: Fonction pour basculer entre les sessions
function switchSession() {
    isWorkSession = !isWorkSession; // Inverse le type de session
    
    // Met à jour le temps restant selon le nouveau type de session
    remainingTime = isWorkSession ? workSessionDuration : breakSessionDuration;
    
    //Mettre à jour le temps initial pour la nouvelle session
    initialTime = remainingTime;
    updateUI();
}

// AMÉLIORATION: Fonction pour réinitialiser à la session courante
function resetToCurrentSession() {
    //Si on reset pendant qu'une session est en cours, casser la série
    if (isRunning && isWorkSession) {
        resetStreak();
    }

    stopTimer();
    
    // AMÉLIORATION: Remet le timer à la durée de la session courante (pas toujours 1500)
    remainingTime = isWorkSession ? workSessionDuration : breakSessionDuration;
    
    //Remettre le temps initial
    initialTime = remainingTime;

    updateUI();
}

// Initialiser l'affichage au chargement
document.addEventListener('DOMContentLoaded', () => {
    initialTime = remainingTime; // Initialiser le temps initial
    updateStats(); // Mettre à jour les statistiques initiales
    // Mettre à jour l'interface utilisateur initiale
    updateUI();
})

// Écouter le click sur le bouton démarrer/pause
toggleBtn.addEventListener('click', () => {
    if (!isRunning) {
        startTimer(); // AMÉLIORATION: Fonction dédiée pour démarrer
    } else {
        // Mettre en pause le timer
        stopTimer(); // AMÉLIORATION: Utilise la fonction centralisée
    }
});

// Logique du bouton réinitialiser 
resetBtn.addEventListener('click', () => {
    resetToCurrentSession(); // AMÉLIORATION: Utilise la fonction améliorée
});

// AMÉLIORATION: Logique simplifiée pour les boutons de session
breakBtn.addEventListener('click', () => {
    // Ne peut changer de session que si le timer n'est pas en cours
    if (!isRunning) {
        if (isWorkSession) { // Si on est en session de travail, passer en pause
            switchSession();
        }
        // Si on est déjà en pause, ne rien faire (évite les bugs)
    }
});

workBtn.addEventListener('click', () => {
    // Ne peut changer de session que si le timer n'est pas en cours
    if (!isRunning) {
        if (!isWorkSession) { // Si on est en session de pause, passer en travail
            switchSession();
        }
        // Si on est déjà en travail, ne rien faire (évite les bugs)
    }
});

// AMÉLIORATION: Fonction pour envoyer une notification avec messages plus clairs
function sendNotification() {
    if (Notification.permission === "granted") {
        if (isWorkSession) {
            // On termine une session de travail
            new Notification("Session de travail terminée!", {
                body: "Temps de prendre une pause de " + (breakSessionDuration / 60) + " minutes.",
                icon: "https://via.placeholder.com/64"
            });
        } else {
            // On termine une session de pause
            new Notification("Pause terminée!", {
                body: "Temps de reprendre le travail pendant " + (workSessionDuration / 60) + " minutes.",
                icon: "https://via.placeholder.com/64"
            });
        }
    }
}

// Logique du bouton paramètres
settingsIcone.addEventListener('click', () => {
    settingsDialog.showModal();
});

closeSettingsBtn.addEventListener('click', () => {
    settingsDialog.close();
});

// AMÉLIORATION: Validation et gestion d'erreurs pour les paramètres
changeTimeBtn.addEventListener('click', () => {
    // Récupérer les valeurs des inputs
    const workDurationMinutes = parseInt(workDuration.value, 10);
    const breakDurationMinutes = parseInt(breakDuration.value, 10);
    const longBreakDurationMinutes = parseInt(longBreakDurationInput.value, 10);
    const pomodorosUtilLongBreakValue = parseInt(pomodorosUtilLongBreakInput.value, 10);

    // AMÉLIORATION: Validation des valeurs saisies
    if (isNaN(workDurationMinutes) || workDurationMinutes <= 0) {
        alert("La durée de travail doit être un nombre positif");
        return;
    }
    
    if (isNaN(breakDurationMinutes) || breakDurationMinutes <= 0) {
        alert("La durée de pause doit être un nombre positif");
        return;
    }
    
    if (workDurationMinutes > 120) {
        alert("La durée de travail ne peut pas dépasser 120 minutes");
        return;
    }
    
    if (breakDurationMinutes > 60) {
        alert("La durée de pause ne peut pas dépasser 60 minutes");
        return;
    }

    if (isNaN(longBreakDurationMinutes) || longBreakDurationMinutes <= 0) {
        alert("La durée de pause longue doit être un nombre positif");
        return;
    }
    
    if (isNaN(pomodorosUtilLongBreakValue) || pomodorosUtilLongBreakValue <= 0) {
        alert("Le nombre de pomodoros avant une pause longue doit être un nombre positif");
        return;
    }
    
    // Convertir en secondes
    const workDurationSeconds = workDurationMinutes * 60;
    const breakDurationSeconds = breakDurationMinutes * 60;
    longBreakDuration = longBreakDurationMinutes * 60; // Convertir en secondes
    pomodorosUtilLongBreak = pomodorosUtilLongBreakValue; // Mettre à jour le nombre de pomodoros avant une pause longue
    
    // AMÉLIORATION: Mettre à jour les durées globales
    workSessionDuration = workDurationSeconds;
    breakSessionDuration = breakDurationSeconds;
    
    // AMÉLIORATION: Mettre à jour le temps restant selon la session courante
    remainingTime = isWorkSession ? workSessionDuration : breakSessionDuration;
    
    // AMÉLIORATION: Arrêter le timer si en cours pour éviter les incohérences
    if (isRunning) {
        stopTimer();
        alert("Timer arrêté pour appliquer les nouveaux paramètres");
    }
    
    updateUI();
    settingsDialog.close();
    
    console.log(`Nouveaux paramètres appliqués: Travail=${workDurationMinutes}min, Pause=${breakDurationMinutes}min`);
});

//Fonction pour afficher les statistiques
function updateStats() {
    // Récupérer les éléments du DOM pour les statistiques
    const completedPomodorosElement = document.getElementById('completedPomodoros');
    const totalFocusTimeElement = document.getElementById('totalFocusTime');
    const currentStreakElement = document.getElementById('currentStreak');
    //Mettre à jour le compteur de pomodoros
    completedPomodorosElement.textContent = completedPomodoros;
    //Convertir le temps total en heures et minutes 
    const totalHours = Math.floor(totalFocusTime / 3600);
    const totalMinutes = Math.floor((totalFocusTime % 3600) / 60);
    totalFocusTimeElement.textContent = `${totalHours}h ${totalMinutes}min`;
    //Mettre à jour la série actuelle
    currentStreakElement.textContent = currentStreak;
    console.log(`Statistiques mises à jour: Pomodoros=${completedPomodoros}, Temps total=${totalFocusTime} secondes, Série actuelle=${currentStreak}`);
}

//FONCTION POUR LA BARRE DE PROGRESSION 
function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    
    // Calculer le pourcentage de progression (temps écoulé / temps total)
    const timeElapsed = initialTime - remainingTime;
    const progressPercentage = (timeElapsed / initialTime) * 100;
    
    // Appliquer la progression à la barre
    progressBar.style.width = progressPercentage + '%';
    
    // Changer la couleur selon le type de session
    if (isWorkSession) {
        progressBar.classList.remove('break');
    } else {
        progressBar.classList.add('break');
    }
    
    // Debug
    console.log(`Progression: ${Math.round(progressPercentage)}%`);
}

// FONCTION POUR ENREGISTRER UNE SESSION TERMINÉE 
function recordCompletedSession() {
    if (isWorkSession) {
        // C'est une session de travail qui se termine
        completedPomodoros++;
        currentStreak++;
        currentPomodoroInCycle++;
        // Ajouter le temps de focus (durée complète de la session)
        totalFocusTime += (initialTime);
        
        console.log(`✅ Pomodoro terminé! Total: ${completedPomodoros}, Série: ${currentStreak}`);
    } else {
        // C'est une pause qui se termine - on ne compte pas comme pomodoro
        console.log(`☕ Pause terminée`);
    }
    
    // Mettre à jour l'affichage des stats
    updateStats();
}

// FONCTION POUR REMETTRE À ZÉRO LA SÉRIE
function resetStreak() {
    currentStreak = 0;
    updateStats();
    console.log("🔄 Série remise à zéro");
}

// Fonction pour vérifier si c'est le moment de prendre une pause longue
function isTimeForLongBreak() {
    if (currentPomodoroInCycle >= pomodorosUtilLongBreak) {
        // Si on a atteint le nombre de pomodoros pour une pause longue
        currentPomodoroInCycle = 0; // Réinitialiser le compteur de pomodoros dans le cycle
        return true; // Indiquer qu'il est temps de prendre une pause longue
    }
    return false; // Sinon, pas de pause longue
}

// ✅ CORRECTION : Fonction synchrone (pas d'async/await)
function determineNextSessionType() {
    if (!isWorkSession) {
        return "travail"; // Si on était en pause, on reprend le travail
    } else if (isWorkSession && isTimeForLongBreak()) {
        return "pause longue"; // Si on était en travail et qu'on a atteint le nombre de pomodoros, on prend une pause longue
    } else {
        return "pause courte"; // Sinon, on prend une pause normale
    }
}

// Fonction pour configurer le timer pour une pause longue 
function startLongBreak() {
    isWorkSession = false;
    remainingTime = longBreakDuration; // Mettre le temps restant à la durée de la pause longue
    initialTime = longBreakDuration; // Mettre le temps initial à la durée de la pause longue
    updateUI(); // Mettre à jour l'interface utilisateur
    console.log("🕒 Pause longue démarrée pour " + (longBreakDuration / 60) + " minutes");
}

// Gestion des taches
// Sélection des éléments du DOM pour les tâches
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

//Variable pour stocker les tâches
let tasks = [];
let taskId = 0; // ID pour chaque tâche

// Fonction pour ajouter une tâche
function addTask(taskText) {
    // Validation de l'input 
    if (!taskText || taskText.trim() === '') {
        showTaskError("Veuillez entrer une tâche valide");
        return;
    }

    if (taskText.length > 100) {
        showTaskError("La tâche ne peut pas dépasser 100 caractères");
        return;
    }

    //créer un objet tâche
    const newTask = {
        id: taskId++,
        text: taskText,
        completed: false,
        createdAt: new Date().toISOString(), // Date de création de la tâche
        completedAt: null // Date de complétion de la tâche 

    };

    // Ajouter la tache au début du tableau
    tasks.unshift(newTask); // Ajouter la nouvelle tâche au début du tableau
    renderTasks(); // Mettre à jour l'affichage des tâches
    //vider le champ de saisie
    taskInput.value = ''; // Réinitialiser le champ de saisie
    console.log(`Tâche ajoutée: ${taskText}`);
}

// Fonction pour rendre la liste des tâches
function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    tasksList.innerHTML = ''; // Vider la liste avant de la remplir
    if (tasks.length === 0) {
        tasksList.innerHTML = `
            <div class="no-tasks">
                <i class="fas fa-clipboard-list"></i>
                <p>Aucune tâche ajoutée</p>
                <small>Ajoutez une tâche pour commencer !</small>
            </div>
        `;
        return;
    }
    // Afficher chaque tache
    tasks.forEach(task => {
        const taskElement = createTaskElement('task');
        tasksList.appendChild(taskElement);
    });
    // Mettre à jour le compteur dans le bouton "effacer"
    updateClearButton();
}

// Fonction pour créer l'élément html d'une tache
function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-item ${task.completed ? 'completed' : ''}`;
    taskDiv.dataset.id = task.id; // Ajouter l'ID de la tâche comme attribut
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

// Fonction pour commencer à éditer une tâche
function startEditingTask(taskId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    const taskText = taskElement.querySelector('.task-text');
    const editInput = taskElement.querySelector('.task-edit-input');

    // Cacher le texte et afficher l'input 
    taskText.style.display = 'none';
    editInput.style.display = 'block';
    editInput.focus(); // Mettre le focus sur l'input   
    editInput.select();
}

// Fonction pour terminer l'édition d'une tâche
function finishEditingTask(taskId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    const editInput = taskElement.querySelector('.task-edit-input');
    const taskText = taskElement.querySelector('.task-text');

    // Récupérer le texte de l'input
    const newText = editInput.value.trim();
    if (newText && newText !== taskText.textContent) {
        editTask(taskId, newText); // Appeler la fonction d'édition
    } else {
        //annuler l'édition
        taskText.style.display = 'block';
        editInput.style.display = 'none';
    }
}

// ✅ FONCTION : Gérer les touches pendant l'édition
function handleTaskEditKeydown(event, taskId) {
    if (event.key === 'Enter') {
        finishEditingTask(taskId);
    } else if (event.key === 'Escape') {
        // Annuler l'édition
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        const taskText = taskElement.querySelector('.task-text');
        const editInput = taskElement.querySelector('.task-edit-input');
        
        editInput.value = taskText.textContent; // Restaurer le texte original
        taskText.style.display = 'block';
        editInput.style.display = 'none';
    }
}

// ✅ FONCTION : Effacer toutes les tâches terminées
function clearCompletedTasks() {
    const completedCount = tasks.filter(t => t.completed).length;
    
    if (completedCount === 0) {
        showTaskError('Aucune tâche terminée à effacer');
        return;
    }
    
    // Demander confirmation
    if (confirm(`Voulez-vous vraiment effacer ${completedCount} tâche(s) terminée(s) ?`)) {
        tasks = tasks.filter(t => !t.completed);
        renderTasks();
        
        console.log(`🧹 ${completedCount} tâche(s) terminée(s) effacée(s)`);
    }
}

// ✅ FONCTION : Mettre à jour le bouton "effacer"
function updateClearButton() {
    const completedCount = tasks.filter(t => t.completed).length;
    const clearBtn = clearCompletedBtn;
    
    if (completedCount > 0) {
        clearBtn.style.display = 'block';
        clearBtn.title = `Effacer ${completedCount} tâche(s) terminée(s)`;
        clearBtn.classList.add('has-completed');
    } else {
        clearBtn.style.display = 'none';
        clearBtn.classList.remove('has-completed');
    }
}

// ✅ FONCTION : Afficher une erreur pour les tâches
function showTaskError(message) {
    // Créer un élément d'erreur temporaire
    const errorDiv = document.createElement('div');
    errorDiv.className = 'task-error';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
    `;
    
    // Ajouter l'erreur au début de la liste des tâches
    tasksList.insertBefore(errorDiv, tasksList.firstChild);
    
    // Supprimer l'erreur après 3 secondes
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 3000);
    
    // Faire clignoter l'input
    taskInput.classList.add('error');
    setTimeout(() => taskInput.classList.remove('error'), 2000);
}

// ✅ FONCTION UTILITAIRE : Échapper le HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ✅ FONCTION UTILITAIRE : Formater la date d'une tâche
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

// ✅ FONCTION : Obtenir les statistiques des tâches
function getTaskStats() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        completionRate: completionRate
    };
}

// Evenement pour la gestion des taches

// Ajouter une tâche via le bouton
addTaskBtn.addEventListener('click', () => {
    addTask(taskInput.value);
});

// Ajouter une tâche via la touche Entrée
taskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        addTask(taskInput.value);
    }
});

// Effacer les tâches terminées
clearCompletedBtn.addEventListener('click', () => {
    clearCompletedTasks();
});

// Empêcher la soumission du formulaire si l'input est dans un form
taskInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
    }
});

//Initialisation des taches 

document.addEventListener('DOMContentLoaded', () => {
    renderTasks(); // Afficher les tâches (vide au début)
    console.log('📝 Système de gestion des tâches initialisé');
});


// Intégration avec le système pomodoro 

// Fonction pour marquer automatiquement une tâche comme terminée après un pomodoro
function completeTaskAfterPomodoro() {
    const firstPendingTask = tasks.find(t => !t.completed);
    if (firstPendingTask) {
        if (confirm(`Marquer la tâche "${firstPendingTask.text}" comme terminée ?`)) {
            toggleTaskComplete(firstPendingTask.id);
        }
    }
}

// Fonction pour obtenir la tâche en cours (première non terminée)
function getCurrentTask() {
    return tasks.find(t => !t.completed) || null;
}

// Fonction pour afficher la tâche actuelle dans le timer 
function updateTimerWithCurrentTask() {
    const currentTask = getCurrentTask();
    const timerElement = document.getElementById('timer');
    
    if (currentTask && isWorkSession) {
        // Ajouter le nom de la tâche sous le timer
        let taskDisplay = document.getElementById('current-task-display');
        if (!taskDisplay) {
            taskDisplay = document.createElement('div');
            taskDisplay.id = 'current-task-display';
            taskDisplay.className = 'current-task';
            timerElement.parentNode.insertBefore(taskDisplay, timerElement.nextSibling);
        }
        taskDisplay.innerHTML = `<i class="fas fa-tasks"></i> ${escapeHtml(currentTask.text)}`;
    } else {
        // Supprimer l'affichage de la tâche
        const taskDisplay = document.getElementById('current-task-display');
        if (taskDisplay) {
            taskDisplay.remove();
        }
    }
}