console.log('[MOI ROOM] DEMO v14');

const HOMEPAGE_URL = "https://farjanaaktar1173-boop.github.io/Homepage/";
const SEAT_BG_IMG = 'https://raw.githubusercontent.com/farjanaaktar1173-boop/Owner-room/main/seat-bg.jpg';
const CHAT_URL = 'https://farjanaaktar1173-boop.github.io/Chat/';
const GAME_URL = 'https://farjanaaktar1173-boop.github.io/Game/';
const LOTTIE_RING_URL = 'fire_ring.json';

function resolveRoomId(){
    const p = new URLSearchParams(location.search);
    const h = location.hash.replace(/^#\/?/, '');
    const urlRoom = p.get('room') || p.get('id') || p.get('roomId') || h;
    if (urlRoom){ try { localStorage.setItem('moi_last_room', urlRoom); } catch(e){} return urlRoom; }
    let last = null; try { last = localStorage.getItem('moi_last_room'); } catch(e){}
    if (last) return last;
    try {
        const u = JSON.parse(localStorage.getItem('moi_user') || 'null');
        if (u && u.uid){
            const users = JSON.parse(localStorage.getItem('moi_demo_users') || '{}');
            if (users[u.uid] && users[u.uid].myRoomUid) return users[u.uid].myRoomUid;
        }
    } catch(e){}
    return 'S1001';
}
const ROOM_ID = resolveRoomId();

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const GUEST_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#3b2a4f"/><circle cx="50" cy="40" r="18" fill="#7a6a8f"/><ellipse cx="50" cy="88" rx="30" ry="22" fill="#7a6a8f"/></svg>`);

function ls_get(k, fb = null){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch(e){ return fb; } }
function ls_set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }

const KEY = {
    seats: `moi_room_${ROOM_ID}_seats`,
    listeners: `moi_room_${ROOM_ID}_listeners`,
    messages: `moi_room_${ROOM_ID}_messages`,
    activity: `moi_room_${ROOM_ID}_activity`,
    info: `moi_room_${ROOM_ID}_info`,
    topic: `moi_room_${ROOM_ID}_topic`,
    giftStats: `moi_room_${ROOM_ID}_giftStats`,
    wallpaper: `moi_room_${ROOM_ID}_wallpaper`,
    joined: `moi_room_${ROOM_ID}_joinedUsers`
};

const state = {
    roomName:'HOUR FM', roomId:ROOM_ID, roomLogo:null, owner:null, myRole:'member',
    topic:'🎧FM 📻➡️SP ✨🎤Room 🎵',
    seats:new Array(10).fill(null),
    listeners:[], messages:[],
    giftStats:{}, gifterRange:'day',
    joinedUsers: new Set()
};

let myProfile = null, joined = false, cropper = null, pendingLogo = null;
let currentProfileUid = null, currentPermUid = null;
let invitedUsers = new Set(), activeEmojiCat = 0, popupDone = false;

const EMOJI_CATEGORIES = [
    { label:'😀 স্মাইলি', items:['1f602','1f923','1f60d','1f62d','1f92f','1f60e','1f970','1f929','1f618','1f61c','1f914','1f633'] },
    { label:'❤️ ভালোবাসা', items:['2764_fe0f','1f495','1f496','1f49e','1f498','1f49d','1f49b','1f49c','1f499','1f49a','1f525','1f31f'] },
    { label:'🎉 মজা', items:['1f921','1f47b','1f47d','1f4a9','1f608','1f973','1f480','1f916','1f47e','1f984','1f389','1f44f'] },
    { label:'👏 প্রশংসা', items:['1f44f','1f44c','1f44d','1f64c','1f64f','1f44a','1f91d','1f4aa','2728','1f31f','1f525','1f4af'] },
    { label:'😢 দুঃখ', items:['1f62d','1f622','1f62a','1f614','1f641','1f972','1f97a','1f629','1f62b','1f624','1f62e','1f910'] },
    { label:'🔥 আগুন', items:['1f525','1f4a5','26a1','2b50','1f31f','2728','1f4ab','1f32a_fe0f','1f308','1f4a2','1f4a3','1f4a4'] }
];
const EMOJI_BASE = 'https://fonts.gstatic.com/s/e/notoemoji/latest/';

function getMyRole(){ if (!myProfile) return null; return state.myRole || 'member'; }
function isOwner(){ return getMyRole() === 'owner'; }
function isAdminOrOwner(){ const r = getMyRole(); return r === 'owner' || r === 'admin'; }
function getRoleOf(uid){ if (state.owner && state.owner.uid === uid) return 'owner'; const u = state.listeners.find(x => x.uid === uid); return (u && u.role) || 'member'; }
function roleBorderClass(r){ return r === 'owner' ? 'owner-border' : (r === 'admin' ? 'admin-border' : ''); }
function roleBadgeClass(r, isMe){ if (isMe) return 'me'; if (r === 'owner') return 'owner'; if (r === 'admin') return 'admin'; return 'member'; }
function roleLabel(r, isMe){ if (isMe) return 'You'; if (r === 'owner') return 'Owner'; if (r === 'admin') return 'Admin'; return 'Member'; }
function roleBadgeHTML(r, size){ if (r === 'owner') return `<i class="fa-solid fa-crown" style="color:#ffb400;font-size:${size}px"></i>`; if (r === 'admin') return `<i class="fa-solid fa-shield-halved" style="color:#22c55e;font-size:${size}px"></i>`; return ''; }