(function bootstrapUser(){
    let u = ls_get('moi_user');
    if (!u){
        const p = new URLSearchParams(location.search);
        if (p.get('uid')) u = { uid:p.get('uid'), name:p.get('name')||'User', photo:p.get('photo')||GUEST_AVATAR, moiId:p.get('moiId')||'', country:p.get('country')||'', voice:p.get('voice')||'' };
    }
    if (!u || !u.uid) u = ensureDemoUser();
    if (!u || !u.uid) return;
    myProfile = { uid:u.uid, name:u.name||'User', avatar:u.photo||u.avatar||GUEST_AVATAR, email:u.email||'', moiId:u.moiId||'', country:u.country||'', voice:u.voice||'', diamonds:u.diamonds??1000 };
    $('my-avatar-top').src = myProfile.avatar;
    refreshTopBarRing();
})();

window.selectRole = (role) => {
    if (popupDone) return;
    popupDone = true;
    state.myRole = role;
    $('rolePopup').classList.add('hidden');
    setTimeout(() => { $('rolePopup').style.display = 'none'; finishInit(); }, 200);
};

function finishInit(){
    if (joined) return;
    initState();
    renderBranding(); renderSeats(); renderMessageFeed();
    renderListeners(); renderMembers(); renderTopGifters();
    joinRoom(); buildEmojiCategories(); renderEmojiGrid();
    initDragHandle('chatDragHandle', 'chatSheet');
    initDragHandle('gameDragHandle', 'gameSheet');
    startLuckyBoxTimer();

    window.addEventListener('storage', (e) => {
        if (e.key === KEY.seats){ state.seats = ls_get(KEY.seats) || new Array(10).fill(null); renderSeats(); updateMicButton(); }
        if (e.key === KEY.listeners){ state.listeners = ls_get(KEY.listeners) || []; renderListeners(); renderMembers(); $('userCountBadge').textContent = state.listeners.length; $('listenerTotalCount').textContent = state.listeners.length; }
        if (e.key === KEY.messages){ state.messages = ls_get(KEY.messages) || []; renderMessageFeed(); }
        if (e.key === KEY.giftStats){ state.giftStats = ls_get(KEY.giftStats) || {}; renderTopGifters(); }
        if (e.key === KEY.wallpaper){ const wp = ls_get(KEY.wallpaper); if (wp && wp.dataUrl) applyWallpaper(wp.dataUrl); }
        if (e.key === KEY.joined){ state.joinedUsers = new Set(ls_get(KEY.joined, []) || []); updateJoinButton(); }
    });

    setTimeout(refreshAllRings, 100);
    setTimeout(refreshAllRings, 800);
    console.log('[ROOM] ' + state.myRole.toUpperCase() + ' — ' + state.roomName);
}

/* ⭐ Lucky Box feed hook — message render হলে box দেখাবে */
(function hookMessageFeed(){
    const orig = window.renderMessageFeed;
    if (typeof orig === 'function'){
        window.renderMessageFeed = function(){
            orig.apply(this, arguments);
            injectLuckyBoxesIntoFeed();
        };
    }
})();