// 全域變數與中文辭典
const 全域中文圖鑑 = {};
const 抽卡按鈕 = document.getElementById('抽卡按鈕');

// 初始化遊戲
async function 初始化遊戲() {
    const 查詢語句 = `query { pokemon_v2_pokemonspeciesname(where: {language_id: {_in: [4, 12]}}) { pokemon_species_id name language_id } }`;
    try {
        const 回應 = await fetch('https://beta.pokeapi.co/graphql/v1beta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: 查詢語句 })
        });
        const 資料 = await 回應.json();
        const 名稱列表 = 資料.data.pokemon_v2_pokemonspeciesname;
        名稱列表.sort((a, b) => a.language_id - b.language_id);
        名稱列表.forEach(項 => { 全域中文圖鑑[項.pokemon_species_id] = 項.name; });

        抽卡按鈕.innerText = '抽取 5 張卡片';
        抽卡按鈕.disabled = false;
        抽卡按鈕.addEventListener('click', 執行抽卡邏輯);
    } catch (錯誤) {
        抽卡按鈕.innerText = '連線失敗，請重整頁面';
    }
}

window.onload = 初始化遊戲;

// 取得隨機寶可夢
async function 取得隨機寶可夢資料() {
    const 編號 = Math.floor(Math.random() * 1025) + 1;
    const 回應 = await fetch(`https://pokeapi.co/api/v2/pokemon/${編號}`);
    const 資料 = await 回應.json();
    const 血量 = 資料.stats.find(s => s.stat.name === 'hp').base_stat;
    const 攻擊 = 資料.stats.find(s => s.stat.name === 'attack').base_stat;

    return {
        編號: 資料.id,
        英文名: 資料.name,
        中文名: 全域中文圖鑑[資料.id] || 資料.name.toUpperCase(),
        圖片: 資料.sprites.other['official-artwork'].front_default || 資料.sprites.front_default,
        屬性: 資料.types.map(t => t.type.name),
        目前血量: 血量 * 3,
        最大血量: 血量 * 3,
        攻擊力: 攻擊
    };
}

// 第一階段：抽卡與 3D 渲染
async function 執行抽卡邏輯() {
    抽卡按鈕.disabled = true;
    抽卡按鈕.innerText = '正在尋找寶可夢...';
    
    let 已選卡片 = [];
    let 已用屬性 = new Set();

    while (已選卡片.length < 5) {
        const 寶可夢 = await 取得隨機寶可夢資料();
        const 屬性重複 = 寶可夢.屬性.some(類別 => 已用屬性.has(類別));
        if (!屬性重複) {
            寶可夢.屬性.forEach(類別 => 已用屬性.add(類別));
            已選卡片.push(寶可夢);
        }
    }

    渲染3D旋轉木馬(已選卡片);
    抽卡按鈕.innerText = '重新抽取卡片';
    抽卡按鈕.disabled = false;
}

let 當前角度 = 0;
function 渲染3D旋轉木馬(卡片陣列) {
    document.getElementById('戰鬥舞台').style.display = 'none';
    document.getElementById('旋轉舞台區').style.display = 'block';
    const 容器 = document.getElementById('旋轉木馬');
    容器.innerHTML = '';
    當前角度 = 0;
    容器.style.transform = `translateZ(-280px) rotateY(0deg)`;

    卡片陣列.forEach((卡, 索引) => {
        const 旋轉角度 = 索引 * (360 / 卡片陣列.length);
        const 卡片元素 = document.createElement('div');
        卡片元素.className = '卡牌';
        卡片元素.style.transform = `rotateY(${旋轉角度}deg) translateZ(280px)`;
        
        卡片元素.innerHTML = `
            <img src="${卡.圖片}">
            <h3>${卡.中文名}</h3>
            <p>${卡.英文名}</p>
            <div>${卡.屬性.map(t => `<span class="屬性標籤">${t}</span>`).join('')}</div>
            <p>HP: ${卡.目前血量} | ATK: ${卡.攻擊力}</p>
        `;

        const 選擇鈕 = document.createElement('button');
        選擇鈕.innerText = '就決定是你了！';
        選擇鈕.onclick = () => 進入戰鬥準備(卡);
        卡片元素.appendChild(選擇鈕);
        容器.appendChild(卡片元素);
    });
    設置拖曳事件();
}

// 拖曳旋轉邏輯
let 拖曳中 = false;
let 起始X = 0;
let 最後角度 = 0;

function 設置拖曳事件() {
    const 場景 = document.getElementById('場景');
    const 開始拖曳 = (e) => {
        if (e.target.tagName === 'BUTTON') return;
        拖曳中 = true;
        起始X = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
        最後角度 = 當前角度;
    };
    const 移動中 = (e) => {
        if (!拖曳中) return;
        const x = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
        當前角度 = 最後角度 + (x - 起始X) * 0.4;
        document.getElementById('旋轉木馬').style.transform = `translateZ(-280px) rotateY(${當前角度}deg)`;
    };
    場景.onmousedown = 場景.ontouchstart = 開始拖曳;
    window.onmousemove = window.ontouchmove = 移動中;
    window.onmouseup = window.ontouchend = () => { 拖曳中 = false; };
}

// 第二階段：戰鬥
let 玩家寶可夢 = null, 對手寶可夢 = null;

async function 進入戰鬥準備(選定卡片) {
    玩家寶可夢 = 選定卡片;
    document.getElementById('旋轉舞台區').style.display = 'none';
    抽卡按鈕.disabled = true;
    對手寶可夢 = await 取得隨機寶可夢資料();
    抽卡按鈕.disabled = false;

    document.getElementById('戰鬥舞台').style.display = 'flex';
    渲染戰鬥位置('玩家卡牌位置', 玩家寶可夢, '【玩家】');
    渲染戰鬥位置('對手卡牌位置', 對手寶可夢, '【對手】');

    const 紀錄 = document.getElementById('戰鬥紀錄');
    紀錄.innerHTML = `<p>挑戰者出現了！${對手寶可夢.中文名} 發起了戰鬥！</p>`;
    document.getElementById('開始戰鬥按鈕').style.display = 'block';
    document.getElementById('開始戰鬥按鈕').onclick = 執行戰鬥過程;
}

function 渲染戰鬥位置(位置ID, 寶可夢, 稱謂) {
    const 區塊 = document.getElementById(位置ID);
    區塊.innerHTML = `
        <div class="戰鬥卡牌">
            <h4>${稱謂}</h4>
            <img src="${寶可夢.圖片}">
            <h3>${寶可夢.中文名}</h3>
            <div class="血條容器"><div class="血條填充" id="${位置ID}-血條"></div></div>
            <p id="${位置ID}-文字">HP: ${寶可夢.目前血量} / ${寶可夢.最大血量}</p>
        </div>
    `;
}

async function 執行戰鬥過程() {
    document.getElementById('開始戰鬥按鈕').style.display = 'none';
    抽卡按鈕.disabled = true;
    const 紀錄 = document.getElementById('戰鬥紀錄');
    let 玩家回合 = 玩家寶可夢.目前血量 <= 對手寶可夢.目前血量;

    while (玩家寶可夢.目前血量 > 0 && 對手寶可夢.目前血量 > 0) {
        await new Promise(r => setTimeout(r, 800));
        const 攻擊方 = 玩家回合 ? 玩家寶可夢 : 對手寶可夢;
        const 防禦方 = 玩家回合 ? 對手寶可夢 : 玩家寶可夢;
        const 防禦位置 = 玩家回合 ? '對手卡牌位置' : '玩家卡牌位置';

        const 隨機傷害 = Math.max(1, Math.floor(攻擊方.攻擊力 * (0.85 + Math.random() * 0.3)));
        防禦方.目前血量 = Math.max(0, 防禦方.目前血量 - 隨機傷害);

        紀錄.innerHTML += `<p>【${攻擊方.中文名}】攻擊！造成 <strong>${隨機傷害}</strong> 點傷害。</p>`;
        紀錄.scrollTop = 紀錄.scrollHeight;

        const 血量百分比 = (防禦方.目前血量 / 防禦方.最大血量) * 100;
        document.getElementById(`${防禦位置}-血條`).style.width = `${血量百分比}%`;
        document.getElementById(`${防禦位置}-文字`).innerText = `HP: ${防禦方.目前血量} / ${防禦方.最大血量}`;
        
        玩家回合 = !玩家回合;
    }

    await new Promise(r => setTimeout(r, 500));
    const 贏家 = 玩家寶可夢.目前血量 > 0 ? 玩家寶可夢.中文名 : 對手寶可夢.中文名;
    紀錄.innerHTML += `<p class="勝負文字">戰鬥結束！獲勝的是：${贏家}！</p>`;
    抽卡按鈕.disabled = false;
}