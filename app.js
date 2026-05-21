/**
 * 「これって何県？」クイズゲーム - メインアプリケーションスクリプト
 * 
 * 役割:
 * 1. SPA（シングルページアプリケーション）画面制御
 * 2. ゲーム状態管理（モード、得点、コンボ、ライフ等）
 * 3. Web Audio API によるシンセサイザー効果音のリアルタイム合成
 * 4. HTML5 Canvas を使用した桜吹雪＆紙吹雪パーティクルシステム
 * 5. ローカルストレージを使用した「御朱印帳」とハイスコアの保存
 * 6. 47都道府県の地域別フィルタリングと御朱印帳レンダリング
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     1. CONSTANTS & SYSTEM CONFIGURATION
     ========================================================================== */
  
  // 東日本・西日本の定義（御朱印帳フィルタリング用）
  const EAST_JAPAN = new Set([
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"
  ]);

  const PREFECTURES_47 = [
    "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
    "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
    "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県",
    "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
    "鳥取県", "島根県", "岡山県", "広島県", "山口県",
    "徳島県", "香川県", "愛媛県", "高知県",
    "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
  ];
  const CLEAN_PREFECTURES = PREFECTURES_47;

  /* ==========================================================================
     2. STATE MANAGEMENT
     ========================================================================== */
  const state = {
    // 画面状態: 'home', 'quiz', 'result', 'stamps'
    currentScreen: 'home',
    
    // ゲーム設定・進行
    selectedMode: 'quick',      // 'quick' (10問), 'challenger' (30問), 'endless' (ライフ制)
    questionsQueue: [],         // シャッフルされた出題予定の配列
    currentQuestionIndex: 0,    // 現在の問題インデックス
    
    // プレイデータ
    score: 0,
    combo: 0,
    maxCombo: 0,
    lives: 3,                   // エンドレスモード時の残りライフ
    correctCount: 0,
    unlockedStampsThisRun: 0,   // 今回の挑戦で新しく獲得した御朱印の数
    lastCorrectPrefecture: "済", // 最後に正解した都道府県（結果のスタンプ印影用）
    isAnswered: false,          // 現在の問題に回答済みかどうか
    
    // 永続セーブデータ（ローカルストレージから復元）
    savedData: {
      highScore: 0,
      totalAnswered: 0,
      collectedStamps: {}       // 例: { "東京都": "2026-05-20 12:30", "千葉県": "..." }
    }
  };

  /* ==========================================================================
     3. DOM ELEMENTS
     ========================================================================== */
  const DOM = {
    // 画面要素
    screens: {
      home: document.getElementById('home-screen'),
      quiz: document.getElementById('quiz-screen'),
      result: document.getElementById('result-screen'),
      stamps: document.getElementById('stamps-screen')
    },
    
    // ボタン & ナビゲーション
    logo: document.getElementById('header-logo'),
    btnQuick: document.getElementById('btn-mode-quick'),
    btnChallenger: document.getElementById('btn-mode-challenger'),
    btnEndless: document.getElementById('btn-mode-endless'),
    btnGoStamps: document.getElementById('btn-go-stamps'),
    btnStampsBack: document.getElementById('btn-stamps-back'),
    
    // ホーム画面データ
    homeStampCount: document.getElementById('home-stamp-count'),
    homeHighScore: document.getElementById('home-high-score'),
    homeTotalAnswered: document.getElementById('home-total-answered'),
    
    // クイズ画面要素
    quizComboBadge: document.getElementById('quiz-combo-badge'),
    quizComboNum: document.getElementById('quiz-combo-num'),
    quizScoreVal: document.getElementById('quiz-score-val'),
    quizLivesContainer: document.getElementById('quiz-lives-container'),
    quizModeName: document.getElementById('quiz-mode-name'),
    quizCurrentIdx: document.getElementById('quiz-current-idx'),
    quizTotalIdx: document.getElementById('quiz-total-idx'),
    quizProgressBar: document.getElementById('quiz-progress-bar'),
    quizPrefHint: document.getElementById('quiz-pref-hint-region'),
    quizQuestionText: document.getElementById('quiz-question-text'),
    quizChoicesContainer: document.getElementById('quiz-choices-container'),
    quizExplanationPanel: document.getElementById('quiz-explanation-panel'),
    quizExplanationTitle: document.getElementById('quiz-explanation-title'),
    quizExplanationDesc: document.getElementById('quiz-explanation-desc'),
    btnQuizHint: document.getElementById('btn-quiz-hint'),
    btnQuizNext: document.getElementById('btn-quiz-next'),
    
    // 結果画面要素
    resultSealIcon: document.getElementById('result-seal-icon'),
    resultTitleText: document.getElementById('result-title-text'),
    resultScorePoints: document.getElementById('result-score-points'),
    resultFeedbackText: document.getElementById('result-feedback-text'),
    resultStatAccuracy: document.getElementById('result-stat-accuracy'),
    resultStatCombo: document.getElementById('result-stat-combo'),
    resultStatUnlocked: document.getElementById('result-stat-unlocked'),
    btnResultReplay: document.getElementById('btn-result-replay'),
    btnResultGoshuin: document.getElementById('btn-result-goshuin'),
    btnResultHome: document.getElementById('btn-result-home'),
    btnShareTwitter: document.getElementById('btn-share-twitter'),
    btnShareLine: document.getElementById('btn-share-line'),
    
    // 御朱印帳要素
    stampsProgressBadge: document.getElementById('stamps-progress-badge'),
    stampsGrid: document.getElementById('stamps-grid-element'),
    regionTabs: document.querySelectorAll('.view-tab'),
    
    // モーダル要素
    modalHint: document.getElementById('modal-hint'),
    modalHintText: document.getElementById('modal-hint-text'),
    btnModalHintClose: document.getElementById('btn-modal-hint-close')
  };

  /* ==========================================================================
     4. AUDIO SYNTH ENGINE (Web Audio API)
     ========================================================================== */
  class SoundSynth {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playTone(freq, type, duration, delay = 0) {
      this.init();
      if (!this.ctx) return;

      setTimeout(() => {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = type;
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
          
          gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
          // 音を徐々にフェードアウトさせて自然な余韻を作る
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start();
          osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
          console.warn("Audio Context playback blocked or unsupported.", e);
        }
      }, delay * 1000);
    }

    // 効果音: クリック音
    click() {
      this.playTone(800, 'sine', 0.1);
    }

    // 効果音: 正解音（明るい上昇アルペジオ）
    correct() {
      const base = 523.25; // C5
      this.playTone(base, 'sine', 0.15, 0);       // ド (C5)
      this.playTone(base * 1.25, 'sine', 0.15, 0.08); // ミ (E5)
      this.playTone(base * 1.5, 'sine', 0.15, 0.16);  // ソ (G5)
      this.playTone(base * 2, 'sine', 0.3, 0.24);    // ド (C6)
    }

    // 効果音: 不正解（低いブザー）
    incorrect() {
      this.playTone(220, 'sawtooth', 0.3); // A3 のノコギリ波
      this.playTone(207.65, 'sawtooth', 0.3, 0.05); // 短2度下がって濁る和音
    }

    // 効果音: コンボボーナス（ピッチが上がるチャイム）
    combo(comboCount) {
      const multiplier = Math.min(1.5, 1.0 + (comboCount * 0.05));
      const freq = 880 * multiplier;
      this.playTone(freq, 'sine', 0.1, 0);
      this.playTone(freq * 1.2, 'sine', 0.2, 0.06);
    }

    // 効果音: クイズクリア（豪華なファンファーレ）
    victory() {
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4~C6アルペジオ
      notes.forEach((freq, idx) => {
        this.playTone(freq, 'sine', 0.3, idx * 0.07);
      });
      // 最終和音
      setTimeout(() => {
        this.playTone(523.25, 'sine', 0.6, 0);
        this.playTone(659.25, 'sine', 0.6, 0);
        this.playTone(783.99, 'sine', 0.6, 0);
        this.playTone(1046.50, 'sine', 0.8, 0);
      }, notes.length * 70);
    }
  }

  const sound = new SoundSynth();

  /* ==========================================================================
     5. HTML5 CANVAS PARTICLE SYSTEM
     ========================================================================== */
  const canvas = document.getElementById('canvas-particles');
  const ctx = canvas.getContext('2d');
  
  let particles = [];
  let isRainingSakura = true; // ホーム画面などで穏やかに桜を降らせる

  // キャンバスリサイズ
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // パーティクルクラス
  class Particle {
    constructor(x, y, type = 'sakura') {
      this.x = x;
      this.y = y;
      this.type = type; // 'sakura' (桜の風情) もしくは 'confetti' (カラフルな紙吹雪)
      
      this.size = type === 'sakura' ? Math.random() * 8 + 6 : Math.random() * 10 + 6;
      this.speedX = type === 'sakura' ? Math.random() * 1.5 + 0.5 : Math.random() * 6 - 3;
      this.speedY = type === 'sakura' ? Math.random() * 1.5 + 1.0 : Math.random() * -6 - 2; // 紙吹雪は上方向に爆発
      
      this.gravity = type === 'sakura' ? 0.02 : 0.2;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = Math.random() * 2 - 1;
      
      // 色の設定
      if (type === 'sakura') {
        this.color = `rgba(255, ${Math.floor(Math.random() * 40 + 175)}, ${Math.floor(Math.random() * 40 + 195)}, ${Math.random() * 0.3 + 0.6})`;
      } else {
        const colors = [
          '#ff3e4e', // 朱赤
          '#ffd700', // ゴールド
          '#2ea44f', // 翡翠緑
          '#00b4d8', // 青
          '#ff70a6', // ピンク
          '#ff9f1c'  // オレンジ
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      this.opacity = 1;
      this.decay = type === 'sakura' ? 0.002 : Math.random() * 0.015 + 0.01;
    }

    update() {
      this.x += this.speedX;
      this.speedY += this.gravity;
      this.y += this.speedY;
      this.rotation += this.rotationSpeed;
      this.opacity -= this.decay;
      
      // 桜が画面外に出たら少しリサイクル
      if (this.type === 'sakura' && this.y > canvas.height) {
        if (isRainingSakura) {
          this.y = -10;
          this.x = Math.random() * canvas.width;
          this.opacity = Math.random() * 0.3 + 0.6;
          this.speedY = Math.random() * 1.5 + 1.0;
        } else {
          this.opacity = 0; // すぐに消滅させる
        }
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, this.opacity);
      ctx.fillStyle = this.color;

      if (this.type === 'sakura') {
        // 花びらのような楕円形を描画
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size / 2, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // 切り込みを入れてより桜っぽく
        ctx.beginPath();
        ctx.moveTo(this.size, 0);
        ctx.lineTo(this.size + 2, -2);
        ctx.lineTo(this.size + 2, 2);
        ctx.closePath();
        ctx.fill();
      } else {
        // 四角形の紙吹雪
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
      }
      ctx.restore();
    }
  }

  // 背景で穏やかに降る桜花
  function initSakuraRain() {
    particles = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(Math.random() * canvas.width, Math.random() * canvas.height, 'sakura'));
    }
  }

  // 正解時の紙吹雪 / 桜爆発エフェクト
  function spawnSplash(type = 'confetti') {
    const splashCount = type === 'confetti' ? 80 : 50;
    const spawnX = canvas.width / 2;
    const spawnY = canvas.height * 0.6;
    for (let i = 0; i < splashCount; i++) {
      // 画面中央下から上に向かって勢いよく拡散
      particles.push(new Particle(
        spawnX + (Math.random() * 60 - 30), 
        spawnY + (Math.random() * 60 - 30), 
        type
      ));
    }
  }

  // アニメーションループ
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // パーティクルの更新と描画
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw();
      
      // 不透明度が0になったパーティクルを削除（ただし、背景桜はリサイクルされるため除く）
      if (p.opacity <= 0) {
        particles.splice(i, 1);
      }
    }

    // 穏やかな桜の数が減ったら追加する（背景レインがオンのときのみ）
    if (isRainingSakura) {
      const currentSakuraCount = particles.filter(p => p.type === 'sakura').length;
      if (currentSakuraCount < 35) {
        particles.push(new Particle(Math.random() * canvas.width, -20, 'sakura'));
      }
    }

    requestAnimationFrame(animate);
  }

  // 初期化とループ開始
  initSakuraRain();
  animate();

  /* ==========================================================================
     6. SAVE DATA / LOCAL STORAGE ENGINE
     ========================================================================== */
  const SAVE_KEY = 'KORETTE_NANI_KEN_SAVE_DATA_v1';

  function loadSavedData() {
    try {
      const json = localStorage.getItem(SAVE_KEY);
      if (json) {
        const parsed = JSON.parse(json);
        state.savedData = {
          highScore: parsed.highScore || 0,
          totalAnswered: parsed.totalAnswered || 0,
          collectedStamps: parsed.collectedStamps || {}
        };
      }
    } catch (e) {
      console.error("Local Storage reading failed. Sandboxed environment?", e);
    }
    updateHomeStatsUI();
  }

  function saveGameData() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state.savedData));
    } catch (e) {
      console.warn("Saving to Local Storage failed.", e);
    }
  }

  function updateHomeStatsUI() {
    // 獲得しているユニークな都道府県の数を計算
    const unlockedCount = Object.keys(state.savedData.collectedStamps).length;
    DOM.homeStampCount.textContent = `${unlockedCount} / 47`;
    DOM.homeHighScore.textContent = state.savedData.highScore;
    DOM.homeTotalAnswered.textContent = state.savedData.totalAnswered;
  }

  // ローカルストレージデータの読み込み
  loadSavedData();

  /* ==========================================================================
     7. SPA SCREEN NAVIGATOR
     ========================================================================== */
  function showScreen(screenId) {
    sound.click();
    
    // 背景アニメーションの最適化
    if (screenId === 'quiz') {
      isRainingSakura = false; // クイズ中は集中できるように背景桜を一時停止
      particles = particles.filter(p => p.type !== 'sakura');
    } else {
      isRainingSakura = true; // それ以外は和の雰囲気を出すため桜を降らせる
    }

    // 全画面を非アクティブにして指定画面をアクティブにする
    Object.keys(DOM.screens).forEach(key => {
      const screen = DOM.screens[key];
      if (key === screenId) {
        screen.classList.add('active');
      } else {
        screen.classList.remove('active');
      }
    });

    state.currentScreen = screenId;

    // 画面固有の更新処理
    if (screenId === 'home') {
      updateHomeStatsUI();
    } else if (screenId === 'stamps') {
      renderStampsGrid('all');
    }
  }

  /* ==========================================================================
     8. QUIZ ENGINE LOGIC
     ========================================================================== */
  
  // クイズを開始
  function startQuiz(mode) {
    state.selectedMode = mode;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.correctCount = 0;
    state.unlockedStampsThisRun = 0;
    state.currentQuestionIndex = 0;
    state.isAnswered = false;

    // 問題プールをシャッフル
    const shuffledPool = [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5);

    if (mode === 'quick') {
      // 10問抽出
      state.questionsQueue = shuffledPool.slice(0, 10);
      DOM.quizModeName.textContent = "おてがる10問";
      DOM.quizLivesContainer.style.display = "none";
    } else if (mode === 'challenger') {
      // 30問抽出
      state.questionsQueue = shuffledPool.slice(0, 30);
      DOM.quizModeName.textContent = "じっくり30問";
      DOM.quizLivesContainer.style.display = "none";
    } else if (mode === 'endless') {
      // 全ての問題を利用し、3ライフ制
      state.questionsQueue = shuffledPool; // 全問
      state.lives = 3;
      DOM.quizModeName.textContent = "全問挑戦 (ライフ制)";
      DOM.quizLivesContainer.style.display = "flex";
      updateLivesUI();
    }

    DOM.quizTotalIdx.textContent = state.questionsQueue.length;
    DOM.quizScoreVal.textContent = "0";
    DOM.quizComboBadge.classList.remove('active');

    loadQuestion(0);
    showScreen('quiz');
  }

  // ライフ表示の更新（Endless用）
  function updateLivesUI() {
    const hearts = DOM.quizLivesContainer.querySelectorAll('.life-heart');
    hearts.forEach(heart => {
      const lifeIdx = parseInt(heart.getAttribute('data-life'));
      if (lifeIdx <= state.lives) {
        heart.classList.remove('lost');
      } else {
        heart.classList.add('lost');
      }
    });
  }

  // 問題を読み込む
  function loadQuestion(index) {
    state.isAnswered = false;
    DOM.btnQuizNext.setAttribute('disabled', 'true');
    DOM.quizExplanationPanel.style.display = "none";

    const question = state.questionsQueue[index];
    if (!question) {
      endQuiz();
      return;
    }

    // UI更新
    DOM.quizCurrentIdx.textContent = index + 1;
    
    // 進捗プログレスバー
    const progressPercent = (index / state.questionsQueue.length) * 100;
    DOM.quizProgressBar.style.width = `${progressPercent}%`;

    // 地域・カテゴリ情報を自動判別してバッジに表示
    const isEast = EAST_JAPAN.has(question.prefecture);
    DOM.quizPrefHint.textContent = isEast ? "地方ヒント: 東日本エリア" : "地方ヒント: 西日本エリア";
    DOM.quizQuestionText.textContent = question.question;

    // 選択肢の描画（選択肢をシャッフル）
    const shuffledChoices = [...question.choices].sort(() => Math.random() - 0.5);
    
    DOM.quizChoicesContainer.innerHTML = '';
    shuffledChoices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `
        <span><span class="choice-num">${idx + 1}</span>${choice}</span>
        <i class="fa-solid fa-circle-check choice-status-icon"></i>
      `;
      btn.addEventListener('click', () => handleAnswer(choice, btn));
      DOM.quizChoicesContainer.appendChild(btn);
    });

    // 次へボタンのラベル調整
    if (index === state.questionsQueue.length - 1) {
      DOM.btnQuizNext.innerHTML = `結果発表 <i class="fa-solid fa-flag-checkered"></i>`;
    } else {
      DOM.btnQuizNext.innerHTML = `次に進む <i class="fa-solid fa-arrow-right"></i>`;
    }
  }

  // 回答を選択したときの処理
  function handleAnswer(selectedText, selectedBtn) {
    if (state.isAnswered) return;
    state.isAnswered = true;

    const question = state.questionsQueue[state.currentQuestionIndex];
    const choiceButtons = DOM.quizChoicesContainer.querySelectorAll('.choice-btn');

    // ローカルストレージ用の総解答数加算
    state.savedData.totalAnswered += 1;

    if (selectedText === question.answer) {
      // ーーー 正解！ ーーー
      sound.correct();
      state.correctCount += 1;
      state.combo += 1;
      
      if (state.combo > state.maxCombo) {
        state.maxCombo = state.combo;
      }

      // 得点計算: 基本点 100点 + コンボボーナス（コンボ数 * 10）
      const basePoints = 100;
      const comboBonus = (state.combo - 1) * 10;
      const pointsEarned = basePoints + comboBonus;
      state.score += pointsEarned;
      DOM.quizScoreVal.textContent = state.score;

      // 正解のエフェクト (コンボ数が多いほどたくさん飛ばす)
      if (state.combo >= 5) {
        spawnSplash('confetti'); // 5コンボ以上でカラフル紙吹雪
        sound.combo(state.combo);
      } else {
        spawnSplash('confetti'); // 通常もカラフル紙吹雪にする（桜はクイズ画面から排除）
      }

      // コンボバッジ表示
      if (state.combo > 1) {
        DOM.quizComboNum.textContent = state.combo;
        DOM.quizComboBadge.classList.add('active');
      }

      // ボタンのスタイル変更
      selectedBtn.classList.add('correct');

      // 御朱印獲得処理
      registerStamp(question.prefecture);
      state.lastCorrectPrefecture = question.prefecture;

      // 解説パネルの表示
      showExplanation(true, question.prefecture, question.explanation);

    } else {
      // ーーー 不正解... ーーー
      sound.incorrect();
      state.combo = 0;
      DOM.quizComboBadge.classList.remove('active');

      // 画面の揺れ
      DOM.screens.quiz.querySelector('.glass-card').classList.add('shake-anim');
      setTimeout(() => {
        DOM.screens.quiz.querySelector('.glass-card').classList.remove('shake-anim');
      }, 500);

      // スタイル変更: 間違えたボタンを赤、正解のボタンを緑にする
      selectedBtn.classList.add('incorrect');
      choiceButtons.forEach(btn => {
        const text = btn.textContent.replace(/[0-9\s]/g, '').trim(); // 数字と余白を除外して県名のみにする
        if (text === question.answer) {
          btn.classList.add('correct');
        }
      });

      // ライフの減少 (エンドレスモードのみ)
      if (state.selectedMode === 'endless') {
        state.lives -= 1;
        updateLivesUI();
        if (state.lives <= 0) {
          // ライフゼロの場合は次に進むボタンを「結果発表」にしてクイズを強制終了へ
          DOM.btnQuizNext.innerHTML = `結果発表 <i class="fa-solid fa-flag-checkered"></i>`;
        }
      }

      // 解説パネル表示
      showExplanation(false, question.prefecture, question.explanation);
    }

    // 他の全てのボタンを無効化（ディム状態に）
    choiceButtons.forEach(btn => {
      btn.setAttribute('disabled', 'true');
      if (!btn.classList.contains('correct') && !btn.classList.contains('incorrect')) {
        btn.classList.add('dimmed');
      }
    });

    // 次へボタンの有効化
    DOM.btnQuizNext.removeAttribute('disabled');
    saveGameData();

    // 解説パネルや「次に進む」ボタンが確実に画面に入るようスムーズスクロール
    setTimeout(() => {
      DOM.btnQuizNext.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  }

  // 御朱印の登録処理
  function registerStamp(prefectureName) {
    if (!state.savedData.collectedStamps[prefectureName]) {
      // 新規獲得！
      const now = new Date();
      const dateStr = `${String(now.getFullYear()).substring(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
      state.savedData.collectedStamps[prefectureName] = dateStr;
      state.unlockedStampsThisRun += 1;
    }
  }

  // 解説の表示
  function showExplanation(isCorrect, prefecture, text) {
    DOM.quizExplanationPanel.style.display = "block";
    if (isCorrect) {
      DOM.quizExplanationTitle.className = "explanation-title correct-text";
      DOM.quizExplanationTitle.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>正解！ 【${prefecture}】</span>`;
    } else {
      DOM.quizExplanationTitle.className = "explanation-title incorrect-text";
      DOM.quizExplanationTitle.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>残念！ 正解は【${prefecture}】</span>`;
    }
    DOM.quizExplanationDesc.textContent = text;
  }

  // 次の問題へ
  function nextQuestion() {
    // ライフ切れ、または問題終了判定
    if ((state.selectedMode === 'endless' && state.lives <= 0) || 
        (state.currentQuestionIndex === state.questionsQueue.length - 1)) {
      endQuiz();
    } else {
      state.currentQuestionIndex += 1;
      loadQuestion(state.currentQuestionIndex);
    }
  }

  // クイズ終了、リザルト描画
  function endQuiz() {
    sound.victory();
    spawnSplash('confetti'); // 大量の祝祭紙吹雪

    // 最終プログレスバーを100%に
    DOM.quizProgressBar.style.width = `100%`;

    // 得点表示とハイスコア更新
    DOM.resultScorePoints.textContent = `${state.score} 点`;
    if (state.score > state.savedData.highScore) {
      state.savedData.highScore = state.score;
      DOM.resultTitleText.textContent = "🏆 ハイスコア更新！ 🏆";
      DOM.resultTitleText.style.color = "var(--color-gold)";
    } else {
      DOM.resultTitleText.textContent = "挑戦完了！";
      DOM.resultTitleText.style.color = "var(--color-text)";
    }

    // 正解率計算
    const answeredCount = state.selectedMode === 'endless' 
      ? (state.currentQuestionIndex + 1) // 途中で終了した可能性があるため
      : state.questionsQueue.length;
    
    const accuracy = Math.round((state.correctCount / answeredCount) * 100);
    DOM.resultStatAccuracy.textContent = `${accuracy}%`;
    DOM.resultStatCombo.textContent = `${state.maxCombo}回`;
    DOM.resultStatUnlocked.textContent = `${state.unlockedStampsThisRun}枚`;

    // 最後に正解した県の文字を朱印印影にする
    const sealChar = state.lastCorrectPrefecture ? state.lastCorrectPrefecture.charAt(0) : "済";
    DOM.resultSealIcon.textContent = sealChar;

    // フィードバックテキストの設定
    let feedback = "";
    if (accuracy === 100) {
      feedback = "完璧です！あなたは非の打ち所がない『都道府県の生き神様』です！";
    } else if (accuracy >= 80) {
      feedback = "素晴らしい！都道府県マスターの風格が漂っています！";
    } else if (accuracy >= 50) {
      feedback = "お見事！日本全国の地理・雑学にかなり精通していますね。";
    } else {
      feedback = "挑戦お疲れ様でした！もう一度遊んで、もっとたくさんの知識を身につけましょう！";
    }
    DOM.resultFeedbackText.textContent = feedback;

    // 共有リンクの作成
    setupShareLinks(accuracy);

    // 状態の永続保存
    saveGameData();

    // 画面遷移
    showScreen('result');
  }

  // SNS共有用リンクのセットアップ
  function setupShareLinks(accuracy) {
    const unlockedTotal = Object.keys(state.savedData.collectedStamps).length;
    const modeName = state.selectedMode === 'quick' ? 'おてがる10問' 
                   : state.selectedMode === 'challenger' ? 'じっくり30問' 
                   : '全問挑戦(ライフ制)';

    const shareText = `これって何県？都道府県クイズの「${modeName}」に挑戦！\n【得点: ${state.score}点 (正解率: ${accuracy}%)】を獲得！\n新しく御朱印スタンプを ${state.unlockedStampsThisRun} 個集めました！\n(累計収集数: 47都道府県中 ${unlockedTotal}個)\nみんなも挑戦して御朱印帳をコンプリートしよう！\n`;
    const shareUrl = window.location.href;

    // Twitter (X) Share URL
    DOM.btnShareTwitter.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent('これって何県,クイズ,都道府県')}`;

    // LINE Share URL
    DOM.btnShareLine.href = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  }

  /* ==========================================================================
     9. GOSHUINCHO (STAMP BOOK) RENDERING
     ========================================================================== */
  function renderStampsGrid(filterRegion = 'all') {
    DOM.stampsGrid.innerHTML = '';
    
    // 現在の進捗バッジ更新
    const totalUnlocked = Object.keys(state.savedData.collectedStamps).length;
    DOM.stampsProgressBadge.textContent = `${totalUnlocked} / 47`;

    // 47都道府県すべてループして描画
    CLEAN_PREFECTURES.forEach(pref => {
      const isUnlocked = !!state.savedData.collectedStamps[pref];
      const dateStr = state.savedData.collectedStamps[pref] || '';

      // 地域フィルタリング
      const isEast = EAST_JAPAN.has(pref);
      if (filterRegion === 'east' && !isEast) return;
      if (filterRegion === 'west' && isEast) return;

      const cell = document.createElement('div');
      cell.className = `stamp-cell ${isUnlocked ? 'unlocked' : 'locked'}`;
      
      const sealChar = pref.charAt(0); // 都道府県の頭文字 (例: 東, 北, 京)
      
      cell.innerHTML = `
        <div class="goshuin-seal">${sealChar}</div>
        <div class="stamp-pref-name">${pref}</div>
        ${isUnlocked ? `<div class="stamp-date">${dateStr}</div>` : ''}
      `;

      // ロック・アンロックに合わせたツールチップタイトルの付与
      if (isUnlocked) {
        cell.title = `【${pref}】\n獲得日: ${dateStr}\nクイズに正解して無事回収されました！`;
      } else {
        cell.title = `【${pref}】\n未獲得です。クイズでこの都道府県が正解の問題が出たら、正しく当ててスタンプを回収しましょう！`;
      }

      DOM.stampsGrid.appendChild(cell);
    });

    // 万が一該当都道府県がない場合
    if (DOM.stampsGrid.children.length === 0) {
      DOM.stampsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--color-text-subtle); padding: 2rem;">該当する都道府県がありません。</div>`;
    }
  }

  /* ==========================================================================
     10. MODALS LOGIC
     ========================================================================== */
  function showHintModal() {
    sound.click();
    const question = state.questionsQueue[state.currentQuestionIndex];
    if (question) {
      DOM.modalHintText.textContent = question.hint;
      DOM.modalHint.classList.add('active');
    }
  }

  function closeHintModal() {
    sound.click();
    DOM.modalHint.classList.remove('active');
  }

  /* ==========================================================================
     11. EVENT LISTENERS
     ========================================================================== */
  
  // ロゴクリックでトップへ戻る
  DOM.logo.addEventListener('click', () => {
    if (state.currentScreen === 'quiz') {
      if (confirm('クイズの途中ですが、トップメニューに戻りますか？\n（現在のクイズの進行状況は破棄されます）')) {
        showScreen('home');
      }
    } else {
      showScreen('home');
    }
  });

  // クイズ中のページ離脱（リロードやタブ閉じるなど）防止
  window.addEventListener('beforeunload', (e) => {
    if (state.currentScreen === 'quiz') {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ゲームモード選択
  DOM.btnQuick.addEventListener('click', () => startQuiz('quick'));
  DOM.btnChallenger.addEventListener('click', () => startQuiz('challenger'));
  DOM.btnEndless.addEventListener('click', () => startQuiz('endless'));

  // ナビゲーション
  DOM.btnGoStamps.addEventListener('click', () => showScreen('stamps'));
  DOM.btnStampsBack.addEventListener('click', () => showScreen('home'));

  // クイズ画面アクション
  DOM.btnQuizHint.addEventListener('click', showHintModal);
  DOM.btnQuizNext.addEventListener('click', () => {
    sound.click();
    nextQuestion();
  });

  // 結果画面アクション
  DOM.btnResultReplay.addEventListener('click', () => startQuiz(state.selectedMode));
  DOM.btnResultGoshuin.addEventListener('click', () => showScreen('stamps'));
  DOM.btnResultHome.addEventListener('click', () => showScreen('home'));

  // 御朱印帳地域切り替え
  DOM.regionTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      DOM.regionTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const region = tab.getAttribute('data-region');
      renderStampsGrid(region);
    });
  });

  // モーダルクローズ
  DOM.btnModalHintClose.addEventListener('click', closeHintModal);
  DOM.modalHint.addEventListener('click', (e) => {
    if (e.target === DOM.modalHint) {
      closeHintModal();
    }
  });

});
