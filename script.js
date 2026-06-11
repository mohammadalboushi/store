import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBB_U4C880PW4GxZd8FALv8yBSiP2mNeBY",
    authDomain: "malaboushi.firebaseapp.com",
    projectId: "malaboushi",
    storageBucket: "malaboushi.firebasestorage.app",
    messagingSenderId: "110336819350",
    appId: "1:110336819350:web:2b1b0488e72b811f0602b7",
    measurementId: "G-94ZT4TQYZY",
    databaseURL: "https://malaboushi-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let allAppsData = [];
let currentCategory = 'ALL';
let allCats = {};

// جلب الأقسام
onValue(ref(db, 'categories'), (snapshot) => {
    const val = snapshot.val();
    if(val) { 
        allCats = val; 
    } else {
        allCats = {};
    }
    renderTabs(); 
    renderApps(); 
});

// جلب إعدادات السايدبار
onValue(ref(db, 'settings'), (snapshot) => {
    const val = snapshot.val();
    if(val) {
        if(val.profileImg) {
            const imgEl = document.getElementById('sidebarProfileImg');
            if(imgEl) imgEl.src = val.profileImg;
        }
        const bioText = val.bio || "نبني الأفكار، وننظم الفوضى التقنية.";
        const bioEl = document.getElementById('sidebarBio');
        if(bioEl) bioEl.innerText = bioText;

        const linksContainer = document.getElementById('sidebarLinksContainer');
        if(linksContainer) {
            linksContainer.innerHTML = '';
            if(val.links && Array.isArray(val.links)) {
                val.links.forEach(link => {
                    let url = link.url;
                    if(url && !url.startsWith('http') && !url.startsWith('tel:') && !url.startsWith('mailto:') && !url.startsWith('fb:') && !url.startsWith('intent:') && !url.startsWith('vnd.youtube:')) {
                         if (!url.match(/^[0-9]+$/)) url = 'https://' + url;
                    }
                    const a = document.createElement('a');
                    a.className = 'sidebar-link';
                    a.href = url;
                    if(!url.startsWith('tel:') && !url.startsWith('fb:') && !url.startsWith('intent:') && !url.startsWith('vnd.youtube:')) {
                        a.target = "_blank"; 
                    }
                    a.innerHTML = `<i class="${link.icon}"></i> ${link.name}`;
                    linksContainer.appendChild(a);
                });
            } else {
                linksContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;">لا توجد روابط مضافة</div>';
            }
        }
    } else {
         const bioEl = document.getElementById('sidebarBio');
         if(bioEl) bioEl.innerText = "نبني الأفكار، وننظم الفوضى التقنية.";
    }
});

window.filterApps = (cat, btn) => {
    currentCategory = cat;
    renderTabs(); 
    setTimeout(() => {
        const activeBtn = document.querySelector('.tab-btn.active');
        if(activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 100);
    renderApps();
};

function renderTabs() {
    const container = document.getElementById('tabsList');
    if(!container) return;
    const sortedCats = Object.entries(allCats).sort(([,a], [,b]) => (a.order || 0) - (b.order || 0));
    let html = `<button class="tab-btn ${currentCategory === 'ALL' ? 'active' : ''}" onclick="filterApps('ALL', this)">🌟 الكل</button>`;
    sortedCats.forEach(([key, val]) => {
        if (!val.isHidden) {
            html += `<button class="tab-btn ${currentCategory === key ? 'active' : ''}" onclick="filterApps('${key}', this)">${val.icon} ${val.name}</button>`;
        }
    });
    container.innerHTML = html;
}

// جلب التطبيقات
onValue(ref(db, 'apps'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        allAppsData = Object.values(data)
            .filter(app => !app.isHidden)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
    } else {
        allAppsData = [];
    }
    renderApps();
});

function renderApps(searchTerm = "") {
    const container = document.getElementById('container');
    if(!container) return;
    container.innerHTML = '';
    const favs = JSON.parse(localStorage.getItem('favorites')) || [];

    const filtered = allAppsData.filter(app => {
        const parentCat = allCats[app.type];
        if (parentCat && parentCat.isHidden) return false;
        const matchCat = (currentCategory === 'ALL') || (app.type === currentCategory);
        const matchSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchCat && matchSearch;
    });

    const appCountEl = document.getElementById('appCount');
    if(appCountEl) appCountEl.innerText = filtered.length;

    if (filtered.length === 0) {
        container.innerHTML = "<div class='status'>لا توجد نتائج</div>";
        return;
    }

    filtered.forEach(app => {
        let badgeTxt = "APP"; 
        if(allCats[app.type]) badgeTxt = allCats[app.type].name;
        const isFav = favs.includes(app.name);
        const heartClass = isFav ? "fa-solid active" : "fa-regular";

        let actionText = "تحميل";
        let clickAction = `window.open('${app.link}', '_blank')`;
        
        if (app.type === 'WEBSITE') {
            actionText = "زيارة";
        } else if (app.type === 'FILE') {
            actionText = "👁️ مشاهدة";
            clickAction = `viewImage('${app.img}')`; 
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.setAttribute('onclick', clickAction);
        
        card.innerHTML = `
            <span class="mod-badge">${badgeTxt}</span>
            <button class="heart-btn" onclick="toggleFavorite(event, this, '${app.name}')">
                <i class="${heartClass} fa-heart"></i>
            </button>
            <img src="${app.img}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/564/564619.png'" loading="lazy">
            <div class="card-title">${app.name}</div>
            <div class="get-btn ${app.type === 'FILE' ? 'secondary' : ''}">${actionText}</div>
        `;
        container.appendChild(card);
    });
}

const searchInput = document.getElementById('searchInput');
if(searchInput) {
    searchInput.addEventListener('input', (e) => renderApps(e.target.value));
}

window.viewImage = (url) => {
    if(window.event) window.event.stopPropagation();
    const fullImg = document.getElementById('fullImage');
    const dlBtn = document.getElementById('downloadBtn');
    const imgViewer = document.getElementById('imgViewer');
    if(fullImg) fullImg.src = url;
    if(dlBtn) dlBtn.href = url;
    if(imgViewer) imgViewer.style.display = 'flex';
};

window.closeViewer = () => {
    const imgViewer = document.getElementById('imgViewer');
    if(imgViewer) imgViewer.style.display = 'none';
};

window.toggleTheme = () => {
    const btn = document.getElementById('themeBtn');
    if (document.body.hasAttribute('data-theme')) {
        document.body.removeAttribute('data-theme');
        if(btn) btn.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.setAttribute('data-theme', 'light');
        if(btn) btn.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('theme', 'light');
    }
};

if (localStorage.getItem('theme') === 'light') {
    document.body.setAttribute('data-theme', 'light');
    const themeBtn = document.getElementById('themeBtn');
    if(themeBtn) themeBtn.classList.replace('fa-moon', 'fa-sun');
}

window.openNav = () => { 
    document.getElementById("mySidebar").style.width = "280px"; 
    document.getElementById("overlay").style.display = "block"; 
    document.body.classList.add("no-scroll"); 
};

window.closeNav = () => { 
    document.getElementById("mySidebar").style.width = "0"; 
    document.getElementById("overlay").style.display = "none"; 
    document.body.classList.remove("no-scroll"); 
};

window.toggleFavorite = (e, btn, appName) => {
    if(e) e.stopPropagation(); 
    let favs = JSON.parse(localStorage.getItem('favorites')) || [];
    if (favs.includes(appName)) {
        favs = favs.filter(i => i !== appName);
        btn.classList.remove('active');
        btn.classList.replace('fa-solid', 'fa-regular');
    } else {
        favs.push(appName);
        btn.classList.add('active');
        btn.classList.replace('fa-regular', 'fa-solid');
    }
    localStorage.setItem('favorites', JSON.stringify(favs));
};
