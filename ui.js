function showSheetOptions(title, options){
    $('sheetTitle').textContent = title;
    $('sheetOptions').innerHTML = options.map((o, k) => `<div class="sheet-option ${o.danger?'danger':''} ${o.cls||''}" data-k="${k}"><span class="opt-icon"><i class="fa-solid ${o.icon}"></i></span><span class="opt-label">${o.label}</span><i class="fa-solid fa-chevron-right opt-arrow"></i></div>`).join('');
    $('sheetOptions').querySelectorAll('.sheet-option').forEach(el => el.addEventListener('click', () => options[+el.dataset.k].action()));
    $('sheetBackdrop').classList.add('active'); $('seatSheet').classList.add('active');
}

window.closeSheet = () => {
    $('sheetBackdrop').classList.remove('active');
    ['seatSheet','msgSheet','giftPickerSheet','chatSheet','emojiSheet','gifterSheet','settingsSheet','gameSheet'].forEach(id => { const el = $(id); if (el){ el.classList.remove('active','fullscreen'); } });
    closePermissionSheet();
    const cf = $('chatFrame'); if (cf) cf.src = 'about:blank';
    const gf = $('gameFrame'); if (gf) gf.src = 'about:blank';
};
window.closePermissionSheet = () => { $('permissionSheet').classList.remove('active'); $('sheetBackdrop').classList.remove('active'); };

window.closeModal = (id) => $(id).classList.remove('active');
window.toggleMemberModal = () => { const m = $('memberModal'); m.classList.contains('active') ? closeModal('memberModal') : m.classList.add('active'); };
window.toggleListenersModal = () => { const m = $('listenersModal'); m.classList.contains('active') ? closeModal('listenersModal') : m.classList.add('active'); };

function applyWallpaper(dataUrl){
    const wp = $('roomWallpaper'); if (!wp) return;
    wp.style.backgroundImage = `url(${dataUrl})`;
    wp.classList.add('has-wallpaper');
}
window.openWallpaperPicker = () => { closeSheet(); setTimeout(() => $('wallpaperInput').click(), 200); };
window.handleWallpaperSelect = (event) => {
    const file = event.target.files[0]; if (!file) return;
    if (file.size > 8 * 1024 * 1024){ toastMsg('❌ ছবি ৮ MB এর কম হতে হবে'); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
        applyWallpaper(ev.target.result);
        ls_set(KEY.wallpaper, { dataUrl: ev.target.result, ts: Date.now() });
        toastMsg('✅ Wallpaper পরিবর্তন হয়েছে');
    };
    reader.readAsDataURL(file); event.target.value = '';
};

window.openSettingsMenu = () => {
    if (!isAdminOrOwner()){ toastMsg('শুধু Owner/Admin Settings ব্যবহার করতে পারবে'); return; }
    closeSheet(); $('sheetBackdrop').classList.add('active'); $('settingsSheet').classList.add('active');
};
window.settingsNotReady = (name) => { toastMsg(`⚙️ ${name} — শীঘ্রই আসছে`); };

window.openGifterLeaderboard = () => { closeSheet(); renderGifterBody(); $('sheetBackdrop').classList.add('active'); $('gifterSheet').classList.add('active'); };
window.openUserProfileFromGifter = (uid) => {
    closeSheet();
    setTimeout(() => {
        const u = state.listeners.find(x => x.uid === uid);
        if (u) openUserProfile(uid); else toastMsg('ইউজার এখন রুমে নেই');
    }, 250);
};

function recordGift(targetUid, targetName, targetAvatar, amount){
    if (!targetUid || !amount) return;
    if (!state.giftStats) state.giftStats = {};
    if (!state.giftStats[targetUid]){
        state.giftStats[targetUid] = { uid: targetUid, name: targetName || 'User', avatar: targetAvatar || GUEST_AVATAR, history: [] };
    }
    state.giftStats[targetUid].history.push({ amount, ts: Date.now() });
    if (targetName) state.giftStats[targetUid].name = targetName;
    if (targetAvatar) state.giftStats[targetUid].avatar = targetAvatar;
    ls_set(KEY.giftStats, state.giftStats);
    renderTopGifters();
}

window.openGiftPicker = () => {
    if (!myProfile) return;
    const users = [];
    state.seats.forEach((s, i) => { if (s && s.uid) users.push({ ...s, seat: i }); });
    if (!users.length){ toastMsg('কেউ মাইকে নেই'); return; }
    $('giftTargetList').innerHTML = users.map(u => `<div class="target-item" onclick="pickGiftTarget('${esc(u.uid)}','${esc(u.name)}')"><img src="${u.avatar || GUEST_AVATAR}"><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:#fff">${esc(u.name)} ${u.uid === myProfile.uid ? '(Self)' : ''}</div><div style="font-size:11px;color:#7dd3fc;font-weight:600"><i class="fa-solid fa-gem"></i> ${(u.coins || 0).toLocaleString()}</div></div><i class="fa-solid fa-chevron-right" style="color:#666;font-size:12px"></i></div>`).join('');
    closeSheet(); $('sheetBackdrop').classList.add('active'); $('giftPickerSheet').classList.add('active');
};
window.pickGiftTarget = (uid, name) => { closeSheet(); setTimeout(()=>openGiftSheet(uid, name), 150); };

function openGiftSheet(targetUid, targetName){
    const GIFTS = [
        { e:'🌹', name:'Rose', price:5 }, { e:'🌷', name:'Tulip', price:5 },
        { e:'🌸', name:'Blossom', price:10 }, { e:'🌻', name:'Sunflower', price:10 },
        { e:'🌺', name:'Hibiscus', price:10 }, { e:'🤝', name:'Friendship', price:15 },
        { e:'💖', name:'Heart', price:15 }, { e:'🎁', name:'Gift Box', price:20 },
        { e:'💎', name:'Diamond', price:50 }
    ];
    closeSheet();
    $('sheetTitle').textContent = '🎁 Gift → ' + targetName;
    $('sheetOptions').innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:14px 6px">
        ${GIFTS.map(g => `<div onclick="sendGiftDemo('${g.e}','${g.name}',${g.price},'${esc(targetUid)}','${esc(targetName)}')" style="padding:12px 6px;border-radius:14px;background:linear-gradient(160deg,rgba(168,85,247,.15),rgba(255,255,255,.04));border:1px solid rgba(168,85,247,.3);display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer"><div style="font-size:36px;filter:drop-shadow(0 4px 10px rgba(0,0,0,.4))">${g.e}</div><div style="font-size:11px;font-weight:700;color:#fff">${g.name}</div><div style="font-size:10px;color:#7dd3fc;font-weight:700">💎 ${g.price}</div></div>`).join('')}
    </div>`;
    $('sheetBackdrop').classList.add('active'); $('seatSheet').classList.add('active');
}

window.sendGiftDemo = (emoji, name, price, targetUid, targetName) => {
    closeSheet();
    if (myProfile.diamonds < price){ toastMsg('❌ পর্যাপ্ত ডায়মন্ড নেই!'); return; }
    myProfile.diamonds -= price;
    const seatIdx = state.seats.findIndex(s => s && s.uid === targetUid);
    let targetAvatar = GUEST_AVATAR;
    if (seatIdx > -1){
        state.seats[seatIdx].coins = (state.seats[seatIdx].coins || 0) + price;
        targetAvatar = state.seats[seatIdx].avatar || targetAvatar;
        ls_set(KEY.seats, state.seats);
    } else {
        const l = state.listeners.find(x => x.uid === targetUid);
        if (l) targetAvatar = l.avatar || targetAvatar;
    }
    recordGift(targetUid, targetName, targetAvatar, price);
    pushMessage({ uid:myProfile.uid, name:myProfile.name, avatar:myProfile.avatar, text:`${emoji} ${name} → ${targetName} (💎${price})`, type:'gift' });
    logActivity('heart', seatIdx > -1 ? seatIdx : null, { target: targetName });
    playGiftAnimation({ name, emoji, targetName }, targetUid);
    renderSeats(); updateRoomPoints();
};

function getSeatCenterPx(i){ const app = document.querySelector('.app-container'); if (!app) return {x:0,y:0}; const aR = app.getBoundingClientRect(); const el = document.querySelector(`.seat[data-seat="${i}"] .seat-avatar`); if (!el) return {x:0,y:0}; const r = el.getBoundingClientRect(); return { x:(r.left+r.width/2)-(aR.left+aR.width/2), y:(r.top+r.height/2)-(aR.top+aR.height/2) }; }
function playGiftAnimation(d, targetUid){
    const layer = $('giftAnimLayer'); if (!layer) return;
    const sP = getSeatCenterPx(state.seats.findIndex(s => s && s.uid === myProfile?.uid));
    const tP = getSeatCenterPx(state.seats.findIndex(s => s && s.uid === targetUid));
    const e = d.emoji || '🎁';
    layer.innerHTML = ''; layer.classList.add('active');
    const label = document.createElement('div'); label.className = 'gift-anim-label'; label.textContent = `${e} ${d.name} → ${d.targetName}`; layer.appendChild(label);
    const glow = document.createElement('div'); glow.className = 'gift-anim-glow'; layer.appendChild(glow);
    for (let i = 0; i < 3; i++){ const r = document.createElement('div'); r.className = 'gift-anim-ring'; r.style.animationDelay = (i*220)+'ms'; layer.appendChild(r); }
    const main = document.createElement('div'); main.className = 'gift-anim-main'; main.textContent = e; layer.appendChild(main);
    main.animate([
        { transform:`translate(-50%,-50%) translate(${sP.x}px, ${sP.y}px) scale(0.2) rotate(-30deg)`, opacity:0, offset:0 },
        { transform:`translate(-50%,-50%) translate(${sP.x}px, ${sP.y}px) scale(0.7) rotate(0deg)`, opacity:1, offset:.10 },
        { transform:'translate(-50%,-50%) translate(0,0) scale(1.8) rotate(8deg)', opacity:1, offset:.25 },
        { transform:'translate(-50%,-50%) translate(0,0) scale(1.5) rotate(-4deg)', opacity:1, offset:.40 },
        { transform:'translate(-50%,-50%) translate(0,0) scale(1.7) rotate(2deg)', opacity:1, offset:.55 },
        { transform:'translate(-50%,-50%) translate(0,0) scale(1.6) rotate(0deg)', opacity:1, offset:.72 },
        { transform:`translate(-50%,-50%) translate(${tP.x*0.7}px, ${tP.y*0.7}px) scale(0.55) rotate(-15deg)`, opacity:1, offset:.85 },
        { transform:`translate(-50%,-50%) translate(${tP.x}px, ${tP.y}px) scale(0.25) rotate(10deg)`, opacity:.9, offset:.94 },
        { transform:`translate(-50%,-50%) translate(${tP.x}px, ${tP.y}px) scale(0.05) rotate(20deg)`, opacity:0 }
    ], { duration:3600, easing:'cubic-bezier(.4,.05,.3,1)', fill:'forwards' });
    setTimeout(()=>{ layer.innerHTML = ''; layer.classList.remove('active'); toastMsg(`🎁 ${d.name} → ${d.targetName}`); }, 3800);
}

function buildEmojiCategories(){ $('emojiCategories').innerHTML = EMOJI_CATEGORIES.map((c, i) => `<button class="emoji-cat-chip ${i===0?'active':''}" onclick="switchEmojiCat(${i})">${c.label}</button>`).join(''); }
function renderEmojiGrid(){
    const cat = EMOJI_CATEGORIES[activeEmojiCat]; if (!cat) return;
    $('emojiGrid').innerHTML = cat.items.map(code => {
        const src = EMOJI_BASE + code + '/512.gif';
        return `<div class="emoji-grid-item" onclick="sendEmojiReaction('${code}')"><img src="${src}" loading="lazy" alt="" onerror="this.parentElement.innerHTML='<div style=\\'font-size:32px;text-align:center\\'>${emojiFallback(code)}</div>'"></div>`;
    }).join('');
}
window.switchEmojiCat = (i) => { activeEmojiCat = i; document.querySelectorAll('.emoji-cat-chip').forEach((c, k) => c.classList.toggle('active', k === i)); renderEmojiGrid(); };
window.openEmojiSheet = () => {
    if (!myProfile){ toastMsg('লগইন করুন'); return; }
    const seatIdx = state.seats.findIndex(s => s && s.uid === myProfile.uid);
    if (seatIdx === -1){ toastMsg('আগে একটা সিটে উঠুন 🎤'); return; }
    closeSheet(); buildEmojiCategories(); renderEmojiGrid();
    $('sheetBackdrop').classList.add('active'); $('emojiSheet').classList.add('active');
};
window.sendEmojiReaction = (code) => {
    if (!myProfile) return;
    const idx = state.seats.findIndex(s => s && s.uid === myProfile.uid);
    if (idx === -1){ toastMsg('আগে একটা সিটে উঠুন'); return; }
    const src = EMOJI_BASE + code + '/512.gif';
    closeSheet(); showSeatReaction(idx, code, src); logActivity('react', idx);
};
function showSeatReaction(seatIndex, code, src){
    if (seatIndex < 0 || seatIndex >= 10) return;
    const layer = $('reactLayer' + seatIndex); if (!layer) return;
    const burst = document.createElement('div'); burst.className = 'seat-react-burst'; layer.appendChild(burst);
    setTimeout(() => burst.remove(), 900);
    for (let i = 0; i < 3; i++){
        setTimeout(() => {
            const img = document.createElement('img'); img.className = 'seat-react'; img.src = src;
            img.onerror = () => { const div = document.createElement('div'); div.className = 'seat-react'; div.style.display='grid'; div.style.placeItems='center'; div.style.fontSize='26px'; div.style.color='#fff'; div.textContent = emojiFallback(code); img.replaceWith(div); };
            layer.appendChild(img); setTimeout(() => img.remove(), 2400);
        }, i * 80);
    }
}
function emojiFallback(code){ const map = { '1f602':'😂','1f60d':'😍','1f62d':'😭','2764_fe0f':'❤️','1f525':'🔥','1f44f':'👏','1f44d':'👍','2728':'✨','1f389':'🎉','1f970':'🥰' }; return map[code] || '😊'; }

window.openChatSheet = () => {
    closeSheet(); $('sheetBackdrop').classList.add('active'); $('chatSheet').classList.add('active');
    const frame = $('chatFrame'), loading = $('chatLoading');
    loading.classList.remove('hidden');
    const u = new URL(CHAT_URL);
    u.searchParams.set('uid', myProfile.uid);
    u.searchParams.set('name', myProfile.name);
    u.searchParams.set('photo', myProfile.avatar || '');
    frame.src = u.toString();
    frame.onload = () => setTimeout(()=>loading.classList.add('hidden'), 400);
};
window.openGameSheet = () => {
    closeSheet(); $('sheetBackdrop').classList.add('active'); $('gameSheet').classList.add('active');
    const frame = $('gameFrame'), loading = $('gameLoading');
    loading.classList.remove('hidden');
    const u = new URL(GAME_URL);
    u.searchParams.set('uid', myProfile.uid);
    u.searchParams.set('name', myProfile.name);
    u.searchParams.set('photo', myProfile.avatar || '');
    frame.src = u.toString();
    frame.onload = () => setTimeout(()=>loading.classList.add('hidden'), 400);
};
window.toggleIframeFullscreen = (sheetId) => {
    const el = $(sheetId); if (!el) return;
    el.classList.toggle('fullscreen');
    const icon = el.querySelector('.if-action i.fa-expand, .if-action i.fa-compress');
    if (icon) icon.className = el.classList.contains('fullscreen') ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
};

function initDragHandle(handleId, sheetId){
    const handle = $(handleId), sheet = $(sheetId);
    if (!handle || !sheet) return;
    let dragging = false, startY = 0, startH = 0;
    const start = (e) => { dragging = true; startY = (e.touches ? e.touches[0].clientY : e.clientY); startH = sheet.offsetHeight; sheet.style.transition = 'none'; };
    const move = (e) => {
        if (!dragging) return;
        const y = (e.touches ? e.touches[0].clientY : e.clientY);
        const dy = startY - y;
        let newH = startH + dy;
        const minH = window.innerHeight * 0.5, maxH = window.innerHeight;
        newH = Math.max(minH, Math.min(maxH, newH));
        sheet.style.height = newH + 'px'; sheet.style.maxHeight = newH + 'px';
    };
    const end = () => {
        if (!dragging) return;
        dragging = false; sheet.style.transition = '';
        const h = sheet.offsetHeight, maxH = window.innerHeight;
        sheet.style.height = ''; sheet.style.maxHeight = '';
        if (h > maxH * 0.85) sheet.classList.add('fullscreen');
        else if (h < maxH * 0.6) sheet.classList.remove('fullscreen');
    };
    handle.addEventListener('touchstart', start, {passive:true});
    handle.addEventListener('touchmove', move, {passive:true});
    handle.addEventListener('touchend', end);
    handle.addEventListener('mousedown', start);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', end);
}

window.openEditRoom = () => {
    if (!isAdminOrOwner()){ toastMsg('শুধু Owner/Admin পারবে'); return; }
    pendingLogo = state.roomLogo;
    $('roomNameInput').value = state.roomName; $('roomIdInput').value = state.roomId;
    const preview = $('room-logo-edit-preview');
    if (state.roomLogo) preview.innerHTML = `<img src="${state.roomLogo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    else preview.innerHTML = `<span class="cassette-text">${esc(state.roomName).split(/\s+/).slice(0, 2).join('<br>')}</span>`;
    $('editRoomModal').classList.add('active');
};
window.previewRoomImage = (event) => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        $('cropImage').src = ev.target.result; $('cropModal').classList.add('active');
        if (cropper){ cropper.destroy(); cropper = null; }
        setTimeout(()=>{ cropper = new Cropper($('cropImage'), { aspectRatio:1, viewMode:1, autoCropArea:1, background:false, guides:false, center:false, highlight:false }); }, 120);
    };
    reader.readAsDataURL(file); event.target.value = '';
};
window.cancelCrop = () => { if (cropper){ cropper.destroy(); cropper = null; } closeModal('cropModal'); };
window.applyCrop = () => {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ width:300, height:300 });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    pendingLogo = dataUrl;
    $('room-logo-edit-preview').innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    cropper.destroy(); cropper = null; closeModal('cropModal');
};
window.saveRoomProfile = () => {
    const name = $('roomNameInput').value.trim(); if (!name){ toastMsg('নাম খালি রাখা যাবে না'); return; }
    state.roomName = name; state.roomLogo = pendingLogo || null;
    ls_set(KEY.info, { name, logo: state.roomLogo });
    const rooms = ls_get('moi_demo_rooms', {}) || {};
    if (rooms[ROOM_ID]){ rooms[ROOM_ID].name = name; rooms[ROOM_ID].logo = state.roomLogo; ls_set('moi_demo_rooms', rooms); }
    renderBranding(); closeModal('editRoomModal'); logActivity('roomEdit', null); toastMsg('সেভ হয়েছে ✅');
};

let toastTimer;
function toastMsg(msg){
    const t = $('toastBox'); t.textContent = msg;
    const sheetOpen = document.querySelector('.bottom-sheet.active, .modal-overlay.active, #permissionSheet.active');
    t.classList.toggle('top-mode', !!sheetOpen); t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
}
window.toastMsg = toastMsg;

window.exitRoom = () => {
    if (!confirm('রুম ছেড়ে হোমপেজে যাবেন?')) return;
    if (myProfile){
        const idx = state.seats.findIndex(s => s && s.uid === myProfile.uid);
        if (idx > -1){ state.seats[idx] = null; ls_set(KEY.seats, state.seats); }
        state.listeners = state.listeners.filter(u => u.uid !== myProfile.uid);
        ls_set(KEY.listeners, state.listeners);
    }
    location.href = HOMEPAGE_URL;
};
/* ⭐ EXIT MENU (Keep / Exit) */
window.toggleExitMenu = (e) => {
    if (e) e.stopPropagation();
    const menu = $('exitMenu');
    if (!menu) return;
    menu.classList.toggle('show');
};
window.closeExitMenu = () => {
    const menu = $('exitMenu');
    if (menu) menu.classList.remove('show');
};
window.keepRoom = () => {
    closeExitMenu();
    toastMsg('📌 Keep — ভবিষ্যতে মিনিমাইজ হবে');
};
document.addEventListener('click', (e) => {
    const wrapper = document.querySelector('.exit-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        closeExitMenu();
    }
});