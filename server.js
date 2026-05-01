require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./database');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('__dirname')); // Servir arquivos estáticos da pasta public

// Configuração do Google Gemini
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Prompt do sistema com as regras de negócio da loja
const systemInstruction = `Você é um assistente virtual de atendimento ao cliente para uma loja virtual. 
Sua função é responder dúvidas de clientes de forma educada, clara e objetiva.

Informações da loja:
1. Produtos: A loja vende produtos personalizados.
2. Prazo de entrega: O prazo padrão de entrega é de 5 dias.
3. Formas de pagamento: Aceitamos apenas pagamento via Pix.
4. Política de troca: Não aceitamos trocas ou devoluções (não tem troca).

Instruções adicionais:
- Responda apenas com base nas informações fornecidas acima.
- Se o cliente perguntar algo fora do escopo da loja ou não coberto por essas informações, informe educadamente que você não tem essa informação no momento e que ele deve aguardar o contato de um atendente humano.
- Seja amigável e utilize emojis contextuais quando apropriado.
- Mantenha respostas curtas e diretas.`;

// Armazenamento em memória das instâncias de chat para manter o histórico da conversa com o Gemini
const chatSessions = new Map();

app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
        return res.status(400).json({ error: 'Message e sessionId são obrigatórios.' });
    }

    if (!apiKey || apiKey === 'COLOQUE_SUA_CHAVE_AQUI') {
        return res.status(500).json({ error: 'Chave da API do Gemini não configurada no servidor. Por favor, configure o arquivo .env.' });
    }

    try {
        let chat = chatSessions.get(sessionId);

        // Se for uma nova sessão, inicializa o chat com o histórico vazio
        if (!chat) {
            const model = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                systemInstruction: systemInstruction 
            });
            chat = model.startChat({
                history: []
            });
            chatSessions.set(sessionId, chat);
        }

        // Envia a mensagem para o modelo
        const result = await chat.sendMessage(message);
        const aiResponse = result.response.text();

        // Salva a conversa no banco de dados SQLite
        db.run(
            'INSERT INTO conversations (session_id, user_message, ai_response) VALUES (?, ?, ?)',
            [sessionId, message, aiResponse],
            function(err) {
                if (err) {
                    console.error('Erro ao salvar conversa:', err.message);
                    // Não vamos retornar erro para o usuário se falhar ao salvar, apenas logar
                }
            }
        );

        res.json({ response: aiResponse });

    } catch (error) {
        console.error('Erro na API do Gemini:', error);
        res.status(500).json({ error: 'Ocorreu um erro ao processar sua mensagem.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta http://localhost:${port}`);
});
