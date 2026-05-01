document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const clearBtn = document.getElementById('clear-chat');
    const typingTemplate = document.getElementById('typing-template');

    // Gera um ID de sessão simples (em produção seria melhor um UUID ou associado ao login)
    let sessionId = localStorage.getItem('chat_session_id');
    if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('chat_session_id', sessionId);
    }

    // Mensagem de boas vindas
    setTimeout(() => {
        addMessage('Olá! Sou a Lumi, assistente da loja. Como posso ajudar você hoje? 😊', 'ai');
    }, 500);

    function scrollToBottom() {
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);
        
        // Simples substituição de quebras de linha por <br> (se houver formatação vinda da IA)
        const formattedText = text.replace(/\n/g, '<br>');
        msgDiv.innerHTML = formattedText;
        
        chatBox.appendChild(msgDiv);
        scrollToBottom();
    }

    function showTyping() {
        const clone = typingTemplate.content.cloneNode(true);
        chatBox.appendChild(clone);
        scrollToBottom();
    }

    function removeTyping() {
        const typingMsg = document.querySelector('.typing-message');
        if (typingMsg) {
            typingMsg.remove();
        }
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Adiciona a mensagem do usuário na tela
        addMessage(message, 'user');
        userInput.value = '';
        
        // Mostra o indicador de digitando
        showTyping();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    sessionId: sessionId
                })
            });

            removeTyping();

            const data = await response.json();

            if (response.ok) {
                addMessage(data.response, 'ai');
            } else {
                addMessage('Desculpe, ocorreu um erro na comunicação: ' + (data.error || 'Erro desconhecido'), 'ai');
            }
        } catch (error) {
            removeTyping();
            addMessage('Erro de conexão. Verifique se o servidor está rodando e a internet está conectada.', 'ai');
            console.error('Erro:', error);
        }
    }

    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    clearBtn.addEventListener('click', () => {
        if (confirm('Deseja limpar o histórico atual desta conversa na tela?')) {
            chatBox.innerHTML = '';
            // Limpa a sessão local para começar uma nova no backend
            sessionId = Math.random().toString(36).substring(2, 15);
            localStorage.setItem('chat_session_id', sessionId);
            
            setTimeout(() => {
                addMessage('Nova conversa iniciada! Como posso ajudar?', 'ai');
            }, 300);
        }
    });
});
