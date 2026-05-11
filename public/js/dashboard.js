const token = checkAuth();
if (token) {
    const user = getUser();
    
    const socket = io();

    socket.on("connect_error", (err) => {
        if (err.message === "Authentication error") {
            logout();
        }
    });

    const qrImg = document.getElementById("qr");
    const loader = document.getElementById("loader");
    const statusText = document.getElementById("statusText");
    const statusDot = document.getElementById("statusDot");
    const qrWrapper = document.getElementById("qrWrapper");
    const connectedMsg = document.getElementById("connectedMsg");
    const paymentRequiredMsg = document.getElementById("paymentRequiredMsg");
    const apiContent = document.getElementById("apiContent");

    const avatar = document.getElementById('userAvatar');
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const userActions = document.getElementById('userActions');
    const mobileLoginItem = document.getElementById('mobileLoginItem');
    const loginBtn = document.getElementById('loginBtn');
    const isLoggedIn = getCookie("isLoggedIn");

    if (isLoggedIn) {
        if (loginBtn) loginBtn.style.setProperty('display', 'none', 'important');
        if (avatar) {
            avatar.style.setProperty('display', 'flex', 'important');
            const u = getUser();
            if (u && u.name) avatar.childNodes[0].nodeValue = u.name.charAt(0).toUpperCase();
        }
        if (mobileBtn) mobileBtn.style.setProperty('display', 'none', 'important');
        if (userActions) userActions.style.setProperty('display', 'block', 'important');
        if (mobileLoginItem) mobileLoginItem.style.setProperty('display', 'none', 'important');

        const u = getUser();
        if (u && u.role === 'admin') {
            const adminLink = document.getElementById('adminLink');
            const adminMsgLink = document.getElementById('adminMsgLink');
            if (adminLink) adminLink.style.setProperty('display', 'block', 'important');
            if (adminMsgLink) adminMsgLink.style.setProperty('display', 'block', 'important');
        }
    } else {
        if (avatar) avatar.style.setProperty('display', 'none', 'important');
        if (mobileBtn) mobileBtn.style.setProperty('display', 'block', 'important');
        if (userActions) userActions.style.setProperty('display', 'none', 'important');
        if (mobileLoginItem) mobileLoginItem.style.setProperty('display', 'block', 'important');
    }

    window.toggleDropdown = function() {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown.style.display === 'none' || dropdown.style.display === '') {
            dropdown.style.display = 'block';
        } else {
            dropdown.style.display = 'none';
        }
    };

    window.addEventListener('click', (e) => {
        const menu = document.getElementById('userMenu');
        const dropdown = document.getElementById('userDropdown');
        const mBtn = document.getElementById('mobileMenuBtn');
        if (menu && !menu.contains(e.target) && mBtn && !mBtn.contains(e.target) && dropdown) {
            dropdown.style.display = 'none';
        }
    });

    function setConnectedUI() {
        if (qrWrapper) qrWrapper.style.display = "none";
        if (connectedMsg) connectedMsg.style.display = "block";
        if (apiContent) apiContent.style.display = "block";
        if (statusText) {
            statusText.innerText = "متصل بنجاح";
            statusText.style.color = "var(--primary)";
        }
        if (statusDot) {
            statusDot.classList.add("connected");
        }
    }

    function setDisconnectedUI() {
        const user = getUser();
        const status = user.payment_status || 'unpaid';

        if (status === 'approved') {
            if (qrWrapper) qrWrapper.style.display = "block";
            if (paymentRequiredMsg) paymentRequiredMsg.style.display = "none";
        } else {
            if (qrWrapper) qrWrapper.style.display = "none";
            if (paymentRequiredMsg) paymentRequiredMsg.style.display = "block";
            
            const pForm = document.getElementById("paymentForm");
            const pPending = document.getElementById("paymentPending");
            
            if (status === 'pending') {
                if (pForm) pForm.style.display = "none";
                if (pPending) pPending.style.display = "block";
            } else {
                if (pForm) pForm.style.display = "block";
                if (pPending) pPending.style.display = "none";
            }
        }

        if (connectedMsg) connectedMsg.style.display = "none";
        if (apiContent) apiContent.style.display = "none";
        if (statusText) {
            statusText.innerText = status === 'approved' ? "غير متصل" : "بانتظار التفعيل";
            statusText.style.color = "#f59e0b";
        }
        if (statusDot) {
            statusDot.classList.remove("connected");
        }
        if (qrImg) {
            qrImg.style.display = "none";
            qrImg.src = "";
        }
        if (loader) loader.style.display = "block";
    }

    window.submitPayment = async function() {
        const user = getUser();
        try {
            const res = await fetch("/api/auth/submit-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id })
            });
            const data = await res.json();
            if (data.success) {
                user.payment_status = 'pending';
                localStorage.setItem("user", JSON.stringify(user));
                setDisconnectedUI();
                alert("تم إرسال طلبك بنجاح، سيتم التفعيل قريباً.");
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("حدث خطأ في الإرسال");
        }
    };

    const qrTimer = document.getElementById("qrTimer");
    const qrExpired = document.getElementById("qrExpired");
    let countdownInterval;

    socket.on("payment_required", (msg) => {
        setDisconnectedUI();
    });

    window.isQrExpired = false;

    function startTimer(duration) {
        clearInterval(countdownInterval);
        let timer = duration, minutes, seconds;
        qrExpired.style.display = "none";
        qrTimer.style.display = "block";
        window.isQrExpired = false;
        
        countdownInterval = setInterval(() => {
            minutes = parseInt(timer / 60, 10);
            seconds = parseInt(timer % 60, 10);

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            qrTimer.textContent = minutes + ":" + seconds;

            if (--timer < 0) {
                clearInterval(countdownInterval);
                window.isQrExpired = true;
                if (qrImg) {
                    qrImg.style.display = "none";
                    qrImg.src = ""; // Clear src to prevent background visibility
                }
                qrExpired.style.display = "flex";
                qrTimer.style.display = "none";
                statusText.innerText = "انتهت الصلاحية";
            }
        }, 1000);
    }

    if (getCookie("whatsapp_connected") === "true") {
        setConnectedUI();
    }

    socket.on("connect", () => {
        if (getCookie("whatsapp_connected") !== "true") {
            if (statusText) statusText.innerText = "جاري الاتصال...";
        }
    });

    socket.on("qr", (data) => {
        if (window.isQrExpired) return;

        document.cookie = "whatsapp_connected=; Path=/; Max-Age=-99999999;";
        setDisconnectedUI();
        
        if (loader) loader.style.display = "none";
        if (qrImg) {
            qrImg.style.display = "block";
            qrImg.src = data;
        }
        if (statusText) statusText.innerText = "بانتظار المسح...";
        
        // Start 1 minute timer (60 seconds)
        startTimer(60);
    });

    socket.on("connected", (msg) => {
        clearInterval(countdownInterval);
        setCookie("whatsapp_connected", "true");
        setConnectedUI();
    });

    socket.on("connecting", (msg) => {
        if (getCookie("whatsapp_connected") === "true") return;
        if (statusText) statusText.innerText = msg || "جاري الاتصال...";
        if (loader) loader.style.display = "block";
        if (qrImg) qrImg.style.display = "none";
    });

    socket.on("disconnected", (msg) => {
        document.cookie = "whatsapp_connected=; Path=/; Max-Age=-99999999;";
        setDisconnectedUI();
    });

    // Profile Polling / Check on Load
    async function checkProfileUpdate() {
        try {
            const res = await fetch('/api/auth/get-profile');
            const data = await res.json();
            if (data.success) {
                const oldStatus = user.payment_status;
                const newStatus = data.user.payment_status;

                // If status changed, update storage and UI
                if (oldStatus !== newStatus) {
                    setCookie('user', JSON.stringify(data.user));
                    location.reload(); // Refresh to apply all changes smoothly
                }
            }
        } catch (err) {
            console.error("Profile check error:", err);
        }
    }

    // Check once on load, and if still pending/unpaid, check every 10 seconds
    checkProfileUpdate();
    if (user.payment_status !== 'approved') {
        setInterval(checkProfileUpdate, 10000);
    }
}
