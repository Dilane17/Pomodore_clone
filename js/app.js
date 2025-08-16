import { setupNotifications } from "./Notification.js";

//Sélection des élément du DOM
const toggleBtn = document.getElementById('toggleBtn');
const breakBtn = document.getElementById('breakBtn');
const resetBtn = document.getElementById('resetBtn');
const timer = document.getElementById('timer')
const workBtn = document.getElementById('workBtn');
//Logique sur le bouton Démarrer
//Stocker le temps restant 
let remainingTime = 1500; //25 minutes en 1500 secondes
let isRunning = false; 
let countDown = null;
let isWorkSession = true;
//Fonction pour formater le temps en minutes et secondes
function formatTemps(seconde) {
    const minutes = Math.floor(seconde / 60);
    const secondes = seconde % 60;
    return (
        String(minutes).padStart(2, '0') +
        ':' +
        String(secondes).padStart(2, '0')
    );
}

// Initialiser l'affichage au chargement
timer.textContent = formatTemps(remainingTime);

//Écouter le click sur le bouton
toggleBtn.addEventListener('click', () => {
    if (!isRunning) {
        // Démarrer le timer
        isRunning = true;
        toggleBtn.textContent = "Pause";
        countDown = setInterval(() => {
            remainingTime--;
            // Mettre à jour l'affichage du timer
            timer.textContent = formatTemps(remainingTime);
            if (remainingTime === 0) {
                clearInterval(countDown);
                countDown = null;
                isRunning = false;
                toggleBtn.textContent = "Démarrer";
                toggleBtn.disabled = true
                // Envoyer une notification
                    setupNotifications().then(canNotify => {
                    if (canNotify) {
                        sendNotification()
                    }
                })
            }
        }, 1000);
    } else {
        // Mettre en pause le timer
        clearInterval(countDown);
        countDown = null;
        isRunning = false;
        toggleBtn.textContent = "Démarrer";
    }
});

//Logique du bouton rénitialiser 

//Ecouter le click sur le bouton 
resetBtn.addEventListener('click', ()=> {
    // Remet le compteur à la valeur initiale
    remainingTime = 1500;
    timer.textContent = formatTemps(remainingTime);
    // Bloquer le compte à rebours
    if (countDown !== null) {
        clearInterval(countDown);
        countDown = null;
    }
    // Réactiver le bouton démarrer
    toggleBtn.textContent = "Démarrer";
    isRunning = false;
    toggleBtn.disabled = false
});

//Gestion des sessions
function sessions() {
    
    if (!isWorkSession) {
        breakBtn.classList.add('active')
        workBtn.classList.remove('active')
        remainingTime= 300 // 5 minutes en secondes
        isWorkSession= true
        timer.textContent = formatTemps(remainingTime)

    } else {
        workBtn.classList.add('active')
        breakBtn.classList.remove('active')
        remainingTime = 1500
        isWorkSession= false
        timer.textContent = formatTemps(remainingTime)
    }
}

//Logique du bouton pause
breakBtn.addEventListener('click', () => {
    isRunning = false
    resetBtn.disabled = true
    sessions()
})
//Logique du bouton Travail
workBtn.addEventListener('click', () => {
    sessions()
})
//Fonction pour envoyer une notification
function sendNotification() {
    if (Notification.permission === "granted") {
        if (isWorkSession) {
            new Notification("Session terminée!", {
            body: "Prenez une pause de 5 minutes.",
            icon: "https://via.placeholder.com/64"
        });
        } else {
            new Notification("Session terminée!", {
            body: "Vous avez terminé votre pause.",
            icon: "https://via.placeholder.com/64"
        });
        }
        
    }
}





