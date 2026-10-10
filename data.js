function ensureDemoUser(){
    const K = 'moi_sample_uid_v1';
    let uid = ls_get(K);
    const all = ls_get('moi_demo_users', {}) || {};
    if (uid && all[uid]) return all[uid];
    uid = 'sample_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    const moiId = String(Math.floor(100000 + Math.random() * 900000));
    const photo = `https://api.dicebear.com/7.x/adventurer/svg?seed=${uid}&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    const data = { uid, name:'Sample User', photo, email:'', moiId, country:'Bangladesh', voice:'Neutral', isSample:true, createdAt: Date.now() };
    all[uid] = data; ls_set('moi_demo_users', all); ls_set(K, uid); ls_set('moi_user', data);
    return data;
}

function loadRoomInfo(){
    const userRooms = ls_get('moi_demo_rooms', {}) || {};
    if (userRooms[ROOM_ID]){
        const info = userRooms[ROOM_ID];
        state.roomName = info.name || 'My Room';
        state.roomLogo = info.logo || null;
        if (!state.owner) state.owner = info.owner || { uid:myProfile?.uid, name:myProfile?.name, avatar:myProfile?.avatar };
        state.roomId = info.id || ROOM_ID;
        return;
    }
    const DEMO = {
        'S1001': { name:'Dhaka Music FM' }, 'S1002': { name:'Mumbai Chat Room' },
        'S1003': { name:'Karachi Beats' }, 'S1004': { name:'Dubai Night FM' },
        'S1005': { name:'London Vibes' }, 'S1006': { name:'Tokyo Lounge' }
    };
    if (DEMO[ROOM_ID]){
        state.roomName = DEMO[ROOM_ID].name;
        state.roomLogo = `https://picsum.photos/seed/${ROOM_ID}/400/460`;
        state.owner = { uid:'demo_owner_' + ROOM_ID, name:'Sample Owner', avatar:`https://api.dicebear.com/7.x/adventurer/svg?seed=${ROOM_ID}` };
        return;
    }
    state.roomName = 'Room ' + ROOM_ID;
    state.owner = myProfile ? { uid:myProfile.uid, name:myProfile.name, avatar:myProfile.avatar } : null;
}

const DEMO_NAMES = ['Arif','Fatima','Rahul','Priya','Ahmed','Sara','Kabir','Nadia','Hasan','Zara','Ravi','Maya','Imran','Layla','Samir','Nisha'];
const DEMO_AVATARS = [
    'https://i.pravatar.cc/100?img=1','https://i.pravatar.cc/100?img=5','https://i.pravatar.cc/100?img=9',
    'https://i.pravatar.cc/100?img=12','https://i.pravatar.cc/100?img=15','https://i.pravatar.cc/100?img=20',
    'https://i.pravatar.cc/100?img=25','https://i.pravatar.cc/100?img=32','https://i.pravatar.cc/100?img=40',
    'https://i.pravatar.cc/100?img=45','https://i.pravatar.cc/100?img=50','https://i.pravatar.cc/100?img=55',
    'https://i.pravatar.cc/100?img=60','https://i.pravatar.cc/100?img=65','https://i.pravatar.cc/100?img=68',
    'https://i.pravatar.cc/100?img=70'
];

function buildFakeListeners(){
    const count = 6 + Math.floor(Math.random() * 6);
    const list = [];
    for (let i = 0; i < count; i++){
        list.push({
            uid: 'fake_' + ROOM_ID + '_' + i,
            name: DEMO_NAMES[i % DEMO_NAMES.length] + (i > DEMO_NAMES.length - 1 ? i : ''),
            avatar: DEMO_AVATARS[i % DEMO_AVATARS.length],
            role: 'member', joined: Date.now() - (i * 60000), isFake: true
        });
    }
    return list;
}

function buildFakeSeats(){
    const seats = new Array(10).fill(null);
    if (state.owner) seats[0] = { uid:state.owner.uid, name:state.owner.name, avatar:state.owner.avatar, role:'owner', mic:true, locked:false, coins:0, started:Date.now() };
    const fakes = state.listeners.filter(l => l.isFake);
    const fillCount = Math.min(4, fakes.length);
    for (let i = 1; i <= fillCount; i++){
        const l = fakes[i-1];
        seats[i] = { uid:l.uid, name:l.name, avatar:l.avatar, role:'member', mic: Math.random() > .3, locked:false, coins: Math.floor(Math.random() * 500), started: Date.now() - 120000 };
    }
    seats[9] = { locked:true, by:'System' };
    return seats;
}

function initState(){
    loadRoomInfo();
    const savedTopic = ls_get(KEY.topic);
    if (savedTopic) state.topic = savedTopic;

    let seats = ls_get(KEY.seats);
    if (!seats){
        const fakes = buildFakeListeners();
        state.listeners = fakes;
        ls_set(KEY.listeners, fakes);
        seats = buildFakeSeats();
        ls_set(KEY.seats, seats);
    } else {
        state.listeners = ls_get(KEY.listeners) || [];
    }
    state.seats = seats.map(s => s || null);
    state.messages = ls_get(KEY.messages) || [];

    let stats = ls_get(KEY.giftStats);
    if (!stats || Object.keys(stats).length === 0){
        stats = {};
        const now = Date.now();
        state.seats.forEach(s => {
            if (s && s.uid && s.coins && s.coins > 0 && !s.locked){
                const daysAgo = Math.random() * 25;
                const seedTs = now - (daysAgo * 24 * 60 * 60 * 1000);
                stats[s.uid] = { uid: s.uid, name: s.name || 'User', avatar: s.avatar || GUEST_AVATAR, history: [{ amount: s.coins, ts: seedTs }] };
            }
        });
        ls_set(KEY.giftStats, stats);
    }
    state.giftStats = stats;

    const wp = ls_get(KEY.wallpaper);
    if (wp && wp.dataUrl) applyWallpaper(wp.dataUrl);

    const joinedArr = ls_get(KEY.joined, []) || [];
    state.joinedUsers = new Set(joinedArr);
}

function computeGifterStats(range){
    const now = Date.now();
    const cutoff = range === 'day' ? now - 24*60*60*1000 : now - 30*24*60*60*1000;
    const result = [];
    Object.values(state.giftStats || {}).forEach(u => {
        if (!u || !u.uid || !Array.isArray(u.history)) return;
        let total = 0, count = 0;
        u.history.forEach(h => { if (h && h.ts >= cutoff){ total += (h.amount || 0); count += 1; } });
        if (total > 0) result.push({ uid: u.uid, name: u.name || 'User', avatar: u.avatar || GUEST_AVATAR, total, count });
    });
    return result.sort((a, b) => b.total - a.total);
}