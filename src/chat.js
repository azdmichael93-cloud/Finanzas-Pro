// Simple per-user per-record chat (frontend only, localStorage)
(function(){
  const getUserId = () => sessionStorage.getItem('user_id') || 'guest';
  let activeRecordId = null;

  function getChatKey(userId, recordId){ return `chat_${userId}_${recordId}`; }
  function loadChat(userId, recordId){
    const key = getChatKey(userId, recordId);
    try{ return JSON.parse(localStorage.getItem(key) || '[]'); }catch{ return []; }
  }
  function saveChat(userId, recordId, messages){ localStorage.setItem(getChatKey(userId, recordId), JSON.stringify(messages)); }

  window.openChat = function(recordId){
    activeRecordId = recordId;
    const userId = getUserId();
    const messages = loadChat(userId, recordId);
    renderChat(recordId, messages);
    const el = document.getElementById('mChat'); if (el) { el.style.display='block'; el.classList.add('active'); }
    const ahorro = (window.appState?.finanzasPersonales?.ahorros || []).find(a => String(a.id) === String(recordId));
    const titleEl = document.getElementById('chatTitle');
    if (titleEl) titleEl.innerText = ahorro && ahorro.desc ? `Chat - ${ahorro.desc}` : 'Chat';
  };

  window.renderChat = function(recordId, messages){
    const box = document.getElementById('chatMessages');
    if (!box) return;
    const msgs = messages || loadChat(getUserId(), recordId);
    box.innerHTML = msgs.map(m => `<div style="margin:6px 0; padding:6px 8px; border-radius:6px; background:${m.sender==='user'?'#1a2c5a':'#234'};
      "><strong>${m.sender==='user'?'Yo':'Bot'}</strong>: ${m.text}</div>`).join('');
    box.scrollTop = box.scrollHeight;
  };

  window.addUserMessage = function(recordId, text){
    const userId = getUserId();
    let messages = loadChat(userId, recordId);
    messages.push({sender:'user', text, ts:new Date().toISOString()});
    const bot = botReply(text, recordId, messages);
    messages.push({sender:'bot', text: bot, ts:new Date().toISOString()});
    saveChat(userId, recordId, messages);
    renderChat(recordId, messages);
  };

  window.botReply = function(userMessage, recordId, context){
    const msg = (userMessage||'').toLowerCase();
    const ahorro = (window.appState?.finanzasPersonales?.ahorros || []).find(a => String(a.id) === String(recordId));
    const balance = ahorro?.currentBalance ?? ahorro?.monto ?? 0;
    if (msg.includes('saldo') || msg.includes('balance')) {
      return `Saldo actual de este ahorro: RD$ ${balance.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    }
    if (msg.includes('proyección')) {
      return 'La proyección de este ahorro se actualiza en Proyección Anual.';
    }
    if (msg.includes('próximo') || msg.includes('prox')) {
      const gastos = window.appState?.finanzasPersonales?.gastosFijos || [];
      const today = new Date();
      const day = today.getDate();
      const next = gastos.map(g => g.day).filter(d => d >= day).sort((a,b)=>a-b)[0];
      return next ? `Próximo vencimiento de gastos fijos: Día ${next}` : 'Sin próximos vencimientos registrados';
    }
    if (msg.includes('ahorro') || msg.includes('consejo') || msg.includes('recom')) {
      if (balance > 10000) return 'Buen progreso. Considera un fondo de emergencias de 3 a 6 meses.'; 
      return 'Consejo: automatiza tus ahorros y define objetivos claros por fondo.';
    }
    return 'Estoy aquí para ayudarte con tus ahorros. Pregunta por saldo, proyección y próximos pagos.';
  };

  window.sendChatMessage = function(){
    const input = document.getElementById('chatInput');
    if (!input) return; const text = input.value.trim(); if (!text) return; const recordId = window.__activeChatRecordId; if (!recordId) return; addUserMessage(recordId, text); input.value='';
  };

  window.closeChat = function(){ const el = document.getElementById('mChat'); if (el){ el.style.display='none'; el.classList.remove('active'); } };
})();
