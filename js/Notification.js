//Gérer les notifications
export async function setupNotifications() {
    // Vérifier si les notifications sont supportées
    if (!("Notification" in window)) {
        alert("Ce navigateur ne supporte pas les notificatiions");
        return false;//Notification non supportée
    } else {
        console.log("Notifications supportées");
        return true;//Notification supportée
    }
} 
//Demander la permission si nécessaire

 if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    console.log("Nouvelle permission:", permission);
}
//Vérifier si permission es accordé 
if (Notification.permission === "granted") {
    console.log("Pret a envoyer des notifiations");
    //return true;
}else {
    console.log("Permission refusée")
    //return false;
}

