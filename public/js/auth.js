function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function checkAuth() {
    const isLoggedIn = getCookie("isLoggedIn");
    if (!isLoggedIn) {
        window.location.href = "/";
        return null;
    }
    return true; 
}

function setCookie(name, value, days = 90) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}

function getUser() {
    const userJson = getCookie("user");
    if (!userJson) return {};
    try {
        const decoded = decodeURIComponent(userJson);
        return JSON.parse(decoded);
    } catch(e) {
        console.error("Error parsing user:", e);
        return {};
    }
}

function logout() {
    // Clear cookies
    document.cookie = "token=; Path=/; Max-Age=-99999999;";
    document.cookie = "isLoggedIn=; Path=/; Max-Age=-99999999;";
    document.cookie = "user=; Path=/; Max-Age=-99999999;";
    document.cookie = "whatsapp_connected=; Path=/; Max-Age=-99999999;";
    
    // Clear any remaining localStorage just in case
    localStorage.clear();
    
    fetch("/api/auth/logout", { method: "POST" }).finally(() => {
        window.location.href = "/";
    });
}
