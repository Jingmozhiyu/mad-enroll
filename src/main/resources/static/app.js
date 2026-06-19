const API_BASE_URL = 'http://localhost:8080';
const TASK_API_URL = '/api/tasks';
const TOKEN_KEY = 'uwcm_jwt_token';
const USER_EMAIL_KEY = 'uwcm_user_email';

if (typeof axios === 'undefined') {
    alert('Frontend dependency failed to load (axios). Please refresh and check static resource loading.');
    throw new Error('axios is undefined');
}

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            clearAuth();
            renderLoginRequired('Session expired. Please login again.');
        }
        return Promise.reject(error);
    }
);

const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
    updateAuthStatus();
};

const setAuth = (email, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_EMAIL_KEY, email);
    updateAuthStatus();
};

const isLoggedIn = () => !!localStorage.getItem(TOKEN_KEY);

const updateAuthStatus = () => {
    const currentUser = document.getElementById('currentUser');
    const email = localStorage.getItem(USER_EMAIL_KEY);
    currentUser.innerText = email || 'Not logged in';
};

const getAuthForm = () => {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    if (!email || !password) {
        throw new Error('Email and password are required.');
    }
    return { email, password };
};

const register = () => {
    let payload;
    try {
        payload = getAuthForm();
    } catch (e) {
        alert(e.message);
        return;
    }

    api.post('/auth/register', payload)
        .then(() => {
            alert('Register success. Please login.');
        })
        .catch(err => {
            const msg = err.response?.data?.msg || 'Register failed.';
            alert(msg);
        });
};

const login = () => {
    let payload;
    try {
        payload = getAuthForm();
    } catch (e) {
        alert(e.message);
        return;
    }

    api.post('/auth/login', payload)
        .then(response => {
            const data = response.data?.data;
            if (!data?.token) {
                alert('Login failed: missing token.');
                return;
            }
            setAuth(data.email, data.token);
            loadTasks();
        })
        .catch(err => {
            const msg = err.response?.data?.msg || 'Login failed.';
            alert(msg);
        });
};

const logout = () => {
    clearAuth();
    renderLoginRequired('Please login to view your tasks.');
};

const renderLoginRequired = (message) => {
    const tbody = document.getElementById('taskTableBody');
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#666">${message}</td></tr>`;
    document.getElementById('totalCount').innerText = '0';
};

// 1. Load Tasks
const loadTasks = () => {
    if (!isLoggedIn()) {
        renderLoginRequired('Please login to view your tasks.');
        return;
    }

    const tbody = document.getElementById('taskTableBody');
    api.get(TASK_API_URL)
        .then(response => {
            const tasks = response.data.data || [];
            document.getElementById('totalCount').innerText = tasks.length;
            renderTable(tasks);
        })
        .catch(err => {
            console.error(err);
            if (err.response?.status !== 401) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red">Backend Error. Is Spring Boot running?</td></tr>`;
            }
        });
};

const renderTable = (tasks) => {
    const tbody = document.getElementById('taskTableBody');
    tbody.innerHTML = '';

    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#666">No active snipers. Add a course above!</td></tr>';
        return;
    }

    // Sort: Enabled first, then Name, then Section ID
    tasks.sort((a, b) => {
        if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
        if (a.courseDisplayName !== b.courseDisplayName) return a.courseDisplayName.localeCompare(b.courseDisplayName);
        return a.sectionId.localeCompare(b.sectionId);
    });

    tasks.forEach(task => {
        const row = document.createElement('tr');

        let badgeClass = 'bg-unknown';
        if (task.status === 'OPEN') badgeClass = 'bg-open';
        else if (task.status === 'WAITLISTED') badgeClass = 'bg-waitlist';
        else if (task.status === 'CLOSED') badgeClass = 'bg-closed';

        row.innerHTML = `
            <td><b>${task.courseDisplayName}</b></td>
            <td>${task.sectionId}</td>
            <td><span class="badge ${badgeClass}">${task.status || 'Checking...'}</span></td>
            <td>
                <label class="switch">
                    <input type="checkbox" ${task.enabled ? 'checked' : ''} onchange="toggleTask(${task.id})">
                    <span class="slider"></span>
                </label>
            </td>
            <td>
                <button class="btn-del" title="Delete entire course" onclick="deleteCourse('${task.courseDisplayName}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
};

// 2. Toggle Status
const toggleTask = (id) => {
    api.patch(`${TASK_API_URL}/${id}/toggle`)
        .catch(() => {
            alert('Failed to toggle status');
            loadTasks(); // revert UI on error
        });
};

// 3. Search & Add (Core Function)
const searchAndAdd = () => {
    if (!isLoggedIn()) {
        alert('Please login first.');
        return;
    }

    const input = document.getElementById('searchInput');
    const btn = document.getElementById('btnAdd');
    const courseName = input.value.trim();

    if (!courseName) {
        alert('Please enter a course name/section id (e.g. COMP SCI 577, 76101)');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = 'Searching...';

    api.post(TASK_API_URL, null, { params: { courseName: courseName } })
        .then(res => {
            alert(`Sniper deployed! Found ${res.data.data.length} sections.`);
            input.value = '';
            loadTasks();
        })
        .catch(err => {
            const msg = err.response?.data?.msg || 'Search failed. Check console.';
            alert('Error: ' + msg);
        })
        .finally(() => {
            btn.disabled = false;
            btn.innerHTML = '🔍 Snipe!';
        });
};

// 4. Delete Course
const deleteCourse = (courseDisplayName) => {
    if (!confirm(`Are you sure you want to delete ALL sections for "${courseDisplayName}"?`)) return;

    api.delete(TASK_API_URL, { params: { courseDisplayName: courseDisplayName } })
        .then(() => {
            loadTasks();
        })
        .catch(() => {
            alert('Delete failed.');
        });
};

// Init
window.onload = () => {
    updateAuthStatus();
    loadTasks();
};

window.login = login;
window.register = register;
window.logout = logout;
window.searchAndAdd = searchAndAdd;
window.loadTasks = loadTasks;
window.toggleTask = toggleTask;
window.deleteCourse = deleteCourse;
