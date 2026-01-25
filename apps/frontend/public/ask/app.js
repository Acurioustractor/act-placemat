/**
 * ACT Ask - RAG Chat Interface
 *
 * A glassmorphic chat UI that queries the ACT knowledge base
 * using QA pairs exported from the compendium.
 */

// Configuration
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:4000'
  : '';

// Knowledge base (loaded from export)
let knowledgeBase = null;

// State
const state = {
  messages: [],
  isLoading: false,
  recentQuestions: []
};

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const connectionStatus = document.getElementById('connectionStatus');
const sourcesCard = document.getElementById('sourcesCard');
const sourcesList = document.getElementById('sourcesList');
const recentList = document.getElementById('recentList');

// Initialize
async function init() {
  // Load knowledge base
  await loadKnowledgeBase();

  // Set up event listeners
  setupEventListeners();

  // Load recent questions from localStorage
  loadRecentQuestions();

  console.log('ACT Ask initialized');
}

// Load knowledge base
async function loadKnowledgeBase() {
  try {
    connectionStatus.textContent = 'Loading...';
    connectionStatus.classList.add('loading');

    // Try to load from API first
    try {
      const response = await fetch(`${API_BASE}/api/v1/knowledge/qa`);
      if (response.ok) {
        knowledgeBase = await response.json();
        console.log(`Loaded ${knowledgeBase.pairs?.length || 0} QA pairs from API`);
      }
    } catch {
      console.log('API not available, using embedded knowledge');
    }

    // Fallback to embedded knowledge
    if (!knowledgeBase) {
      knowledgeBase = getEmbeddedKnowledge();
    }

    // Update stats
    document.getElementById('qaCount').textContent = knowledgeBase.pairs?.length || 0;

    connectionStatus.textContent = 'Ready';
    connectionStatus.classList.remove('loading');
  } catch (error) {
    console.error('Failed to load knowledge base:', error);
    connectionStatus.textContent = 'Limited Mode';
    knowledgeBase = getEmbeddedKnowledge();
  }
}

// Get embedded knowledge for offline/fallback mode
function getEmbeddedKnowledge() {
  return {
    pairs: [
      {
        question: "What is ACT?",
        answer: "ACT (Art. Connection. Truth.) is a regenerative studio based in Queensland, Australia, working with communities to build story sovereignty, community justice infrastructure, and sustainable enterprise systems. ACT uses the LCAA methodology (Listen, Curiosity, Action, Art) and prioritizes community authority over evidence.",
        source: "identity",
        type: "identity"
      },
      {
        question: "What is the LCAA methodology?",
        answer: "LCAA stands for Listen, Curiosity, Action, Art. It's ACT's core methodology: Listen (sit with community, don't assume), Curiosity (ask questions, explore without agenda), Action (build with community authority), Art (express and share the story). It's not linear—each phase informs the others.",
        source: "methodology",
        type: "methodology"
      },
      {
        question: "What is Empathy Ledger?",
        answer: "Empathy Ledger is ACT's consent-first storytelling platform for community voice. It enables story sovereignty—people own their stories, control how they're shared, and can benefit from their value. Stories are tagged with ALMA signals measuring impact across community dimensions.",
        source: "platform",
        type: "platform"
      },
      {
        question: "What is ALMA?",
        answer: "ALMA is ACT's impact measurement framework with 6 dimensions: Evidence Strength, Community Authority, Harm Risk (inverted), Implementation Capability, Option Value, and Community Value Return. Each dimension scores 1-5, with overall impact calculated as a weighted average.",
        source: "methodology",
        type: "methodology"
      },
      {
        question: "What is ACT Voice?",
        answer: "ACT Voice is the regenerative communication style ACT uses. Key principles: use 'with' not 'for', focus on community authority not ACT achievement, name place and people with consent, include the messiness not just success, and use growth metaphors not extraction language.",
        source: "identity",
        type: "identity"
      },
      {
        question: "What does 'designing for obsolescence' mean at ACT?",
        answer: "Designing for obsolescence means building systems that community can own and run without ACT. The goal is handover, not dependency. Every project should have a clear pathway to community ownership or graceful sunset.",
        source: "methodology",
        type: "methodology"
      },
      {
        question: "Where is ACT based?",
        answer: "ACT is based at Black Cockatoo Valley in the Sunshine Coast Hinterland, Queensland, Australia. The land practice includes regenerative R&D and serves as the studio's home base. ACT also works deeply with communities in Palm Island, Central Australia (Oonchiumpa), and other places.",
        source: "place",
        type: "place"
      },
      {
        question: "What is JusticeHub?",
        answer: "JusticeHub is ACT's community-owned justice infrastructure platform. It provides knowledge sharing, case management, and connection tools for youth justice, community justice reinvestment, and lived-experience practitioners.",
        source: "platform",
        type: "platform"
      },
      {
        question: "What is story sovereignty?",
        answer: "Story sovereignty means that people and communities own their stories. They control how stories are shared, who can access them, and whether they derive value from sharing. It's the foundation of Empathy Ledger and ACT's approach to storytelling.",
        source: "principles",
        type: "methodology"
      },
      {
        question: "What is The Harvest?",
        answer: "The Harvest is ACT's community market and connection space based at Witta, Sunshine Coast Hinterland. It brings together local producers, makers, and community members to build economic resilience through direct relationships rather than extractive supply chains.",
        source: "project",
        type: "project"
      }
    ]
  };
}

// Set up event listeners
function setupEventListeners() {
  // Send button
  sendBtn.addEventListener('click', handleSend);

  // Enter to send
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-resize textarea
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
  });

  // Suggestion chips
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const question = chip.dataset.question;
      chatInput.value = question;
      handleSend();
    });
  });

  // Recent questions
  document.querySelectorAll('.recent-item').forEach(item => {
    item.addEventListener('click', () => {
      const question = item.dataset.question;
      chatInput.value = question;
      handleSend();
    });
  });
}

// Handle send
async function handleSend() {
  const question = chatInput.value.trim();
  if (!question || state.isLoading) return;

  // Clear input
  chatInput.value = '';
  chatInput.style.height = 'auto';

  // Add user message
  addMessage('user', question);

  // Save to recent
  saveRecentQuestion(question);

  // Show loading
  state.isLoading = true;
  sendBtn.disabled = true;
  const loadingMessage = addLoadingMessage();

  try {
    // Search knowledge base
    const answer = await searchKnowledge(question);

    // Remove loading
    loadingMessage.remove();

    // Add assistant message
    addMessage('assistant', answer.text, answer.sources);

    // Show sources in sidebar
    showSources(answer.sources);
  } catch (error) {
    console.error('Error:', error);
    loadingMessage.remove();
    addMessage('assistant', "Sorry, I couldn't find a relevant answer. Try rephrasing your question or ask about ACT's projects, methodology, or principles.");
  } finally {
    state.isLoading = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// Search knowledge base
async function searchKnowledge(question) {
  const questionLower = question.toLowerCase();
  const questionWords = questionLower.split(/\s+/).filter(w => w.length > 2);

  // Score each QA pair
  const scored = knowledgeBase.pairs.map(pair => {
    let score = 0;
    const pairQuestion = pair.question.toLowerCase();
    const pairAnswer = pair.answer.toLowerCase();

    // Exact question match
    if (pairQuestion === questionLower) {
      score += 100;
    }

    // Question contains query
    if (pairQuestion.includes(questionLower)) {
      score += 50;
    }

    // Word matches
    questionWords.forEach(word => {
      if (pairQuestion.includes(word)) score += 10;
      if (pairAnswer.includes(word)) score += 5;
    });

    // Key term matches
    const keyTerms = ['lcaa', 'alma', 'empathy ledger', 'justicehub', 'act', 'methodology',
                      'story', 'community', 'palm island', 'oonchiumpa', 'harvest'];
    keyTerms.forEach(term => {
      if (questionLower.includes(term) && (pairQuestion.includes(term) || pairAnswer.includes(term))) {
        score += 20;
      }
    });

    return { ...pair, score };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Get top result
  const topResult = scored[0];

  if (topResult.score < 5) {
    // No good match - provide helpful response
    return {
      text: `I don't have specific information about "${question}" in my knowledge base. Here are some things I can help with:\n\n• **ACT** - What ACT is and how it works\n• **LCAA** - The Listen, Curiosity, Action, Art methodology\n• **Empathy Ledger** - Consent-first storytelling platform\n• **ALMA** - Impact measurement framework\n• **Projects** - JusticeHub, The Harvest, and more\n\nTry asking about one of these topics!`,
      sources: []
    };
  }

  // Collect related sources
  const sources = scored
    .filter(s => s.score > 5)
    .slice(0, 3)
    .map(s => ({
      title: s.question,
      source: s.source,
      type: s.type
    }));

  return {
    text: topResult.answer,
    sources
  };
}

// Add message to chat
function addMessage(role, text, sources = []) {
  const message = document.createElement('div');
  message.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = role === 'user' ? '👤' : '🌱';

  const content = document.createElement('div');
  content.className = 'message-content';

  const textDiv = document.createElement('div');
  textDiv.className = 'message-text';
  textDiv.innerHTML = formatText(text);
  content.appendChild(textDiv);

  // Add sources if available
  if (sources.length > 0) {
    const sourcesDiv = document.createElement('div');
    sourcesDiv.className = 'message-sources';
    sourcesDiv.innerHTML = `
      <div class="message-sources-title">Sources</div>
      ${sources.map(s => `<span class="source-tag">${s.type}</span>`).join('')}
    `;
    content.appendChild(sourcesDiv);
  }

  message.appendChild(avatar);
  message.appendChild(content);

  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return message;
}

// Add loading message
function addLoadingMessage() {
  const message = document.createElement('div');
  message.className = 'message assistant';
  message.innerHTML = `
    <div class="message-avatar">🌱</div>
    <div class="message-content">
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>
  `;

  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return message;
}

// Format text with markdown-like formatting
function formatText(text) {
  return text
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Lists
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    // Paragraphs
    .split('\n\n').map(p => {
      if (p.includes('<li>')) {
        return `<ul>${p}</ul>`;
      }
      return `<p>${p}</p>`;
    }).join('');
}

// Show sources in sidebar
function showSources(sources) {
  if (sources.length === 0) {
    sourcesCard.style.display = 'none';
    return;
  }

  sourcesCard.style.display = 'block';
  sourcesList.innerHTML = sources.map(s => `
    <div class="source-item">
      <div class="source-item-title">${s.title}</div>
      <div class="source-item-path">${s.source} • ${s.type}</div>
    </div>
  `).join('');
}

// Save recent question
function saveRecentQuestion(question) {
  state.recentQuestions = state.recentQuestions.filter(q => q !== question);
  state.recentQuestions.unshift(question);
  state.recentQuestions = state.recentQuestions.slice(0, 5);

  localStorage.setItem('act-ask-recent', JSON.stringify(state.recentQuestions));
  updateRecentList();
}

// Load recent questions
function loadRecentQuestions() {
  try {
    const stored = localStorage.getItem('act-ask-recent');
    if (stored) {
      state.recentQuestions = JSON.parse(stored);
      updateRecentList();
    }
  } catch {
    // Ignore
  }
}

// Update recent list UI
function updateRecentList() {
  if (state.recentQuestions.length === 0) return;

  recentList.innerHTML = state.recentQuestions.map(q => `
    <div class="recent-item" data-question="${q}">${q}</div>
  `).join('');

  // Re-attach listeners
  document.querySelectorAll('.recent-item').forEach(item => {
    item.addEventListener('click', () => {
      chatInput.value = item.dataset.question;
      handleSend();
    });
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
