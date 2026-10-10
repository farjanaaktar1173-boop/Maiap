let _inviteCooldowns = new Set();

function joinRoom(){
    if (!myProfile || joined) return;
    joined = true;
    const myRole = state.myRole;
    const list = state.listeners.filter(l => l.uid !== myProfile.uid);
    list.push({ uid:myProfile.uid, name:myProfile.name, avatar:myProfile.avatar, role:myRole, joined:Date.now(), isMe:true });
    state.listeners = list;
    ls_set(KEY.listeners, list);

    if (myRole === 'owner'){
        state.seats[0] = { uid:myProfile.uid, name:myProfile.name, avatar:myProfile.avatar, role:'owner', mic:true, locked:false, coins:(state.seats[0]&&state.seats[0].coins)||0, started:Date.now() };
        ls_set(KEY.seats, state.seats);
        state.owner = { uid:myProfile.uid, name:myProfile.name, avatar:myProfile.avatar };
    } else {
        state.joinedUsers.add(myProfile.uid);
        ls_set(KEY.joined, [...state.joinedUsers]);
    }
    updateRoleFlag(); updateSettingsVisibility(); updateJoinButton();
    logActivity('join', null);
    renderListeners(); renderMembers(); renderSeats(); renderTopGifters();
    updateMicButton();
    $('userCountBadge').textContent = state.listeners.length;
    $('listenerTotalCount').textContent = state.listeners.length;
}

window.toggleJoinRoom = () => {
    if (!myProfile) return;
    if (state.joinedUsers.has(myProfile.uid)){
        state.joinedUsers.delete(myProfile.uid);
        toastMsg('❌ Room থেকে Unjoin হয়েছেন');
    } else {
        if (state.joinedUsers.size >= 4000){ toastMsg('❌ Room Full — ৪০০০/৪০০০'); return; }
        state.joinedUsers.add(myProfile.uid);
        toastMsg('✅ Room এ Join হয়েছেন');
    }
    ls_set(KEY.joined, [...state.joinedUsers]);
    updateJoinButton();
};

window.inviteUser = (uid) => {
    const u = state.listeners.find(x => x.uid === uid); if (!u) return;
    if (_inviteCooldowns.has(uid)){ toastMsg('⏱️ অপেক্ষা করুন...'); return; }
    _inviteCooldowns.add(uid);
    renderListeners();
    toastMsg(`📨 ${u.name} কে ইনভাইট পাঠানো হয়েছে`);
    setTimeout(() => {
        _inviteCooldowns.delete(uid);
        renderListeners();
    }, 5000);
};

window.handleListenerTap = (uid) => {
    closeModal('listenersModal');
    setTimeout(() => openUserProfile(uid), 150);
};

window.handleMemberTap = (uid) => {
    if (!myProfile) return;
    const target = state.listeners.find(u => u.uid === uid); if (!target) return;
    const me = uid === myProfile.uid;
    if (isOwner() && !me){
        currentPermUid = uid;
        const r = target.role || 'member';
        $('permAvatar').src = target.avatar || GUEST_AVATAR;
        $('permName').textContent = target.name;
        $('optAdmin').classList.toggle('selected', r === 'admin');
        $('optMember').classList.toggle('selected', r === 'member');
        closeModal('memberModal');
        $('sheetBackdrop').classList.add('active');
        $('permissionSheet').classList.add('active');
        return;
    }
    closeModal('memberModal');
    setTimeout(() => openUserProfile(uid), 150);
};

window.setPermissionRole = (role) => {
    if (!currentPermUid) return;
    if (!isOwner()){ toastMsg('শুধু Owner পারবে'); return; }
    const target = state.listeners.find(u => u.uid === currentPermUid); if (!target) return;
    target.role = role; ls_set(KEY.listeners, state.listeners);
    const seatIdx = state.seats.findIndex(s => s && s.uid === currentPermUid);
    if (seatIdx > -1) state.seats[seatIdx].role = role;
    ls_set(KEY.seats, state.seats);
    renderListeners(); renderMembers(); renderSeats();
    logActivity(role === 'admin' ? 'makeAdmin' : 'removeAdmin', seatIdx > -1 ? seatIdx : null, { target: target.name });
    toastMsg(role === 'admin' ? `👑 ${target.name} এখন Admin` : `⭐ ${target.name} এখন User`);
};

window.removeUserFromRoom = () => {
    if (!currentPermUid) return; if (!isOwner()){ toastMsg('শুধু Owner পারবে'); return; }
    const target = state.listeners.find(u => u.uid === currentPermUid); if (!target) return;
    if (!confirm(`${target.name} কে রুম থেকে সরিয়ে দেবেন?`)) return;
    state.listeners = state.listeners.filter(u => u.uid !== currentPermUid); ls_set(KEY.listeners, state.listeners);
    const seatIdx = state.seats.findIndex(s => s && s.uid === currentPermUid);
    if (seatIdx > -1) state.seats[seatIdx] = null;
    ls_set(KEY.seats, state.seats);
    renderListeners(); renderMembers(); renderSeats();
    toastMsg(`🚪 ${target.name} কে সরানো হয়েছে`); currentPermUid = null; closePermissionSheet();
};

function takeMic(i){
    if (!myProfile) return;
    const prev = state.seats[i];
    if (prev && prev.locked && !isAdminOrOwner()){ toastMsg('সিটটি লক করা 🔒'); closeSheet(); return; }
    const old = state.seats.findIndex(s => s && s.uid === myProfile.uid);
    if (old > -1 && old !== i) state.seats[old] = null;
    state.seats[i] = { uid:myProfile.uid, name:myProfile.name, avatar:myProfile.avatar, role:getMyRole(), mic:true, locked:false, coins:(prev && prev.coins)||0, started:Date.now() };
    ls_set(KEY.seats, state.seats); renderSeats(); updateMicButton(); logActivity('takeMic', i); closeSheet();
}
function leaveMic(i){ if (!state.seats[i] || state.seats[i].uid !== myProfile.uid) return; state.seats[i] = null; ls_set(KEY.seats, state.seats); renderSeats(); updateMicButton(); logActivity('leaveMic', i); closeSheet(); }
function lockMic(i){ if (!isAdminOrOwner()){ toastMsg('শুধু Owner/Admin পারবে'); closeSheet(); return; } const s = state.seats[i]; if (!s) state.seats[i] = { locked:true, by:myProfile.name }; else state.seats[i].locked = true; ls_set(KEY.seats, state.seats); renderSeats(); logActivity('lockMic', i); closeSheet(); }
function unlockMic(i){ if (!isAdminOrOwner()){ toastMsg('শুধু Owner/Admin পারবে'); closeSheet(); return; } const s = state.seats[i]; if (!s || !s.locked) return; if (s.uid) state.seats[i].locked = false; else state.seats[i] = null; ls_set(KEY.seats, state.seats); renderSeats(); logActivity('unlockMic', i); closeSheet(); }

window.toggleMyMicFromBar = () => {
    if (!myProfile) return;
    const idx = state.seats.findIndex(s => s && s.uid === myProfile.uid);
    if (idx === -1){ toastMsg('আগে একটা সিটে উঠুন 🎤'); return; }
    const on = !state.seats[idx].mic;
    state.seats[idx].mic = on;
    ls_set(KEY.seats, state.seats); renderSeats(); updateMicButton(); logActivity(on ? 'unmute' : 'mute', idx);
    toastMsg(on ? 'আনমিউট 🔊' : 'মিউট 🔇');
};

window.openSeatSheet = (i) => {
    if (!myProfile) return;
    const s = state.seats[i]; let title, options;
    if (!s){ title = `Seat #${i + 1}`; options = [{ icon:'fa-microphone-lines', label:'Take the mic', action:()=>takeMic(i) }, { icon:'fa-user-plus', label:'Invite speakers', action:()=>{ closeSheet(); toggleListenersModal(); } }]; if (isAdminOrOwner()) options.push({ icon:'fa-lock', label:'Lock the mic', cls:'gold', action:()=>lockMic(i) }); }
    else if (s.locked && !s.uid){ title = `Seat #${i + 1} (Locked)`; options = [{ icon:'fa-microphone-lines', label:'Take the mic', action:()=>takeMic(i) }]; if (isAdminOrOwner()) options.push({ icon:'fa-lock-open', label:'Unlock the mic', cls:'gold', action:()=>unlockMic(i) }); }
    else if (s.uid === myProfile.uid){ title = 'My Seat'; options = [{ icon:'fa-user', label:'View profile', action:()=>{ closeSheet(); setTimeout(()=>openUserProfile(myProfile.uid), 120); } }, { icon:'fa-microphone-slash', label:'Leave the mic', danger:true, action:()=>leaveMic(i) }]; }
    else { closeSheet(); setTimeout(()=>openUserProfile(s.uid), 120); return; }
    showSheetOptions(title, options);
};

window.openUserProfile = (uid) => {
    const u = state.listeners.find(x => x.uid === uid);
    if (!u){ toastMsg('ইউজার পাওয়া যায়নি'); return; }
    currentProfileUid = uid;
    const me = myProfile && u.uid === myProfile.uid;
    const r = u.role || 'member';
    $('profileCover').src = u.avatar || GUEST_AVATAR; $('profileAvatar').src = u.avatar || GUEST_AVATAR;
    $('profileAvatar').className = 'profile-avatar ' + roleBorderClass(r);
    let n = esc(u.name);
    if (r === 'owner') n += ' <i class="fa-solid fa-crown owner-crown"></i>';
    else if (r === 'admin') n += ' <i class="fa-solid fa-shield-halved admin-shield"></i>';
    $('profileName').innerHTML = n;
    $('profileUid').innerHTML = `<i class="fa-solid fa-id-badge" style="font-size:11px"></i> UID: ${esc(u.moiId || u.uid.slice(0, 12))}`;
    $('profileFollowers').textContent = '0'; $('profileFollowing').textContent = '0';
    const followBtn = $('profileFollowBtn'), chatBtn = document.querySelector('.profile-btn.chat-btn');
    if (me){ followBtn.style.display = 'none'; chatBtn.style.display = 'none'; } else { followBtn.style.display = ''; chatBtn.style.display = ''; }

    const muteBtn = $('pbarMute'), leaveBtn = $('pbarLeave'), kickBtn = $('pbarKick');
    const sep1 = $('pbarSep1'), sep2 = $('pbarSep2');
    if (me || !isAdminOrOwner()){
        muteBtn.style.display = 'none'; leaveBtn.style.display = 'none'; kickBtn.style.display = 'none';
        sep1.style.display = 'none'; sep2.style.display = 'none';
    } else if (isOwner()){
        muteBtn.style.display = 'flex'; leaveBtn.style.display = 'flex'; kickBtn.style.display = 'flex';
        sep1.style.display = 'block'; sep2.style.display = 'block';
    } else if (getMyRole() === 'admin'){
        muteBtn.style.display = 'flex'; leaveBtn.style.display = 'flex'; kickBtn.style.display = 'none';
        sep1.style.display = 'block'; sep2.style.display = 'none';
    }
    $('userProfileModal').classList.add('active');
    setTimeout(refreshAllRings, 50);
};
window.closeUserProfile = () => { $('userProfileModal').classList.remove('active'); currentProfileUid = null; setTimeout(refreshAllRings, 50); };
window.profileChat = () => { closeUserProfile(); setTimeout(()=>openChatSheet(), 200); };
window.profileGift = () => { closeUserProfile(); setTimeout(()=>openGiftPicker(), 200); };

window.profileMute = () => {
    if (!currentProfileUid) return;
    if (!isAdminOrOwner()){ toastMsg('শুধু Owner/Admin পারবে'); return; }
    const seatIdx = state.seats.findIndex(s => s && s.uid === currentProfileUid);
    if (seatIdx === -1){ toastMsg('ইউজার মাইকে নেই'); return; }
    const targetName = state.seats[seatIdx].name || 'User';
    state.seats[seatIdx].mic = !state.seats[seatIdx].mic;
    ls_set(KEY.seats, state.seats); renderSeats();
    toastMsg(state.seats[seatIdx].mic ? `${targetName} আনমিউট 🔊` : `${targetName} মিউট 🔇`);
    logActivity(state.seats[seatIdx].mic ? 'unmute' : 'mute', seatIdx, { target: targetName });
};

window.profileLeave = () => {
    if (!currentProfileUid) return;
    if (!isAdminOrOwner()){ toastMsg('শুধু Owner/Admin পারবে'); return; }
    const seatIdx = state.seats.findIndex(s => s && s.uid === currentProfileUid);
    if (seatIdx === -1){ toastMsg('ইউজার মাইকে নেই'); return; }
    const targetName = state.seats[seatIdx].name || 'User';
    state.seats[seatIdx] = null; ls_set(KEY.seats, state.seats); renderSeats();
    toastMsg(`${targetName} কে মাইক থেকে নামানো হয়েছে`);
    logActivity('leaveMic', seatIdx, { target: targetName });
    closeUserProfile();
};

window.profileKick = () => {
    if (!currentProfileUid) return;
    if (!isOwner()){ toastMsg('শুধু Owner কিক করতে পারবে'); return; }
    const u = state.listeners.find(x => x.uid === currentProfileUid); if (!u) return;
    state.listeners = state.listeners.filter(x => x.uid !== currentProfileUid); ls_set(KEY.listeners, state.listeners);
    const seatIdx = state.seats.findIndex(s => s && s.uid === currentProfileUid);
    if (seatIdx > -1) state.seats[seatIdx] = null;
    ls_set(KEY.seats, state.seats);
    renderListeners(); renderMembers(); renderSeats(); toastMsg(`👢 ${u.name} কে কিক করা হয়েছে`);
    logActivity('kick', seatIdx > -1 ? seatIdx : null, { target: u.name });
    closeUserProfile();
};
window.openProfileMoreSheet = () => { if (!currentProfileUid) return; const u = state.listeners.find(x => x.uid === currentProfileUid); if (!u) return; toastMsg('UID: ' + (u.moiId || u.uid.slice(0, 12))); };

window.editTopic = () => {
    if (!isAdminOrOwner()){ toastMsg('শুধু Owner/Admin পারবে'); return; }
    const next = prompt('রুমের টপিক:', state.topic || '');
    if (next === null) return;
    state.topic = next.trim() || '🎧FM 📻➡️SP ✨🎤Room 🎵';
    ls_set(KEY.topic, state.topic); renderMessageFeed(); toastMsg('টপিক আপডেট ✅');
};

window.openMessageInput = () => { closeSheet(); $('sheetBackdrop').classList.add('active'); $('msgSheet').classList.add('active'); setTimeout(()=>$('chatInput').focus(),250); };
window.sendChatMessage = () => {
    const text = $('chatInput').value.trim(); if (!text) return;
    $('chatInput').value = '';
    pushMessage({ uid:myProfile?.uid, name:myProfile?.name||'User', avatar:myProfile?.avatar, text, type:'text' });
    closeSheet();
};