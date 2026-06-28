// Navin AppScript Web App URL 
const API_URL = "https://script.google.com/macros/s/AKfycbwejrGuxEBtUVBu9-z9xEVi8KseUUWVddIenUAC6mua8zfEZxxv8CbbBo2Ckf29GldkxQ/exec"; 

let siteData = { papers: [], notices: [] }; 
let currentUser = "";
let currentUserPassword = ""; // Security: Backend validation සඳහා තියාගන්නවා
let currentUserRole = ""; 
let currentUserBookmarks = []; 
let isLoginMode = true;

const appContent = document.getElementById('appContent');
const searchWrapper = document.getElementById('searchWrapper');
const searchBar = document.getElementById('searchBar');
const noticeBoard = document.getElementById('noticeBoard');

// SECURITY: XSS වලින් ආරක්ෂා වීමට
function sanitizeHTML(str) {
    if (!str) return "";
    return String(str).replace(/[&<>'"]/g, match => {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[match];
    });
}

// 1. FETCH DATA FROM DATABASE (No Cache)
async function fetchPapersFromDatabase() {
    searchWrapper.style.display = 'none'; 
    noticeBoard.style.display = 'none';
    
    appContent.innerHTML = `
        <div style="text-align: center; margin-top: 80px; color: var(--accent-blue);">
            <i class="fa-solid fa-spinner fa-spin fa-3x"></i>
            <h2 style="margin-top: 20px;">Loading Database...</h2>
            <p style="color: var(--text-muted);">Please wait a moment while we fetch the data.</p>
        </div>
    `;
    
    try {
        let response = await fetch(API_URL);
        let result = await response.json();
        
        if (result.status === "success") {
            siteData.papers = result.papersData || [];
            siteData.notices = result.noticesData || [];
            renderFaculties(); 
        } else {
            appContent.innerHTML = `<p style="color:red; text-align:center; margin-top:50px;">Failed to load data. Please refresh.</p>`;
        }
    } catch (error) {
        console.error("Fetch failed", error);
        appContent.innerHTML = `<p style="color:red; text-align:center; margin-top:50px;">Error connecting to database.</p>`;
    }
}

// STEP 1: FACULTIES
function renderFaculties() {
    searchWrapper.style.display = 'none';
    noticeBoard.style.display = 'block'; 
    renderNotices();

    const faculties = [...new Set(siteData.papers.map(p => p.faculty))].filter(Boolean);

    appContent.innerHTML = `
        <h2 style="text-align:center; margin-bottom:10px;">Select Your Faculty</h2>
        <div class="grid-container" id="facultyGrid"></div>
    `;

    const grid = document.getElementById('facultyGrid');
    faculties.forEach(fac => {
        const count = siteData.papers.filter(p => p.faculty === fac).length;
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.onclick = () => renderProgrammes(fac); 
        tile.innerHTML = `
            <i class="fa-solid fa-university"></i>
            <h3>${sanitizeHTML(fac)}</h3>
            <span class="stats-badge">${count} Papers Available</span>
        `;
        grid.appendChild(tile);
    });
}

// STEP 2: PROGRAMMES
function renderProgrammes(facultyName) {
    searchWrapper.style.display = 'none';
    noticeBoard.style.display = 'none';

    const programmes = [...new Set(
        siteData.papers.filter(p => p.faculty === facultyName).map(p => p.programme || "General / Other")
    )].filter(Boolean);

    appContent.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="back-btn" onclick="renderFaculties()"><i class="fa-solid fa-arrow-left"></i> Back to Faculties</button>
        </div>
        <h2 style="text-align:center; margin-bottom:5px;">${sanitizeHTML(facultyName)}</h2>
        <p style="text-align:center; color:var(--text-muted); margin-bottom:20px;">Select Your Programme</p>
        <div class="grid-container" id="programmeGrid"></div>
    `;

    const grid = document.getElementById('programmeGrid');
    programmes.forEach(prog => {
        const count = siteData.papers.filter(p => p.faculty === facultyName && (p.programme || "General / Other") === prog).length;
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.onclick = () => renderLevels(facultyName, prog); 
        tile.innerHTML = `
            <i class="fa-solid fa-graduation-cap"></i>
            <h3>${sanitizeHTML(prog)}</h3>
            <span class="stats-badge">${count} Papers</span>
        `;
        grid.appendChild(tile);
    });
}

// STEP 3: LEVELS
function renderLevels(facultyName, programmeName) {
    const levels = [...new Set(
        siteData.papers.filter(p => p.faculty === facultyName && (p.programme || "General / Other") === programmeName).map(p => p.level || "Other")
    )].filter(Boolean).sort(); 

    appContent.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="back-btn" onclick="renderProgrammes('${sanitizeHTML(facultyName)}')"><i class="fa-solid fa-arrow-left"></i> Back to Programmes</button>
        </div>
        <h2 style="text-align:center; margin-bottom:5px;">${sanitizeHTML(programmeName)}</h2>
        <p style="text-align:center; color:var(--text-muted); margin-bottom:20px;">Select Academic Level</p>
        <div class="grid-container" id="levelGrid"></div>
    `;

    const grid = document.getElementById('levelGrid');
    levels.forEach(lvl => {
        const count = siteData.papers.filter(p => p.faculty === facultyName && (p.programme || "General / Other") === programmeName && (p.level || "Other") === lvl).length;
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.onclick = () => renderCourseCodes(facultyName, programmeName, lvl); 
        tile.innerHTML = `
            <i class="fa-solid fa-layer-group"></i>
            <h3>Level ${sanitizeHTML(lvl)}</h3>
            <span class="stats-badge">${count} Courses</span>
        `;
        grid.appendChild(tile);
    });
}

// STEP 4: COURSE CODES
function renderCourseCodes(facultyName, programmeName, levelName) {
    searchWrapper.style.display = 'flex'; 
    const filteredPapers = siteData.papers.filter(p => p.faculty === facultyName && (p.programme || "General / Other") === programmeName && (p.level || "Other") === levelName);
    const courseCodes = [...new Set(filteredPapers.map(p => p.code))].filter(Boolean);

    appContent.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="back-btn" onclick="renderLevels('${sanitizeHTML(facultyName)}', '${sanitizeHTML(programmeName)}')"><i class="fa-solid fa-arrow-left"></i> Back to Levels</button>
        </div>
        <h2 style="text-align:center; margin-bottom:15px;">Level ${sanitizeHTML(levelName)} - Courses</h2>
        <div class="grid-container" id="courseGrid"></div>
    `;

    const grid = document.getElementById('courseGrid');
    if(courseCodes.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:var(--text-muted);">No courses found here.</p>`;
        return;
    }

    courseCodes.forEach(code => {
        const sample = filteredPapers.find(p => p.code === code);
        const isBookmarked = currentUserBookmarks.includes(code);
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.innerHTML = `
            <button class="bookmark-icon-btn ${isBookmarked ? 'active' : ''}" onclick="toggleBookmark(event, '${sanitizeHTML(code)}')">
                <i class="fa-solid fa-star"></i>
            </button>
            <div onclick="renderPapers('${sanitizeHTML(code)}')" style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <i class="fa-solid fa-code"></i>
                <h3>${sanitizeHTML(code)}</h3>
                <p style="font-size:0.85em; color:var(--text-muted); margin:0;">${sanitizeHTML(sample.name || 'No Name')}</p>
            </div>
        `;
        grid.appendChild(tile);
    });
}

// STEP 5: PAPERS
function renderPapers(courseCode) {
    searchWrapper.style.display = 'none';
    noticeBoard.style.display = 'none';
    const filtered = siteData.papers.filter(p => p.code === courseCode);
    const sample = filtered[0] || {};

    appContent.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="back-btn" onclick="renderCourseCodes('${sanitizeHTML(sample.faculty)}', '${sanitizeHTML(sample.programme || 'General / Other')}', '${sanitizeHTML(sample.level || 'Other')}')">
                <i class="fa-solid fa-arrow-left"></i> Back to Courses
            </button>
        </div>
        <h2 style="text-align:center; margin-bottom:5px;">${sanitizeHTML(courseCode)}</h2>
        <div class="grid-container" id="papersGrid"></div>
    `;

    const grid = document.getElementById('papersGrid');
    filtered.forEach(paper => {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.onclick = () => viewPaper(paper);
        tile.innerHTML = `
            <i class="fa-solid fa-file-pdf" style="color: #f87171;"></i>
            <h3 style="font-size: 1.1em; line-height: 1.3; margin: 10px 0 5px 0;">${sanitizeHTML(paper.name || 'Past Paper')}</h3>
            <p style="font-size: 0.85em; color: var(--text-muted); margin: 0;">${sanitizeHTML(paper.type || 'Exam')}</p>
        `;
        grid.appendChild(tile);
    });
}

// STEP 6: VIEW PDF & DOWNLOAD
function viewPaper(paper) {
    searchWrapper.style.display = 'none';
    appContent.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="back-btn" onclick="renderPapers('${sanitizeHTML(paper.code)}')"><i class="fa-solid fa-arrow-left"></i> Back to Papers</button>
        </div>
        <div class="paper-view">
            <h2 style="margin-bottom:10px; font-size: 1.5em; color: var(--text-main); font-weight: 700;">${sanitizeHTML(paper.name || paper.code)}</h2>
            <div style="margin-bottom: 20px;">
                <span id="dl-count-${sanitizeHTML(paper.code)}" class="stats-badge" style="background: var(--accent-blue); color: #0f172a; font-weight: bold; padding: 5px 12px; font-size: 0.9em;">
                    <i class="fa-solid fa-download"></i> ${paper.downloads || 0} Downloads
                </span>
            </div>
            <iframe src="${paper.link}" allow="autoplay" style="border: 1px solid var(--border-color); border-radius: 12px;"></iframe>
            <br>
            <button onclick="downloadPDF('${sanitizeHTML(paper.code)}', '${paper.link}')" class="download-btn" style="width: 100%; max-width: 300px; margin: 0 auto; justify-content: center; font-size: 1.1em; padding: 12px;"><i class="fa-solid fa-cloud-arrow-down"></i> Download PDF</button>
        </div>
    `;
}

async function downloadPDF(code, link) {
    window.open(link, '_blank'); 
    let badge = document.getElementById(`dl-count-${code}`);
    if(badge) {
        let currentCount = parseInt(badge.innerText.replace(/[^0-9]/g, '')) || 0;
        badge.innerHTML = `<i class="fa-solid fa-download"></i> ${currentCount + 1} Downloads`;
    }
    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "incrementDownload", code: code })
        });
    } catch(e) { console.error(e); }
}

// STEP 7: SEARCH (Debounced)
let searchTimeout;
function searchPaper() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        let query = searchBar.value.toUpperCase().trim();
        if (query === "") {
            renderFaculties();
            return;
        }
        noticeBoard.style.display = 'none';
        
        const filtered = siteData.papers.filter(p => 
            p.code.toUpperCase().includes(query) || (p.name && p.name.toUpperCase().includes(query))
        );
        const uniqueCodes = [...new Set(filtered.map(p => p.code))];

        appContent.innerHTML = `
            <h2 style="text-align:center; margin-bottom:20px;">Search Results for "${sanitizeHTML(query)}"</h2>
            <div class="grid-container" id="searchGrid"></div>
        `;

        const grid = document.getElementById('searchGrid');
        if (uniqueCodes.length === 0) {
            grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--text-muted);">No matching courses found.</p>`;
            return;
        }

        uniqueCodes.forEach(code => {
            const sample = filtered.find(p => p.code === code);
            const isBookmarked = currentUserBookmarks.includes(code);
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.innerHTML = `
                <button class="bookmark-icon-btn ${isBookmarked ? 'active' : ''}" onclick="toggleBookmark(event, '${sanitizeHTML(code)}')">
                    <i class="fa-solid fa-star"></i>
                </button>
                <div onclick="renderPapers('${sanitizeHTML(code)}')" style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                    <i class="fa-solid fa-code"></i>
                    <h3>${sanitizeHTML(code)}</h3>
                    <p style="font-size:0.85em; color:var(--text-muted); margin:0;">${sanitizeHTML(sample.name || 'No Name')}</p>
                </div>
            `;
            grid.appendChild(tile);
        });
    }, 300);
}

// STEP 8: NOTICES
function renderNotices() {
    if (siteData.notices.length === 0) {
        noticeBoard.style.display = 'none';
        return;
    }
    noticeBoard.style.display = 'block';
    noticeBoard.innerHTML = `<div class="notice-title"><i class="fa-solid fa-bullhorn"></i> Important Announcements</div>`;
    siteData.notices.forEach(notice => {
        const item = document.createElement('div');
        item.className = 'notice-item';
        item.innerHTML = `• ${sanitizeHTML(notice.text)} <span style="font-size:0.8em; color:var(--accent-blue);">(${sanitizeHTML(notice.date || '')})</span>`;
        noticeBoard.appendChild(item);
    });
}

// STEP 9: BOOKMARKS
function toggleBookmark(event, courseCode) {
    event.stopPropagation(); 
    const index = currentUserBookmarks.indexOf(courseCode);
    if (index > -1) {
        currentUserBookmarks.splice(index, 1);
    } else {
        currentUserBookmarks.push(courseCode);
    }
    
    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `action=saveBookmarks&username=${encodeURIComponent(currentUser)}&bookmarks=${encodeURIComponent(JSON.stringify(currentUserBookmarks))}`
    }).catch(err => console.error(err));

    event.currentTarget.classList.toggle('active');
}

function renderBookmarks() {
    searchWrapper.style.display = 'none';
    noticeBoard.style.display = 'none';

    appContent.innerHTML = `
        <div style="margin-bottom: 20px;">
            <button class="back-btn" onclick="renderFaculties()"><i class="fa-solid fa-arrow-left"></i> Back to Home</button>
        </div>
        <h2 style="text-align:center; margin-bottom:20px;"><i class="fa-solid fa-star" style="color:#f59e0b;"></i> My Bookmarked Courses</h2>
        <div class="grid-container" id="bookmarkGrid"></div>
    `;

    const grid = document.getElementById('bookmarkGrid');
    if (currentUserBookmarks.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--text-muted);">You haven't bookmarked any courses yet.</p>`;
        return;
    }

    currentUserBookmarks.forEach(code => {
        const sample = siteData.papers.find(p => p.code === code) || { name: "Bookmarked Course" };
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.innerHTML = `
            <button class="bookmark-icon-btn active" onclick="toggleBookmark(event, '${sanitizeHTML(code)}'); this.parentElement.remove();">
                <i class="fa-solid fa-star"></i>
            </button>
            <div onclick="renderPapers('${sanitizeHTML(code)}')" style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <i class="fa-solid fa-code"></i>
                <h3>${sanitizeHTML(code)}</h3>
                <p style="font-size:0.85em; color:var(--text-muted); margin:0;">${sanitizeHTML(sample.name)}</p>
            </div>
        `;
        grid.appendChild(tile);
    });
}

// STEP 10: AUTHENTICATION
async function handleAuth(event) {
    event.preventDefault();
    const user = document.getElementById('auth_user').value.trim();
    const pass = document.getElementById('auth_pass').value.trim();
    const contact = document.getElementById('auth_contact') ? document.getElementById('auth_contact').value.trim() : "";
    const statusText = document.getElementById('authStatus');

    statusText.style.color = "var(--accent-blue)";
    statusText.innerText = isLoginMode ? "Logging in..." : "Registering...";

    let bodyParams = `action=${isLoginMode ? 'login' : 'register'}&username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;
    if (!isLoginMode) bodyParams += `&contact=${encodeURIComponent(contact)}`;

    try {
        let response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: bodyParams
        });
        let result = await response.json();

        if (result.status === "success") {
            statusText.style.color = "var(--accent-green)";
            statusText.innerText = result.message;
            
            if (isLoginMode) {
                currentUser = user;
                currentUserPassword = pass; // SECURITY: Keep for backend validation
                currentUserRole = result.role || "user";
                currentUserBookmarks = result.bookmarks ? JSON.parse(result.bookmarks) : [];
                
                setTimeout(() => {
                    document.getElementById('authContainer').style.display = 'none';
                    document.getElementById('mainPortal').style.display = 'block';
                    
                    const helpBtn = document.getElementById('whatsappHelpBtn');
                    if (helpBtn) helpBtn.style.display = 'flex'; 
                    
                    document.getElementById('adminLockBtn').style.display = currentUserRole === "admin" ? "inline-flex" : "none";
                    fetchPapersFromDatabase(); 
                }, 1000);
            } else {
                setTimeout(() => toggleAuthMode(), 1500);
            }
        } else {
            statusText.style.color = "#f87171"; 
            statusText.innerText = result.message;
        }
    } catch (error) { 
        console.error(error);
        statusText.style.color = "#f87171"; 
        statusText.innerText = "Error Connecting to Server."; 
    }
    document.getElementById('auth_pass').value = '';
}

function handleLogout() {
    currentUser = ""; currentUserPassword = ""; currentUserRole = "user"; currentUserBookmarks = [];
    document.getElementById('mainPortal').style.display = 'none';
    document.getElementById('authContainer').style.display = 'flex';
    
    const helpBtn = document.getElementById('whatsappHelpBtn');
    if (helpBtn) helpBtn.style.display = 'none'; 
    
    if(!isLoginMode) toggleAuthMode();
    document.getElementById('authForm').reset();
    document.getElementById('authStatus').innerText = "";
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('authTitle').innerText = isLoginMode ? "Portal Login" : "Portal Registration";
    document.getElementById('authBtn').innerText = isLoginMode ? "Login" : "Register Account";
    document.getElementById('contactGroup').style.display = isLoginMode ? "none" : "flex";
    document.getElementById('toggleAuthText').innerText = isLoginMode ? "Don't have an account?" : "Already have an account?";
    document.getElementById('toggleAuthLink').innerText = isLoginMode ? " Register here" : " Login here";
    document.getElementById('authStatus').innerText = "";
}

function handleForgotPassword() {
    alert("Please contact the Admin via the WhatsApp Help Center to reset your password.");
}

// ADMIN PANEL - SECURED
function openAdmin() {
    if (currentUserRole !== 'admin') {
        alert("Access Denied! Only admins can view this.");
        return;
    }
    searchWrapper.style.display = 'none';
    noticeBoard.style.display = 'none';

    appContent.innerHTML = `
        <h2 style="text-align:center; color: var(--accent-blue);">Admin Dashboard</h2>
        <div style="display:flex; justify-content:center; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
            <button class="download-btn" onclick="fetchUsers()"><i class="fa-solid fa-users"></i> View Students</button>
            <button class="download-btn" onclick="showAddPaperForm()"><i class="fa-solid fa-plus"></i> Add Paper</button>
            <button class="download-btn" style="background:#f59e0b;" onclick="fetchPapersFromDatabase()"><i class="fa-solid fa-home"></i> Back to Home</button>
        </div>
        <div id="adminViewArea" class="admin-panel" style="max-width:800px; margin:0 auto;"></div>
    `;
}

async function fetchUsers() {
    document.getElementById('adminViewArea').innerHTML = "<p style='text-align:center;'><i class='fa-solid fa-spinner fa-spin'></i> Loading students...</p>";
    try {
        let res = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: "getUsers",
                username: currentUser, 
                password: currentUserPassword // Backend validation
            }) 
        });
        let data = await res.json();
        
        if(data.status === "error") {
            document.getElementById('adminViewArea').innerHTML = `<p style='color:red;'>${data.message}</p>`;
            return;
        }

        let html = `<table style="width:100%; text-align:left; color:white; border-collapse: collapse;">
                    <tr style="border-bottom: 2px solid var(--border-color);">
                        <th style="padding:10px;">Username</th>
                        <th style="padding:10px;">Contact</th>
                        <th style="padding:10px;">Action</th>
                    </tr>`;
        data.users.forEach(u => {
            if (u.role !== 'admin') {
                html += `<tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding:10px;">${sanitizeHTML(u.username)}</td>
                    <td style="padding:10px;">${sanitizeHTML(u.contact)}</td>
                    <td style="padding:10px;">
                        <button style="background:#f87171; border:none; border-radius:5px; color:white; padding:5px 10px; cursor:pointer;" onclick="deleteUser('${sanitizeHTML(u.username)}')">Delete</button>
                    </td>
                </tr>`;
            }
        });
        html += `</table>`;
        document.getElementById('adminViewArea').innerHTML = html;
    } catch(e) {
        document.getElementById('adminViewArea').innerHTML = "<p style='color:red;'>Failed to load users.</p>";
    }
}

async function deleteUser(targetUsername) {
    if(confirm(`Are you sure you want to delete ${targetUsername}?`)) {
        await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: "deleteUser", 
                targetUser: targetUsername,
                username: currentUser, 
                password: currentUserPassword // Backend validation
            }) 
        });
        alert("Action Completed!");
        fetchUsers();
    }
}

function showAddPaperForm() {
    document.getElementById('adminViewArea').innerHTML = `
        <h3 style="text-align:center; margin-bottom:20px;">Add New Past Paper</h3>
        <div class="form-group"><input type="text" id="p_fac" placeholder="Faculty (e.g. Engineering)" required></div>
        <div class="form-group"><input type="text" id="p_prog" placeholder="Programme (e.g. BTech)" required></div>
        <div class="form-group"><input type="text" id="p_level" placeholder="Level (e.g. 3, 4, 5)" required></div>
        <div class="form-group"><input type="text" id="p_code" placeholder="Course Code (e.g. EEI3346)" required></div>
        <div class="form-group"><input type="text" id="p_name" placeholder="Paper Name / Year (e.g. 2023 Final)" required></div>
        <div class="form-group"><input type="text" id="p_link" placeholder="Google Drive PDF Link" required></div>
        <button onclick="submitNewPaper()" class="download-btn" style="width:100%; justify-content:center;">Submit Paper</button>
    `;
}

async function submitNewPaper() {
    let payload = {
        action: "adminPaper",
        method: "add",
        username: currentUser, // Backend validation
        password: currentUserPassword, // Backend validation
        faculty: document.getElementById('p_fac').value,
        programme: document.getElementById('p_prog').value,
        level: document.getElementById('p_level').value,
        code: document.getElementById('p_code').value,
        name: document.getElementById('p_name').value,
        link: document.getElementById('p_link').value
    };
    
    if(!payload.code || !payload.link) {
        alert("Course code and link are required!");
        return;
    }

    document.getElementById('adminViewArea').innerHTML = "<p style='text-align:center;'><i class='fa-solid fa-spinner fa-spin'></i> Submitting...</p>";
    
    try {
        let res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        let data = await res.json();
        
        if(data.status === "error") {
            alert("Error: " + data.message);
        } else {
            alert("Paper Added Successfully!");
        }
    } catch(e) {
        alert("Error connecting to server.");
    }
    
    fetchPapersFromDatabase();
}