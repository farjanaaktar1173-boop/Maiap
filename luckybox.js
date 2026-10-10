/* ⭐ LUCKY BOX — Demo */

let _luckyTimerId = null;

function getLuckyBoxKey(){ return `moi_luckybox_${ROOM_ID}`; }

function getLuckyBoxes(){
    try { return JSON.parse(localStorage.getItem(getLuckyBoxKey()) || '[]'); } catch(e){ return []; }
}
function saveLuckyBoxes(boxes){
    try { localStorage.setItem(getLuckyBoxKey(), JSON.stringify(boxes)); } catch(e){}
    renderMessageFeed();
}

window.openLuckyBoxSheet = () => {
    if (!isAdminOrOwner()){ toastMsg('শুধু Owner/Admin Lucky Box পাঠাতে পারবে'); return; }
    closeSheet();
    $('sheetBackdrop').classList.add('active');
    $('luckyBoxSheet').classList.add('active');
    const bal = myProfile.diamonds || 0;
    $('luckyBalance').textContent = bal;
    ['luckyTimer','luckyDiamonds','luckyQuantity'].forEach(groupId => {
        const group = $(groupId);
        if (!group) return;
        group.querySelectorAll('.lucky-chip').forEach(chip => {
            chip.onclick = () => {
                group.querySelectorAll('.lucky-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            };
        });
    });
};

function _getChipValue(groupId){
    const group = $(groupId);
    if (!group) return 0;
    const active = group.querySelector('.lucky-chip.active');
    return active ? +active.dataset.v : 0;
}

window.sendLuckyBox = () => {
    if (!isAdminOrOwner()){ toastMsg('শুধু Owner/Admin পারবে'); return; }
    const timer = _getChipValue('luckyTimer');
    const total = _getChipValue('luckyDiamonds');
    const qty = _getChipValue('luckyQuantity');
    if (total <= 0 || qty <= 0){ toastMsg('❌ সেটিংস চেক করুন'); return; }
    const bal = myProfile.diamonds || 0;
    if (bal < total){ toastMsg('❌ পর্যাপ্ত ডায়মন্ড নেই!'); return; }
    myProfile.diamonds -= total;
    const tax = Math.floor(total * 0.05);
    const pool = total - tax;
    const box = {
        id: 'lb_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
        senderUid: myProfile.uid,
        senderName: myProfile.name,
        senderAvatar: myProfile.avatar || GUEST_AVATAR,
        total, tax, pool, qty,
        timerMin: timer,
        startedAt: Date.now(),
        expiresAt: Date.now() + timer * 60 * 1000,
        claimedBy: [],
        winners: [],
        createdAt: Date.now()
    };
    const boxes = getLuckyBoxes();
    boxes.push(box);
    saveLuckyBoxes(boxes);
    closeSheet();
    toastMsg(`🎁 Lucky Box পাঠানো হয়েছে (${pool} 💎)`);
    renderMessageFeed();
    pushActivityLuckyBox(box);
    startLuckyBoxTimer();
};

function pushActivityLuckyBox(box){
    if (!myProfile) return;
    const el = document.createElement('div');
    el.className = 'activity-item';
    el.innerHTML = `🎁 ${esc(box.senderName)} Lucky Box পাঠিয়েছেন (${box.pool}💎)`;
    const strip = $('activityStrip');
    if (!strip) return;
    strip.appendChild(el);
    setTimeout(() => { el.style.transition='opacity .4s'; el.style.opacity='0'; setTimeout(()=>el.remove(),400); }, 5000);
}

/* ⭐ Box rendering in message feed */
function renderLuckyBoxCard(box){
    const now = Date.now();
    const left = Math.max(0, box.expiresAt - now);
    const totalTime = box.timerMin * 60 * 1000;
    const expired = now >= box.expiresAt;
    const full = box.winners.length >= box.qty;
    const myWin = box.winners.find(w => w.uid === myProfile?.uid);
    const myClaimed = box.claimedBy.includes(myProfile?.uid);
    const gone = expired && (now - box.expiresAt > 2 * 60 * 1000);

    let statusHTML = '';
    if (myWin){
        statusHTML = `<div class="lb-win">🎉 আপনি পেয়েছেন ${myWin.amount} 💎</div>`;
    } else if (myClaimed){
        statusHTML = `<div class="lb-lose">😢 আপনি কিছু পাননি</div>`;
    } else if (full){
        statusHTML = `<div class="lb-full">✅ সব ডায়মন্ড বিতরণ হয়েছে</div>`;
    } else if (expired){
        statusHTML = `<div class="lb-expired">⌛ সময় শেষ</div>`;
    } else {
        const mins = Math.floor(left / 60000);
        const secs = Math.floor((left % 60000) / 1000);
        statusHTML = `<div class="lb-timer" data-box="${box.id}" data-expires="${box.expiresAt}">⏱️ ${mins}:${String(secs).padStart(2,'0')}</div>`;
    }

    const winnersHTML = box.winners.length
        ? `<div class="lb-winners">${box.winners.map(w => `<div class="lb-win-row"><img src="${w.avatar}"><span>${esc(w.name)}</span><b>+${w.amount}💎</b></div>`).join('')}</div>`
        : '';

    return `<div class="msg-item lb-card ${gone ? 'lb-gone' : ''}" data-box="${box.id}">
        <div class="lb-head">
            <img class="lb-sender-av" src="${box.senderAvatar}">
            <div class="lb-head-info">
                <div class="lb-sender-name">${esc(box.senderName)}</div>
                <div class="lb-sender-sub">🎁 Lucky Box · ${box.pool} 💎 · ${box.qty} জন</div>
            </div>
        </div>
        <div class="lb-body">
            <div class="lb-icon">🎁</div>
            <div class="lb-amount">${box.pool} <span>💎</span></div>
            <div class="lb-sub">${box.qty} জন পাবে · ${box.timerMin} min</div>
            ${statusHTML}
            ${winnersHTML}
        </div>
        ${(!myClaimed && !expired && !full) ? `<button class="lb-open-btn" onclick="tryOpenLuckyBox('${box.id}')">Open</button>` : ''}
        ${(expired && !myClaimed && !full) ? `<button class="lb-open-btn" onclick="tryOpenLuckyBox('${box.id}')">Open</button>` : ''}
    </div>`;
}

window.tryOpenLuckyBox = (boxId) => {
    if (!myProfile){ toastMsg('লগইন করুন'); return; }
    const boxes = getLuckyBoxes();
    const idx = boxes.findIndex(b => b.id === boxId);
    if (idx === -1) return;
    const box = boxes[idx];
    const now = Date.now();
    if (now < box.expiresAt){
        const left = Math.ceil((box.expiresAt - now) / 1000);
        toastMsg(`⏱️ আরো ${left}s অপেক্ষা করুন`);
        return;
    }
    if (box.claimedBy.includes(myProfile.uid)){ toastMsg('আপনি ইতিমধ্যে খুলেছেন'); return; }
    box.claimedBy.push(myProfile.uid);
    const remainingSlots = box.qty - box.winners.length;
    if (remainingSlots <= 0){
        saveLuckyBoxes(boxes);
        toastMsg('😢 আপনি কিছু পাননি');
        renderMessageFeed();
        return;
    }
    const minAmount = Math.max(1, Math.floor(box.pool / (box.qty * 3)));
    const maxAmount = Math.max(minAmount + 1, Math.floor(box.pool / 2));
    let won = false;
    let amount = 0;
    if (Math.random() < 0.65){
        won = true;
        amount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
        const alreadyGiven = box.winners.reduce((s, w) => s + w.amount, 0);
        const left = box.pool - alreadyGiven;
        if (amount > left) amount = left;
        if (amount < 1) { won = false; amount = 0; }
    }
    if (won){
        box.winners.push({
            uid: myProfile.uid,
            name: myProfile.name,
            avatar: myProfile.avatar || GUEST_AVATAR,
            amount,
            ts: now
        });
        myProfile.diamonds = (myProfile.diamonds || 0) + amount;
        toastMsg(`🎉 আপনি পেয়েছেন ${amount} 💎`);
    } else {
        toastMsg('😢 আপনি কিছু পাননি');
    }
    saveLuckyBoxes(boxes);
    renderMessageFeed();
};

/* ⭐ Countdown timer for message feed */
function startLuckyBoxTimer(){
    if (_luckyTimerId) return;
    _luckyTimerId = setInterval(() => {
        const now = Date.now();
        let needRerender = false;
        document.querySelectorAll('.lb-timer').forEach(el => {
            const exp = +el.dataset.expires;
            const left = exp - now;
            if (left <= 0){
                needRerender = true;
                return;
            }
            const m = Math.floor(left / 60000);
            const s = Math.floor((left % 60000) / 1000);
            el.textContent = `⏱️ ${m}:${String(s).padStart(2,'0')}`;
        });
        /* Auto cleanup: remove boxes that are 2 min past expiry */
        const boxes = getLuckyBoxes();
        const filtered = boxes.filter(b => now - b.expiresAt < 2 * 60 * 1000);
        if (filtered.length !== boxes.length){
            saveLuckyBoxes(filtered);
        }
        if (needRerender) renderMessageFeed();
    }, 1000);
}

/* ⭐ Hook into message feed render — display lucky boxes above messages */
function injectLuckyBoxesIntoFeed(){
    const list = $('messagesList');
    if (!list) return;
    const boxes = getLuckyBoxes();
    if (!boxes.length) return;
    const now = Date.now();
    const active = boxes.filter(b => now - b.expiresAt < 2 * 60 * 1000);
    if (!active.length) return;
    const html = active.map(renderLuckyBoxCard).join('');
    list.innerHTML = html + list.innerHTML;
}