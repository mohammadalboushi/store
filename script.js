import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

        const firebaseConfig = {
            apiKey: "AIzaSyC_iEb4UhUREVJ2mfj00BounPVaeGQr7wI",
            authDomain: "mohammadalboushi-e9231.firebaseapp.com",
            projectId: "mohammadalboushi-e9231",
            databaseURL: "https://mohammadalboushi-e9231-default-rtdb.firebaseio.com/",
            appId: "1:236925802081:web:2e26094ab5ecdf988f3c20"
        };

        const app = initializeApp(firebaseConfig);
        const db = getDatabase(app);

        let allAppsData = [];
        let currentCategory = 'ALL';
        let allCats = {};

        // 1. جلب الأقسام
        onValue(ref(db, 'categories'), (snapshot) => {
            const val = snapshot.val();
            if(val) { allCats = val; renderTabs(); renderApps(); } 
        });

        // 2. جلب إعدادات السايدبار (الصورة، البايو، والروابط)
        onValue(ref(db, 'settings'), (snapshot) => {
            const val = snapshot.val();
            if(val) {
                // الصورة
                if(val.profileImg) {
                    document.getElementById('sidebarProfileImg').src = val.profileImg;
                }

                // البايو (الوصف)
                const bioText = val.bio || "نبني الأفكار، وننظم الفوضى التقنية.";
                document.getElementById('sidebarBio').innerText = bioText;

                // الروابط
                const linksContainer = document.getElementById('sidebarLinksContainer');
                linksContainer.innerHTML = '';
                
                if(val.links && Array.isArray(val.links)) {
                    val.links.forEach(link => {
                        let url = link.url;
                        // منطق إضافة https الذكي (يتجاهل الروابط الخاصة مثل intent و fb)
                        if(url && !url.startsWith('http') && !url.startsWith('tel:') && !url.startsWith('mailto:') && !url.startsWith('fb:') && !url.startsWith('intent:') && !url.startsWith('vnd.youtube:')) {
                             if (!url.match(/^[0-9]+$/)) url = 'https://' + url;
                        }

                        const a = document.createElement('a');
                        a.className = 'sidebar-link';
                        a.href = url;
                        // فتح في نافذة جديدة إلا إذا كان رابط نظام (اتصال، تطبيق)
                        if(!url.startsWith('tel:') && !url.startsWith('fb:') && !url.startsWith('intent:') && !url.startsWith('vnd.youtube:')) {
                            a.target = "_blank"; 
                        }
                        
                        a.innerHTML = `<i class="${link.icon}"></i> ${link.name}`;
                        linksContainer.appendChild(a);
                    });
                } else {
                    linksContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;">لا توجد روابط مضافة</div>';
                }
            } else {
                // في حال كانت قاعدة البيانات فارغة تماماً
                 document.getElementById('sidebarBio').innerText = "نبني الأفكار، وننظم الفوضى التقنية.";
            }
        });

        function renderTabs() {
            const container = document.getElementById('tabsList');
            const sortedCats = Object.entries(allCats).sort(([,a], [,b]) => a.order - b.order);
            
            let html = `<button class="tab-btn ${currentCategory === 'ALL' ? 'active' : ''}" onclick="filterApps('ALL', this)">🌟 الكل</button>`;
            
            sortedCats.forEach(([key, val]) => {
                // إخفاء التبويب إذا كان القسم مقفلاً
                if (!val.isHidden) {
                    html += `<button class="tab-btn ${currentCategory === key ? 'active' : ''}" onclick="filterApps('${key}', this)">${val.icon} ${val.name}</button>`;
                }
            });
            
            container.innerHTML = html;
        }

        onValue(ref(db, 'apps'), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                allAppsData = Object.values(data)
                    .filter(app => !app.isHidden)
                    .sort((a, b) => (a.order || 0) - (b.order || 0));
                renderApps();
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

        function renderApps(searchTerm = "") {
            const container = document.getElementById('container');
            container.innerHTML = '';
            const favs = JSON.parse(localStorage.getItem('favorites')) || [];

            // الفلترة مع مراعاة الأقسام المخفية
            const filtered = allAppsData.filter(app => {
                const parentCat = allCats[app.type];
                if (parentCat && parentCat.isHidden) return false;

                const matchCat = (currentCategory === 'ALL') || (app.type === currentCategory);
                const matchSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase());
                return matchCat && matchSearch;
            });

            document.getElementById('appCount').innerText = filtered.length;

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
                    <button class="heart-btn" onclick="toggleFavorite(this, '${app.name}')">
                        <i class="${heartClass} fa-heart"></i>
                    </button>
                    <img src="${app.img}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/564/564619.png'" loading="lazy">
                    <div class="card-title">${app.name}</div>
                    <div class="get-btn ${app.type === 'FILE' ? 'secondary' : ''}">${actionText}</div>
                `;
                container.appendChild(card);
            });
        }

        document.getElementById('searchInput').addEventListener('input', (e) => renderApps(e.target.value));

        window.viewImage = (url) => {
            if(window.event) window.event.stopPropagation();
            document.getElementById('fullImage').src = url;
            document.getElementById('downloadBtn').href = url;
            document.getElementById('imgViewer').style.display = 'flex';
        }
        
        window.closeViewer = () => {
            document.getElementById('imgViewer').style.display = 'none';
        }

        window.toggleTheme = () => {
            const btn = document.getElementById('themeBtn');
            if (document.body.hasAttribute('data-theme')) {
                document.body.removeAttribute('data-theme');
                btn.classList.replace('fa-sun', 'fa-moon');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.setAttribute('data-theme', 'light');
                btn.classList.replace('fa-moon', 'fa-sun');
                localStorage.setItem('theme', 'light');
            }
        };
        if (localStorage.getItem('theme') === 'light') {
            document.body.setAttribute('data-theme', 'light');
            document.getElementById('themeBtn').classList.replace('fa-moon', 'fa-sun');
        }

        window.openNav = () => { document.getElementById("mySidebar").style.width = "280px"; document.getElementById("overlay").style.display = "block"; document.body.classList.add("no-scroll"); };
        window.closeNav = () => { document.getElementById("mySidebar").style.width = "0"; document.getElementById("overlay").style.display = "none"; document.body.classList.remove("no-scroll"); };
        
        window.toggleFavorite = (btn, appName) => {
            event.stopPropagation(); 
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