import { setupNotifications } from "./Notification.js";

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

// Variables d'état du timer
let remainingTime = 1500; // 25 minutes en 1500 secondes
let isRunning = false; 
let countDown = null;
let isWorkSession = true; // AMÉLIORATION: Logique claire - true = travail, false = pause
let workSessionDuration = 1500; // 25 minutes en secondes
let breakSessionDuration = 300; // 5 minutes en secondes

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
    // Envoyer une notification
    setupNotifications().then(canNotify => {
        if (canNotify) {
            sendNotification();
        }
    });
    
    // AMÉLIORATION: Proposer automatiquement de passer à la session suivante
    const nextSessionType = isWorkSession ? "pause" : "travail";
    const switchToNext = confirm(`Session terminée ! Voulez-vous passer à la session de ${nextSessionType} ?`);
    
    if (switchToNext) {
        switchSession();
    }
}

// AMÉLIORATION: Fonction pour basculer entre les sessions
function switchSession() {
    isWorkSession = !isWorkSession; // Inverse le type de session
    
    // Met à jour le temps restant selon le nouveau type de session
    remainingTime = isWorkSession ? workSessionDuration : breakSessionDuration;
    
    updateUI();
}

// AMÉLIORATION: Fonction pour réinitialiser à la session courante
function resetToCurrentSession() {
    stopTimer();
    
    // AMÉLIORATION: Remet le timer à la durée de la session courante (pas toujours 1500)
    remainingTime = isWorkSession ? workSessionDuration : breakSessionDuration;
    
    updateUI();
}

// Initialiser l'affichage au chargement
updateUI(); // AMÉLIORATION: Utilise la fonction centralisée

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
    
    // Convertir en secondes
    const workDurationSeconds = workDurationMinutes * 60;
    const breakDurationSeconds = breakDurationMinutes * 60;
    
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