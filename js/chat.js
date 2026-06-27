// ==========================================
// BOPIS LIVE COMMS (CHAT) LOGIC
// ==========================================

let chatDb;
if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
    chatDb = firebase.database();
}

document.addEventListener('DOMContentLoaded', () => {
    if (!chatDb) return;

    // --- DOM Elements ---
    const authView = document.getElementById('chat-auth-view');
    const waitingView = document.getElementById('chat-waiting-view');
    const chatRoomView = document.getElementById('chat-room-view');
    
    const authTitle = document.getElementById('auth-title');
    const usernameInput = document.getElementById('chat-username');
    const passwordInput = document.getElementById('chat-password');
    const authBtn = document.getElementById('chat-auth-btn');
    const toggleModeBtn = document.getElementById('auth-toggle-mode');
    const authSwitchText = document.getElementById('auth-switch-text');
    
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    
    const adminGearBtn = document.getElementById('chat-admin-gear');
    const adminMainBadge = document.getElementById('admin-main-badge');
    const adminMasterContainer = document.getElementById('admin-master-container');
    const adminLogin = document.getElementById('chat-admin-login');
    const adminDashboard = document.getElementById('chat-admin-dashboard');
    const adminPinInput = document.getElementById('chat-admin-pin');
    const adminPinBtn = document.getElementById('chat-admin-pin-btn');
    const adminError = document.getElementById('chat-admin-error');

    const userGearBtn = document.getElementById('chat-user-gear');
    const userSettingsContainer = document.getElementById('user-settings-container');
    const newNicknameInput = document.getElementById('new-nickname-input');
    const newPasswordInput = document.getElementById('new-password-input'); // NEW
    const saveProfileBtn = document.getElementById('save-profile-btn');     // RENAMED
    
    const pendingList = document.getElementById('pending-users-list');
    const activeList = document.getElementById('active-users-list');
    const pendingBadge = document.getElementById('pending-count-badge');
    const activeBadge = document.getElementById('active-count-badge');

    let isLoginMode = true; 
    let currentUser = null; 
    let userStatusListener = null;
    let isAdminUnlocked = false; 

    // ==========================================
    // A. AUTHENTICATION (LOGIN / REGISTER)
    // ==========================================
    
    toggleModeBtn.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            authTitle.innerText = "Member Login";
            authBtn.innerText = "Login";
            authSwitchText.innerText = "Need access? ";
            toggleModeBtn.innerText = "Register here";
        } else {
            authTitle.innerText = "Request Access";
            authBtn.innerText = "Submit Request";
            authSwitchText.innerText = "Already registered? ";
            toggleModeBtn.innerText = "Login here";
        }
    });

    authBtn.addEventListener('click', () => {
        const enteredName = usernameInput.value.trim();
        const rawPassword = passwordInput.value.trim();
        
        if (!enteredName || !rawPassword) return alert("Nickname and Password are required.");

        const encodedPassword = btoa(rawPassword);

        // --- 1. MASTER ADMIN INTERCEPT ---
        chatDb.ref('admin').once('value').then(adminSnap => {
            const adminData = adminSnap.val();
            const masterPin = adminData.pin.toString();
            const adminAlias = adminData.nickname || 'Admin'; // Defaults to Admin if not set

            // Allows login using 'Admin' OR your new custom alias!
            if (enteredName.toLowerCase() === adminAlias.toLowerCase() || enteredName.toLowerCase() === 'admin') {
                if (rawPassword === masterPin) {
                    activateUser('admin', adminAlias, 'approved', true);
                } else {
                    alert("ACCESS DENIED: Incorrect Master PIN.");
                }
                return; // Stops normal login from running
            }

            // --- 2. REGULAR USER DATABASE SCAN ---
            chatDb.ref('users').once('value').then(usersSnap => {
                let foundUserId = null;
                let userData = null;

                // Scans all users to find a match for their *current* nickname
                usersSnap.forEach(child => {
                    const u = child.val();
                    if (u.nickname && u.nickname.toLowerCase() === enteredName.toLowerCase()) {
                        foundUserId = child.key;
                        userData = u;
                    }
                });

                if (isLoginMode) {
                    if (!foundUserId) return alert("User not found. Check your nickname or register.");
                    if (userData.password !== encodedPassword) return alert("Incorrect password.");

                    // Logs them in successfully using their matched account!
                    activateUser(foundUserId, userData.nickname, userData.status, false);
                } else {
                    // Registration Mode (Ensures the chosen name isn't already taken)
                    if (foundUserId) return alert("That nickname is already taken! Please choose another.");

                    const newUserId = enteredName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (!newUserId) return alert("Please use valid characters in your nickname.");
                    if (usersSnap.hasChild(newUserId)) return alert("That nickname is already taken! Please choose another.");

                    const newUser = {
                        nickname: enteredName, // Saves their exact capitalization
                        password: encodedPassword,
                        status: "pending"
                    };

                    chatDb.ref(`users/${newUserId}`).set(newUser).then(() => {
                        alert("Registration sent! Awaiting admin approval.");
                        activateUser(newUserId, enteredName, "pending", false);
                    });
                }
            });
        });
    });

    // --- NEW: Press 'Enter' to submit the login/register form ---
    const submitOnEnter = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevents any weird form submission glitches
            authBtn.click();    // Virtually clicks the button for you!
        }
    };

    usernameInput.addEventListener('keypress', submitOnEnter);
    passwordInput.addEventListener('keypress', submitOnEnter);

    function activateUser(userId, nickname, initialStatus, isAdminFlag) {
        currentUser = { 
            id: userId, 
            nickname: nickname, 
            status: initialStatus,
            isAdmin: isAdminFlag 
        };
        
        localStorage.setItem('bopis_chat_session', JSON.stringify(currentUser));
        
        if (typeof window.updateTypewriter === 'function') window.updateTypewriter();
        
        authView.style.display = 'none';

        if (isAdminFlag) {
            isAdminUnlocked = true; 
            adminGearBtn.style.display = 'inline-block'; 
            chatMessages.classList.add('admin-mode-active'); 
            document.body.classList.add('master-admin-active'); 
            loadAdminData(); 
        }
        
        if (userId === 'admin') {
            waitingView.style.display = 'none';
            chatRoomView.style.display = 'flex';
            userGearBtn.style.display = 'inline-block'; 
            loadChatMessages();
            return;
        }

        if (userStatusListener) chatDb.ref(`users/${userId}/status`).off('value', userStatusListener);
        
        userStatusListener = chatDb.ref(`users/${userId}/status`).on('value', (snapshot) => {
            const currentStatus = snapshot.val();
            currentUser.status = currentStatus;
            
            if (currentStatus === 'approved') {
                waitingView.style.display = 'none';
                chatRoomView.style.display = 'flex';
                userGearBtn.style.display = 'inline-block'; 
                loadChatMessages(); 
            } else {
                chatRoomView.style.display = 'none';
                waitingView.style.display = 'block';
                userGearBtn.style.display = 'none'; 
            }
        });
    }

    // ==========================================
    // B. CHAT ROOM LOGIC 
    // ==========================================
    
    let isChatLoaded = false;

    function loadChatMessages() {
        if (isChatLoaded) return; 
        isChatLoaded = true;

        chatDb.ref('messages').limitToLast(50).on('child_added', (snapshot) => {
            renderMessage(snapshot.key, snapshot.val());
        });

        chatDb.ref('messages').limitToLast(50).on('child_changed', (snapshot) => {
            updateMessage(snapshot.key, snapshot.val());
        });
    }

    function renderMessage(msgId, data) {
        const msgDiv = document.createElement('div');
        msgDiv.id = `msg-${msgId}`;

        // Intercept System Messages and bypass bubble rendering
        if (data.type === 'system') {
            msgDiv.className = 'sys-msg';
            msgDiv.innerText = data.text;
            chatMessages.appendChild(msgDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            return; // Stops the rest of the function from running!
        }
        
        const isMe = data.userId === currentUser.id;
        
        let extraClass = '';
        if (data.isDeleted) extraClass = 'dull-bubble';
        else if (data.voidRequested) extraClass = 'void-requested-bubble';

        msgDiv.className = `chat-msg ${isMe ? 'msg-me' : 'msg-other'} ${extraClass}`;
        
        const timeString = new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const adminBadgeHtml = data.isAdmin ? `<span class="admin-chat-badge">Admin</span>` : '';
        const pendingBadgeHtml = (data.voidRequested && !data.isDeleted) ? `<span class="void-pending-badge">Void Requested</span>` : '';

        // Notice the new tabindex="0" menu container and the span links inside
        msgDiv.innerHTML = `
            <div class="msg-sender">
                ${isMe ? 'You' : data.nickname} ${adminBadgeHtml} &bull; ${timeString}
                ${pendingBadgeHtml}
            </div>
            <div class="msg-content ${data.isDeleted ? 'is-deleted' : ''}">
                <div class="original-text">${data.text}</div>
                <div class="deleted-text-notice">Message unavailable.</div>
            </div>
            ${!data.isDeleted ? `
            <div class="msg-menu-btn" tabindex="0">
                &#8942;
                <div class="menu-dropdown">
                    <span class="action-msg-link void-link" onclick="requestVoidMessage('${msgId}')">Void</span>
                    <span class="action-msg-link delete-link" onclick="deleteChatMessage('${msgId}')">Delete</span>
                </div>
            </div>
            ` : ''}
        `;
        
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function updateMessage(msgId, data) {
        const msgDiv = document.getElementById(`msg-${msgId}`);
        if (msgDiv) {
            // Intercept System Messages for live updates
            if (data.type === 'system') {
                msgDiv.innerText = data.text;
                return;
            }

            const contentDiv = msgDiv.querySelector('.msg-content');
            const origText = msgDiv.querySelector('.original-text');
            const senderDiv = msgDiv.querySelector('.msg-sender');

            origText.innerText = data.text; 
            
            // Re-evaluate bubble state classes
            msgDiv.classList.remove('dull-bubble', 'void-requested-bubble');
            if (data.isDeleted) {
                contentDiv.classList.add('is-deleted');
                msgDiv.classList.add('dull-bubble'); 
            } else {
                contentDiv.classList.remove('is-deleted');
                if (data.voidRequested) {
                    msgDiv.classList.add('void-requested-bubble');
                }
            }

            // Safely update the Void Request Badge without breaking the menu
            const existingBadge = senderDiv.querySelector('.void-pending-badge');
            if (existingBadge) existingBadge.remove();

            if (!data.isDeleted && data.voidRequested) {
                const badge = document.createElement('span');
                badge.className = 'void-pending-badge';
                badge.innerText = 'Void Requested';
                senderDiv.appendChild(badge);
            }
        }
    }

    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text || !currentUser || currentUser.status !== 'approved') return;

        const newMsg = {
            userId: currentUser.id,
            nickname: currentUser.nickname,
            text: text,
            timestamp: Date.now(),
            isDeleted: false,
            voidRequested: false,
            isAdmin: currentUser.isAdmin || false 
        };

        chatDb.ref('messages').push(newMsg);
        chatInput.value = ''; 
    }

    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // ==========================================
    // C. ADMIN DASHBOARD LOGIC 
    // ==========================================
    const collapseBtns = document.querySelectorAll('.collapse-btn');
    collapseBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Finds the content box immediately following the clicked button
            const content = this.nextElementSibling;
            if (content && content.classList.contains('collapse-content')) {
                // Toggles the visibility on and off
                content.classList.toggle('open');
            }
        });
    });
    
    adminGearBtn.addEventListener('click', () => {
        userSettingsContainer.style.display = 'none';

        if (adminMasterContainer.style.display === 'none' || adminMasterContainer.style.display === '') {
            adminMasterContainer.style.display = 'block';
            
            // Because isAdminUnlocked is true when you log in, this instantly skips the PIN screen!
            if (isAdminUnlocked) {
                adminLogin.style.display = 'none';
                adminDashboard.style.display = 'block';
            } else {
                adminLogin.style.display = 'block';
                adminDashboard.style.display = 'none';
                adminPinInput.value = '';
                adminError.style.display = 'none';
            }
        } else {
            adminMasterContainer.style.display = 'none';
        }
    });

    adminPinBtn.addEventListener('click', () => {
        const pin = adminPinInput.value.trim();
        
        chatDb.ref('admin/pin').once('value').then(snapshot => {
            if (pin === snapshot.val().toString()) {
                isAdminUnlocked = true; 
                adminLogin.style.display = 'none';
                adminDashboard.style.display = 'block';
                chatMessages.classList.add('admin-mode-active');
                document.body.classList.add('master-admin-active');

                loadAdminData();
            } else {
                adminPinInput.classList.add('shake-error');
                adminError.style.display = 'block';
                adminPinInput.value = '';
                setTimeout(() => adminPinInput.classList.remove('shake-error'), 300);
            }
        });
    });

    function loadAdminData() {
        chatDb.ref('users').on('value', (snapshot) => {
            pendingList.innerHTML = '';
            activeList.innerHTML = '';
            
            let pendingCount = 0;
            let activeCount = 0;

            snapshot.forEach(childSnapshot => {
                const userId = childSnapshot.key;
                const user = childSnapshot.val();
                
                const li = document.createElement('li');
                li.innerHTML = `<span><strong>${user.nickname}</strong></span>`;
                
                const btnGroup = document.createElement('div');
                btnGroup.className = 'admin-action-btns';

                if (user.status === 'pending') {
                    pendingCount++;
                    btnGroup.innerHTML = `
                        <button class="calc-btn btn-sm" onclick="updateUserStatus('${userId}', '${user.nickname}', 'approved')" style="background-color: #28a745;">Approve</button>
                        <button class="calc-btn btn-sm danger-btn" onclick="deleteUser('${userId}', '${user.nickname}')">Deny</button>
                    `;
                    li.appendChild(btnGroup);
                    pendingList.appendChild(li);
                } else if (user.status === 'approved') {
                    activeCount++;
                    btnGroup.innerHTML = `
                        <button class="calc-btn btn-sm outline-btn" onclick="updateUserStatus('${userId}', '${user.nickname}', 'pending')" style="margin: 0;">Revoke</button>
                    `;
                    li.appendChild(btnGroup);
                    activeList.appendChild(li);
                }
            });

            if (pendingCount === 0) pendingList.innerHTML = '<li class="empty-list">No pending requests.</li>';
            if (activeCount === 0) activeList.innerHTML = '<li class="empty-list">No active members yet.</li>';
            
            if (pendingBadge) pendingBadge.innerText = pendingCount;
            if (activeBadge) activeBadge.innerText = activeCount;

            // Update the main Admin Settings counter
            if (adminMainBadge) {
                if (pendingCount > 0) {
                    adminMainBadge.innerText = `(${pendingCount})`;
                    adminMainBadge.style.display = 'inline';
                } else {
                    adminMainBadge.style.display = 'none'; // Hides the (0) when empty
                }
            }
        });
    }

    // ==========================================
    // D. USER PROFILE LOGIC
    // ==========================================
    
    userGearBtn.addEventListener('click', () => {
        if (userSettingsContainer.style.display === 'none' || userSettingsContainer.style.display === '') {
            userSettingsContainer.style.display = 'block';
            newNicknameInput.value = currentUser.nickname; // Pre-fill current name
            newPasswordInput.value = ''; // ALWAYS clear the password field for security
            adminMasterContainer.style.display = 'none'; // Auto-close admin panel
        } else {
            userSettingsContainer.style.display = 'none';
        }
    });

    saveProfileBtn.addEventListener('click', () => {
        const newName = newNicknameInput.value.trim();
        const newPass = newPasswordInput.value.trim();
        
        if (!newName) return alert("Nickname cannot be empty.");
        
        let updatesMade = false;

        // 1. Handle Nickname Change
        if (newName !== currentUser.nickname) {
            const oldName = currentUser.nickname;
            currentUser.nickname = newName; // Update local session

            if (currentUser.id === 'admin') {
                chatDb.ref('admin/nickname').set(newName);
            } else {
                chatDb.ref(`users/${currentUser.id}`).update({ nickname: newName });
            }

            // Broadcast the change to the room
            window.sendSystemMessage(`>> SYSTEM: ${oldName} is now known as ${newName}. <<`);
            updatesMade = true;
        }

        // 2. Handle Password Change (Only fires if the user actually typed something)
        if (newPass) {
            if (currentUser.id === 'admin') {
                // Warning: This physically changes your Master PIN!
                chatDb.ref('admin/pin').set(newPass);
            } else {
                // Encodes regular users' passwords just like the registration screen
                const encodedPassword = btoa(newPass);
                chatDb.ref(`users/${currentUser.id}`).update({ password: encodedPassword });
            }
            updatesMade = true;
        }

        if (updatesMade) {
            alert("Profile updated securely.");
        }

        // Close the panel automatically
        userSettingsContainer.style.display = 'none';
    });

    // ==========================================
    // LOGOUT & AUTO-PURGE (INACTIVITY) LOGIC
    // ==========================================
    const logoutBtn = document.getElementById('chat-logout-btn');
    let inactivityTimer = null;
    const INACTIVITY_LIMIT = 60 * 60 * 1000; // 60 minutes in milliseconds

    function performLogout() {
        // 1. Wipe the saved session data
        localStorage.removeItem('bopis_chat_session');
        
        // 2. Clear out the current memory
        currentUser = null;
        isAdminUnlocked = false;
        clearTimeout(inactivityTimer);
        
        // 3. Disconnect the live database listener so it doesn't leak memory
        if (userStatusListener) {
            chatDb.ref().off('value', userStatusListener);
        }

        // 4. Force the UI back to the login screen
        authView.style.display = 'block';
        chatRoomView.style.display = 'none';
        waitingView.style.display = 'none';
        userGearBtn.style.display = 'none';
        adminGearBtn.style.display = 'none';
        adminMasterContainer.style.display = 'none';
        userSettingsContainer.style.display = 'none';
        
        // 5. Strip admin privileges from the CSS
        document.body.classList.remove('master-admin-active');
        chatMessages.classList.remove('admin-mode-active');
        
        // 6. Clear input fields for safety
        usernameInput.value = '';
        passwordInput.value = '';

        if (typeof window.updateTypewriter === 'function') window.updateTypewriter();
    }

    if (logoutBtn) logoutBtn.addEventListener('click', performLogout);

    // --- The Global Dead Man's Switch ---
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        
        // Only start counting if someone is actually logged into the chat
        if (currentUser) {
            inactivityTimer = setTimeout(() => {
                alert("Secure session terminated due to 1 hour of inactivity.");
                performLogout();
            }, INACTIVITY_LIMIT);
        }
    }

    // Listens for ANY movement on the entire dashboard to keep the session alive
    ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'].forEach(evt => {
        document.addEventListener(evt, resetInactivityTimer, true);
    });

    // ==========================================
    // E. THE GHOST TRIGGER (DECOY LINK)
    // ==========================================
    const secretTriggerBtn = document.getElementById('secret-comms-trigger');
    const chatTabPanel = document.getElementById('chat-panel');

    if (secretTriggerBtn && chatTabPanel) {
        // 1. Open the trapdoor
        secretTriggerBtn.addEventListener('click', () => {
            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.style.display = 'none'; // Forces all normal tabs hidden
                panel.classList.remove('active'); 
            });
            
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            chatTabPanel.style.display = 'block'; 
            chatTabPanel.classList.add('active');
        });

        // 2. Close trapdoor & RESTORE normal tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Instantly hide the comms panel
                chatTabPanel.style.display = 'none';
                chatTabPanel.classList.remove('active');
                
                // CRITICAL FIX: Erase the inline 'display: none' from all normal tabs
                // so your main website's CSS can properly show the clicked tab again!
                document.querySelectorAll('.tab-panel').forEach(panel => {
                    if (panel.id !== 'chat-panel') {
                        panel.style.display = ''; 
                    }
                });
            });
        });
    }

    // Generates the specialized system broadcast
    window.sendSystemMessage = function(text) {
        chatDb.ref('messages').push({
            type: 'system',
            text: text,
            timestamp: Date.now()
        });
    };

    window.updateUserStatus = function(userId, nickname, newStatus) {
        chatDb.ref(`users/${userId}/status`).set(newStatus).then(() => {
            // Trigger announcement when access is granted or revoked
            if (newStatus === 'approved') {
                sendSystemMessage(`>> SYSTEM: ${nickname} has joined secure comms. <<`);
            } else if (newStatus === 'pending') {
                sendSystemMessage(`>> SYSTEM: ${nickname}'s access was revoked. <<`);
            }
        });
    };

    window.deleteUser = function(userId, nickname) {
        if (confirm(`Are you sure you want to permanently delete ${nickname}?`)) {
            chatDb.ref(`users/${userId}`).remove().then(() => {
                // Trigger announcement when a user is denied/purged
                sendSystemMessage(`>> SYSTEM: ${nickname}'s request was denied. <<`);
            });
        }
    };

    window.requestVoidMessage = function(msgId) {
        if (confirm("Request admin to void this message?")) {
            chatDb.ref(`messages/${msgId}`).update({ voidRequested: true });
        }
    };

    window.deleteChatMessage = function(msgId) {
        if (confirm("Are you sure you want to delete this message?")) {
            chatDb.ref(`messages/${msgId}`).update({ isDeleted: true });
        }
    };
    // --- Auto-Login Check (Upgraded) ---
    // Moved to the bottom so all variables are fully loaded first!
    const savedSession = localStorage.getItem('bopis_chat_session');
    if (savedSession) {
        let sessionData = null;
        
        try {
            sessionData = JSON.parse(savedSession);
        } catch (err) {
            console.error("Session corrupted, clearing data.");
            localStorage.removeItem('bopis_chat_session');
        }

        if (sessionData) {
            activateUser(sessionData.id, sessionData.nickname, sessionData.status, sessionData.isAdmin);
            resetInactivityTimer(); 
        }
    }

    // ==========================================
    // F. MASTER SERVER CONTROLS (EXPORT / NUKE)
    // ==========================================
    const exportBtn = document.getElementById('admin-export-btn');
    const nukeBtn = document.getElementById('admin-nuke-btn');

    // --- 1. EXPORT MASTER LOG ---
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            // We use .once('value') to grab a single, complete snapshot of history
            chatDb.ref('messages').once('value').then(snapshot => {
                if (!snapshot.exists()) return alert("No messages to export.");

                let logText = "=========================================\n";
                logText += "      BOPIS SECURE COMMS - MASTER LOG    \n";
                logText += `      Generated: ${new Date().toLocaleString()}\n`;
                logText += "=========================================\n\n";

                snapshot.forEach(child => {
                    const msg = child.val();
                    
                    if (msg.type === 'system') {
                        logText += `[SYSTEM] ${new Date(msg.timestamp).toLocaleString()}: ${msg.text}\n`;
                    } else {
                        const time = new Date(msg.timestamp).toLocaleString();
                        
                        // Tag messages if they were altered
                        let statusTag = "";
                        if (msg.isDeleted) statusTag = " [DELETED]";
                        else if (msg.voidRequested) statusTag = " [VOID REQUESTED]";

                        // Tag the user if they were an admin
                        const roleTag = msg.isAdmin ? "[ADMIN] " : "";
                        
                        logText += `[${time}] ${roleTag}${msg.nickname}: ${msg.text}${statusTag}\n`;
                    }
                });

                // Package the text into a downloadable file
                const blob = new Blob([logText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                // Names the file with today's date (e.g., Bopis_Log_2026-06-28.txt)
                a.download = `Bopis_Log_${new Date().toISOString().split('T')[0]}.txt`;
                document.body.appendChild(a);
                a.click();
                
                // Clean up the memory
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }).catch(err => {
                console.error("Export failed:", err);
                alert("Failed to export logs. Check console.");
            });
        });
    }

    // --- 2. WIPE HISTORY (NUKE) ---
    if (nukeBtn) {
        nukeBtn.addEventListener('click', () => {
            // Added a specific type-in confirmation to prevent accidental clicks!
            const confirmWord = prompt("WARNING: This permanently deletes ALL chat history for everyone.\n\nType 'WIPE' to confirm:");
            
            if (confirmWord === 'WIPE') {
                // Instantly vaporizes the messages folder from Firebase
                chatDb.ref('messages').remove().then(() => {
                    // Leaves a single system message behind so users know what happened
                    window.sendSystemMessage(">> SYSTEM: Chat history has been securely wiped by Admin. <<");
                    alert("Database wiped successfully.");
                }).catch(err => {
                    console.error("Wipe failed:", err);
                    alert("Failed to wipe database.");
                });
            } else if (confirmWord !== null) {
                alert("Wipe aborted. Confirmation word incorrect.");
            }
        });
    }
});