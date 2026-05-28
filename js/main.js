// ---------- 用户认证状态 ----------
let currentUser = null;
let smsCodeCache = '';          // 临时存储发送的验证码
let countdownInterval = null;

// 显示 toast 消息（与之前相同）
function showToast(message, isError = false) {
    const existing = document.querySelector('.toast-message');
    if(existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-heart'}" style="margin-right: 8px;"></i>${message}`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2200);
}

// ---------- 真实 OAuth 登录（通过后端） ----------
async function fetchCurrentUser() {
    try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (res.ok) {
            currentUser = await res.json();
        } else {
            currentUser = null;
        }
    } catch (err) {
        currentUser = null;
    }
    updateNavBar();
}

async function logout() {
    window.location.href = '/logout';
}

// ---------- 手机号登录（模拟） ----------
// 获取已注册手机号列表
function getRegisteredPhones() {
    const stored = localStorage.getItem('registered_phones');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch(e) { return []; }
    }
    return [];
}

// 保存手机号到列表（新注册）
function addRegisteredPhone(phone) {
    const phones = getRegisteredPhones();
    if (!phones.includes(phone)) {
        phones.push(phone);
        localStorage.setItem('registered_phones', JSON.stringify(phones));
    }
}

// 检查手机号是否已注册
function isPhoneRegistered(phone) {
    return getRegisteredPhones().includes(phone);
}

// 打开手机登录弹窗
function openPhoneModal() {
    const modal = document.getElementById('phoneLoginModal');
    if (modal) modal.style.display = 'flex';
}

function closePhoneModal() {
    const modal = document.getElementById('phoneLoginModal');
    if (modal) modal.style.display = 'none';
    // 重置表单
    const phoneInput = document.getElementById('phoneNumber');
    const smsInput = document.getElementById('smsCode');
    if (phoneInput) phoneInput.value = '';
    if (smsInput) smsInput.value = '';
    if (countdownInterval) clearInterval(countdownInterval);
    const btn = document.getElementById('getSmsCodeBtn');
    if (btn) {
        btn.disabled = false;
        btn.textContent = '获取验证码';
    }
}

// 模拟发送验证码
function sendSmsCode(phone) {
    // 简单校验手机号格式（11位数字）
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
        showToast('请输入有效的11位手机号', true);
        return false;
    }
    // 生成6位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    smsCodeCache = code;
    showToast(`【模拟短信】验证码：${code}，请在60秒内输入`, false);
    return true;
}

// 开始倒计时（60秒）
function startCountdown(btn) {
    let seconds = 60;
    btn.disabled = true;
    countdownInterval = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(countdownInterval);
            btn.disabled = false;
            btn.textContent = '获取验证码';
        } else {
            btn.textContent = `${seconds}秒后重试`;
        }
    }, 1000);
}

// 处理手机登录/注册
async function handleGetSmsCode() {
    const phone = document.getElementById('phoneNumber').value.trim();
    if (!/^1[3-9]\d{9}$/.test(phone)) {
        showToast('请输入有效的11位手机号', true);
        return;
    }
    const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (res.ok) {
        showToast(`验证码已发送至 ${phone.slice(0,3)}****${phone.slice(-4)}`, false);
        // 模拟时，data.code 包含验证码，这里打印到控制台方便测试
        if (data.code) console.log('【模拟验证码】', data.code);
        startCountdown(document.getElementById('getSmsCodeBtn'));
    } else {
        showToast(data.error || '发送失败', true);
    }
}

async function handlePhoneLogin() {
    const phone = document.getElementById('phoneNumber').value.trim();
    const code = document.getElementById('smsCode').value.trim();
    if (!phone || !code) {
        showToast('请填写手机号和验证码', true);
        return;
    }
    const res = await fetch('/api/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, userCode: code })
    });
    const data = await res.json();
    if (!res.ok) {
        showToast(data.error || '登录失败', true);
        return;
    }
    // 登录成功，刷新用户状态（从 /api/me 获取）
    await fetchCurrentUser();
    closePhoneModal();
    showToast('登录成功', false);
}




// 初始化手机登录相关事件
function initPhoneLogin() {
    // 页面加载时检查是否有手机登录用户存储在 localStorage 中
    const storedPhoneUser = localStorage.getItem('phone_user');
    if (storedPhoneUser && !currentUser) {
        try {
            currentUser = JSON.parse(storedPhoneUser);
            updateNavBar();
        } catch(e) {}
    }

    // 获取验证码按钮事件
    const getCodeBtn = document.getElementById('getSmsCodeBtn');
    if (getCodeBtn) {
        getCodeBtn.addEventListener('click', () => {
            const phone = document.getElementById('phoneNumber').value.trim();
            if (sendSmsCode(phone)) {
                startCountdown(getCodeBtn);
            }
        });
    }

    // 登录/注册按钮事件
    const loginBtn = document.getElementById('phoneLoginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handlePhoneLogin);
    }

    // 点击模态框背景关闭
    const modal = document.getElementById('phoneLoginModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closePhoneModal();
        });
    }
}

// ---------- 渲染右上角 UI（融合社交登录和手机登录） ----------
function updateNavBar() {
    const container = document.getElementById('userMenuContainer');
    if (!container) return;
    if (!currentUser) {
        // 未登录：显示三个登录入口（手机、Facebook、LinkedIn）
        container.innerHTML = `
            <div style="display: flex; gap: 12px;">
                <button id="phoneLoginBtnTop" class="nav-btn" style="background:#34b7f1; color:white; border:none;"><i class="fas fa-mobile-alt"></i> 手机登录</button>
                <a href="/auth/facebook" class="nav-btn" style="background:#1877F2; color:white; border:none;"><i class="fab fa-facebook-f"></i> Facebook</a>
                <a href="/auth/linkedin" class="nav-btn" style="background:#0A66C2; color:white; border:none;"><i class="fab fa-linkedin-in"></i> LinkedIn</a>
            </div>
        `;
        const phoneBtnTop = document.getElementById('phoneLoginBtnTop');
        if (phoneBtnTop) {
            phoneBtnTop.addEventListener('click', (e) => {
                e.preventDefault();
                openPhoneModal();
            });
        }
    } else {
        // 已登录：显示用户菜单
        const providerIcon = currentUser.provider === 'phone' ? 'fas fa-mobile-alt' : (currentUser.provider === 'facebook' ? 'fab fa-facebook' : 'fab fa-linkedin');
        const providerName = currentUser.provider === 'phone' ? '手机号' : (currentUser.provider === 'facebook' ? 'Facebook' : 'LinkedIn');
        const initials = currentUser.name ? currentUser.name.charAt(0) : 'U';
        container.innerHTML = `
            <div class="user-menu" id="userMenu">
                <div class="user-avatar">${initials}</div>
                <div class="dropdown-menu">
                    <div class="dropdown-header">
                        <p>${currentUser.name}</p>
                        <span><i class="${providerIcon}"></i> via ${providerName}</span>
                    </div>
                    <div class="dropdown-item" id="profileItem"><i class="fas fa-user-circle"></i> 我的资料</div>
                    <div class="dropdown-item" id="likedItem"><i class="fas fa-heart"></i> 心动记录</div>
                    <div class="dropdown-item logout-item" id="logoutItem"><i class="fas fa-sign-out-alt"></i> 登出</div>
                </div>
            </div>
        `;
        const userMenu = document.getElementById('userMenu');
        const toggleDropdown = () => userMenu.classList.toggle('active');
        userMenu.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(); });
        document.getElementById('logoutItem')?.addEventListener('click', (e) => {
            e.stopPropagation();
            // 清除手机登录存储和当前用户
            localStorage.removeItem('phone_user');
            currentUser = null;
            // 如果是从 OAuth 登录的，需要调用后端登出
            if (window.location.pathname !== '/logout') {
                fetch('/logout', { method: 'GET', credentials: 'include' }).then(() => {
                    location.reload();
                }).catch(() => location.reload());
            } else {
                updateNavBar();
                renderCards();
                showToast("您已安全登出", false);
            }
        });
        document.getElementById('profileItem')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showToast("✨ 资料完善中，高端认证即将开放", false);
            userMenu.classList.remove('active');
        });
        document.getElementById('likedItem')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showToast("💖 你的心动嘉宾都在这里", false);
            userMenu.classList.remove('active');
        });
        const closeDropdown = (ev) => {
            if (!userMenu.contains(ev.target)) userMenu.classList.remove('active');
        };
        document.removeEventListener('click', closeDropdown);
        document.addEventListener('click', closeDropdown);
    }
}

// ---------- 原有的会员卡片数据（保持不变） ----------
const usersData = [
    { id: 1, name: "陈雨桐", age: 28, gender: "女", occupation: "私募基金副总裁", city: "上海", bio: "金融精英，热爱马术和古典音乐，期待精神同频的伴侣。", likesCount: 47, isLiked: false, avatarColor: "6c5b7b" },
    { id: 2, name: "赵禹博", age: 33, gender: "男", occupation: "建筑设计总监", city: "杭州", bio: "留英建筑学硕士，痴迷摄影与旅行，愿寻一同看世界的你。", likesCount: 32, isLiked: false, avatarColor: "2c6e9e" },
    { id: 3, name: "林晚晴", age: 26, gender: "女", occupation: "双语主持人", city: "北京", bio: "阳光开朗，热衷公益，期待一份真诚温暖的长期关系。", likesCount: 68, isLiked: false, avatarColor: "bc9a6c" },
    { id: 4, name: "江一舟", age: 39, gender: "男", occupation: "科技公司CTO", city: "深圳", bio: "理性与浪漫并存，徒步爱好者，希望遇到灵魂伴侣。", likesCount: 21, isLiked: false, avatarColor: "4a6b7f" },
    { id: 5, name: "沈清如", age: 31, gender: "女", occupation: "艺术品策展人", city: "成都", bio: "喜欢美术馆与下午茶，温柔坚定，期待细水长流的感情。", likesCount: 53, isLiked: false, avatarColor: "b28b5e" },
    { id: 6, name: "许泽言", age: 35, gender: "男", occupation: "投行董事", city: "香港", bio: "高尔夫与威士忌，上进且顾家，期待相同价值观的你。", likesCount: 44, isLiked: false, avatarColor: "3a6b52" },
    { id: 7, name: "宋乐怡", age: 27, gender: "女", occupation: "独立珠宝设计师", city: "苏州", bio: "浪漫细腻，养了一只布偶猫，期待温暖可靠的归宿。", likesCount: 59, isLiked: false, avatarColor: "c2835c" },
    { id: 8, name: "周明远", age: 42, gender: "男", occupation: "医疗集团合伙人", city: "广州", bio: "马拉松爱好者，沉稳豁达，愿以真心换真心。", likesCount: 38, isLiked: false, avatarColor: "2f5d6e" },
    { id: 9, name: "叶知秋", age: 29, gender: "女", occupation: "律师", city: "南京", bio: "理性也爱撒娇，喜欢爵士乐，想谈一场双向奔赴的恋爱。", likesCount: 45, isLiked: false, avatarColor: "b2594b" },
    { id: 10, name: "程以安", age: 36, gender: "男", occupation: "国际品牌PR", city: "上海", bio: "幽默绅士，钟爱烹饪与电影，寻找一起创造美好日常的你。", likesCount: 29, isLiked: false, avatarColor: "4e6e5e" }
];

function getAvatarUrl(name, bgColor) {
    let color = bgColor || "b3a582";
    return `https://ui-avatars.com/api/?background=${color}&color=fff&bold=true&size=120&length=2&name=${encodeURIComponent(name)}`;
}

let currentGenderFilter = "all";
let currentAgeFilter = "all";
function isAgeInRange(age, rangeStr) {
    if (rangeStr === "all") return true;
    if (rangeStr === "20-30") return age >= 20 && age <= 30;
    if (rangeStr === "31-40") return age >= 31 && age <= 40;
    if (rangeStr === "41-50") return age >= 41 && age <= 50;
    return true;
}
function getFilteredUsers() {
    return usersData.filter(user => (currentGenderFilter === "all" || user.gender === currentGenderFilter) && isAgeInRange(user.age, currentAgeFilter));
}
function toggleLike(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    user.isLiked = !user.isLiked;
    user.likesCount = Math.max(0, user.likesCount + (user.isLiked ? 1 : -1));
    showToast(user.isLiked ? `✨ 你对 ${user.name} 表达了倾心 ✨` : `💔 已取消对 ${user.name} 的心动`);
    renderCards();
}
function renderCards() {
    const container = document.getElementById('cardsContainer');
    const filtered = getFilteredUsers();
    if (!filtered.length) {
        container.innerHTML = `<div class="no-result"><i class="fas fa-search" style="font-size: 2rem;"></i><br>暂无符合条件的会员</div>`;
        return;
    }
    let html = '';
    filtered.forEach(user => {
        const avatarUrl = getAvatarUrl(user.name, user.avatarColor);
        html += `<div class="member-card" data-id="${user.id}">
            <div class="card-img"><img class="avatar" src="${avatarUrl}"><div class="badge"><i class="fas fa-check-circle"></i> 实名认证</div></div>
            <div class="card-info">
                <div class="name-age"><span class="name">${user.name}</span><span class="age">${user.age}岁</span></div>
                <div class="occupation"><i class="fas fa-briefcase"></i> ${user.occupation}</div>
                <div class="location"><i class="fas fa-map-marker-alt"></i> ${user.city}</div>
                <div class="bio">${user.bio.length > 55 ? user.bio.slice(0,55)+'…' : user.bio}</div>
                <div class="card-footer"><button class="like-btn ${user.isLiked ? 'liked' : ''}" data-id="${user.id}"><i class="fas fa-heart"></i><span class="like-count">${user.likesCount}</span></button><span class="view-detail"><i class="far fa-comment-dots"></i> 牵线</span></div>
            </div></div>`;
    });
    container.innerHTML = html;
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLike(parseInt(btn.dataset.id));
        });
    });
}
function updateFiltersAndRender() {
    currentGenderFilter = document.getElementById('filterGender').value;
    currentAgeFilter = document.getElementById('filterAge').value;
    renderCards();
}
function resetFilters() {
    document.getElementById('filterGender').value = 'all';
    document.getElementById('filterAge').value = 'all';
    currentGenderFilter = 'all';
    currentAgeFilter = 'all';
    renderCards();
    showToast("筛选已重置");
}
function initListeners() {
    document.getElementById('filterGender')?.addEventListener('change', updateFiltersAndRender);
    document.getElementById('filterAge')?.addEventListener('change', updateFiltersAndRender);
    document.getElementById('resetFilterBtn')?.addEventListener('click', resetFilters);
}

// 页面初始化
async function init() {
    initListeners();
    initPhoneLogin();
    // 尝试从后端获取 OAuth 用户（如果有）
    await fetchCurrentUser();
    // 如果 fetchCurrentUser 没取到，但已有手机登录用户，会通过 initPhoneLogin 中的 localStorage 恢复，但可能被覆盖，所以在此之后再检查一次
    if (!currentUser) {
        const storedPhone = localStorage.getItem('phone_user');
        if (storedPhone) {
            try {
                currentUser = JSON.parse(storedPhone);
                updateNavBar();
            } catch(e) {}
        }
    }
    renderCards();
}

init();