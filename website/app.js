/**
 * AyushMuzic — Standalone Official Website Interactive Engine
 * Handles smooth scrolling, audio player simulation, synced lyrics,
 * interactive listening receipt generation, platform detection, and FAQ accordion.
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initHeroButtons();
  initPlayerDemo();
  initReceiptEngine();
  initEqualizerDemo();
  initPlatformTabs();
  initFaqAccordion();
  initChecksumCopy();
});

/* ============================================================== */
/* 1. NAVBAR & NAVIGATION ACTIVE SPY                              */
/* ============================================================== */
function initNavbar() {
  const header = document.getElementById('navbar');
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const mobileNav = document.getElementById('mobileNav');
  const mobileClose = document.getElementById('mobileCloseBtn');
  const mobileLinks = document.querySelectorAll('.mobile-menu-item, .mobile-nav-cta a');
  const navLinks = document.querySelectorAll('.nav-links .nav-link');
  const sections = document.querySelectorAll('section[id], header[id]');

  // Scroll spy for sticky header shadow and active link
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    let current = '';
    const scrollPos = window.scrollY + 140;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  // Mobile menu open / close
  if (mobileBtn && mobileNav) {
    mobileBtn.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('open');
      mobileBtn.setAttribute('aria-expanded', isOpen);
    });

    if (mobileClose) {
      mobileClose.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        mobileBtn.setAttribute('aria-expanded', 'false');
      });
    }

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        mobileBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

/* ============================================================== */
/* 2. HERO PRIMARY BUTTONS (Explore & Download)                    */
/* ============================================================== */
function initHeroButtons() {
  const btnExplore = document.getElementById('heroBtnExplore');
  const btnDownload = document.getElementById('heroBtnDownload');

  if (btnExplore) {
    btnExplore.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById('explore');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        // Give a subtle highlight pulse
        target.classList.add('highlight-pulse');
        setTimeout(() => target.classList.remove('highlight-pulse'), 1200);
      }
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById('download');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        // Auto-detect OS to highlight best platform
        detectAndSwitchPlatform();
      }
    });
  }
}

/**
 * Auto-detect user operating system and open the corresponding tab
 */
function detectAndSwitchPlatform() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  let targetPlatform = 'android'; // Default

  if (userAgent.indexOf('win') !== -1) {
    targetPlatform = 'windows';
  } else if (userAgent.indexOf('android') !== -1) {
    targetPlatform = 'android';
  } else if (userAgent.indexOf('mac') !== -1 || userAgent.indexOf('linux') !== -1) {
    targetPlatform = 'desktop-other';
  }

  const tabBtn = document.querySelector(`.platform-tab-btn[data-platform="${targetPlatform}"]`);
  if (tabBtn) {
    tabBtn.click();
  }
}

/* ============================================================== */
/* 3. INTERACTIVE PLAYER & SYNCED LYRICS DEMO                     */
/* ============================================================== */
const DEMO_SONGS = [
  {
    title: 'Starboy',
    artist: 'The Weeknd ft. Daft Punk',
    duration: 230,
    art: '/website/assets/starboy_square.jpg',
    audioSrc: '/website/assets/starboy.mp3',
    haloColor: 'radial-gradient(circle, #8b5cf6 0%, #ec4899 60%, transparent 75%)',
    lyrics: [
      { time: 0, text: "(Intro — Daft Punk synthesizer pulse)" },
      { time: 14, text: "I'm tryna put you in the worst mood, ah" },
      { time: 17, text: "P1 cleaner than your church shoes, ah" },
      { time: 21, text: "Milli point two just to hurt you, ah" },
      { time: 24, text: "All red Lamb' just to tease you, ah" },
      { time: 27, text: "None of these toys on lease too, ah" },
      { time: 31, text: "Made your whole year in a week too, yah" },
      { time: 34, text: "Main bitch out your league too, ah" },
      { time: 38, text: "Side bitch out of your league too, ah" },
      { time: 41, text: "Look what you've done" },
      { time: 44, text: "I'm a motherfuckin' starboy", highlight: true },
      { time: 48, text: "Look what you've done" },
      { time: 51, text: "I'm a motherfuckin' starboy", highlight: true },
      { time: 58, text: "Every day a nigga try to test me, ah" },
      { time: 61, text: "Every day a nigga try to end me, ah" },
      { time: 65, text: "Pull up in that Roadster SV, ah" },
      { time: 68, text: "Pockets overweight, gettin' hefty, ah" },
      { time: 71, text: "Coming for the king, that's a far cry, ah" },
      { time: 75, text: "I come alive in the fall time, I" },
      { time: 78, text: "No competition, don't hesitate" },
      { time: 82, text: "Let myself down, yeah, they all lie" },
      { time: 85, text: "Look what you've done" },
      { time: 88, text: "I'm a motherfuckin' starboy", highlight: true },
      { time: 92, text: "Look what you've done" },
      { time: 95, text: "I'm a motherfuckin' starboy", highlight: true },
      { time: 102, text: "Switch up my style, I take any lane" },
      { time: 105, text: "I switch up my cup, I kill any pain" },
      { time: 109, text: "Look what you've done" },
      { time: 112, text: "I'm a motherfuckin' starboy", highlight: true },
      { time: 115, text: "Look what you've done" },
      { time: 119, text: "I'm a motherfuckin' starboy", highlight: true },
      { time: 126, text: "(Guitar & Synth Bridge)" },
      { time: 139, text: "Let a nigga brag Albuquerque" },
      { time: 142, text: "Made the cover of the Forbes with no degree" },
      { time: 146, text: "House so empty, need a centerpiece" },
      { time: 149, text: "20 racks a table cut from ebony" },
      { time: 153, text: "Cut that ivory into skinny pieces" },
      { time: 156, text: "Then she clean it with her face, man I love my baby" },
      { time: 160, text: "You talking money, need a hearing aid" },
      { time: 163, text: "You talking bout me, I don't see the shade" },
      { time: 166, text: "Switch up my style, I take any lane" },
      { time: 170, text: "I switch up my cup, I kill any pain" },
      { time: 173, text: "Look what you've done" },
      { time: 176, text: "I'm a motherfuckin' starboy", highlight: true },
      { time: 180, text: "Look what you've done" },
      { time: 184, text: "I'm a motherfuckin' starboy", highlight: true },
      { time: 190, text: "(Daft Punk Vocoder Outro)" },
      { time: 194, text: "Look what you've done... I'm a motherfuckin' starboy", highlight: true },
      { time: 201, text: "Look what you've done... I'm a motherfuckin' starboy", highlight: true },
      { time: 208, text: "Look what you've done... I'm a motherfuckin' starboy", highlight: true }
    ]
  },
  {
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    duration: 200,
    art: '/website/assets/logo.png',
    haloColor: 'radial-gradient(circle, #f43f5e 0%, #8b5cf6 60%, transparent 75%)',
    lyrics: [
      { time: 0, text: "Yeah..." },
      { time: 6, text: "I've been tryna call" },
      { time: 11, text: "I've been on my own for long enough" },
      { time: 18, text: "Maybe you can show me how to love, maybe" },
      { time: 25, text: "I'm going through withdrawals" },
      { time: 32, text: "You don't even have to do too much" },
      { time: 38, text: "You can turn me on with just a touch, baby" },
      { time: 45, text: "I look around and Sin City's cold and empty" },
      { time: 52, text: "No one's around to judge me" },
      { time: 58, text: "I can't see clearly when you're gone", highlight: true },
      { time: 64, text: "I said, ooh, I'm blinded by the lights", highlight: true },
      { time: 72, text: "No, I can't sleep until I feel your touch" }
    ]
  },
  {
    title: 'As It Was',
    artist: 'Harry Styles',
    duration: 167,
    art: '/website/assets/logo.png',
    haloColor: 'radial-gradient(circle, #06b6d4 0%, #3b82f6 60%, transparent 75%)',
    lyrics: [
      { time: 0, text: "Come on, Harry, we wanna say goodnight to you" },
      { time: 6, text: "Holdin' me back" },
      { time: 9, text: "Gravity's holdin' me back" },
      { time: 13, text: "I want you to hold out the palm of your hand" },
      { time: 17, text: "Why don't we leave it at that?" },
      { time: 22, text: "Nothin' to say" },
      { time: 25, text: "When everything gets in the way" },
      { time: 30, text: "Seems you cannot be replaced" },
      { time: 34, text: "And I'm the one who will stay, oh" },
      { time: 38, text: "You know it's not the same as it was", highlight: true },
      { time: 44, text: "In this world, it's just us", highlight: true },
      { time: 48, text: "You know it's not the same as it was" }
    ]
  },
  {
    title: 'Midnight City',
    artist: 'M83',
    duration: 243,
    art: '/website/assets/logo.png',
    haloColor: 'radial-gradient(circle, #ec4899 0%, #06b6d4 60%, transparent 75%)',
    lyrics: [
      { time: 0, text: "(Intro synth arpeggios pulsing...)" },
      { time: 15, text: "Waiting in a car" },
      { time: 22, text: "Waiting for a ride in the dark" },
      { time: 29, text: "The night city grows" },
      { time: 36, text: "Look and see her eyes, they glow" },
      { time: 43, text: "Waiting in a car" },
      { time: 50, text: "Waiting for a ride in the dark" },
      { time: 58, text: "The city is my church", highlight: true },
      { time: 65, text: "It wraps in the blinding twilight", highlight: true },
      { time: 73, text: "The night is on my side", highlight: true },
      { time: 80, text: "Waiting for a ride in the dark" }
    ]
  }
];

let currentSongIndex = 0;
let isPlaying = false;
let currentTime = 14;
let playInterval = null;

function initPlayerDemo() {
  const audioPlayer = document.getElementById('audioPlayer');
  const currentTitle = document.getElementById('currentTrackTitle');
  const currentArtist = document.getElementById('currentTrackArtist');
  const currentArt = document.getElementById('currentTrackArt');
  const artHalo = document.getElementById('artHalo');
  const timeCurrent = document.getElementById('timeCurrent');
  const timeTotal = document.getElementById('timeTotal');
  const scrubberBar = document.getElementById('scrubberBar');
  const scrubberProgress = document.getElementById('scrubberProgress');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const favoriteBtn = document.getElementById('favoriteBtn');
  const switcherChips = document.querySelectorAll('.chip-btn');
  const lyricsContainer = document.getElementById('lyricsContainer');
  const btnShareLyrics = document.getElementById('btnShareLyrics');

  function setPlayingState(playing) {
    isPlaying = playing;
    if (playing) {
      if (playIcon) playIcon.classList.add('hidden');
      if (pauseIcon) pauseIcon.classList.remove('hidden');
    } else {
      if (playIcon) playIcon.classList.remove('hidden');
      if (pauseIcon) pauseIcon.classList.add('hidden');
      if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
      }
    }
  }

  function loadSong(index, shouldAutoPlay = false) {
    const song = DEMO_SONGS[index];
    if (!song) return;

    currentTitle.textContent = song.title;
    currentArtist.textContent = song.artist;
    currentArt.src = song.art;
    artHalo.style.background = song.haloColor;
    timeTotal.textContent = formatTime(song.duration);
    currentTime = 0;
    updateProgress();
    renderLyrics(song.lyrics);

    if (audioPlayer) {
      if (song.audioSrc) {
        if (!audioPlayer.src.includes(song.audioSrc)) {
          audioPlayer.src = song.audioSrc;
        }
        audioPlayer.currentTime = 0;
        if (shouldAutoPlay || isPlaying) {
          audioPlayer.play()
            .then(() => setPlayingState(true))
            .catch(err => console.log('Autoplay prevented:', err));
        } else {
          audioPlayer.pause();
          setPlayingState(false);
        }
      } else {
        audioPlayer.pause();
        audioPlayer.removeAttribute('src');
        if (shouldAutoPlay || isPlaying) {
          startVisualTimer();
        } else {
          setPlayingState(false);
        }
      }
    }

    // Update chips
    switcherChips.forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.dataset.song, 10) === index);
    });
  }

  function startVisualTimer() {
    setPlayingState(true);
    if (playInterval) clearInterval(playInterval);
    playInterval = setInterval(() => {
      const song = DEMO_SONGS[currentSongIndex];
      currentTime += 1;
      if (currentTime >= song.duration) {
        currentTime = 0;
        currentSongIndex = (currentSongIndex + 1) % DEMO_SONGS.length;
        loadSong(currentSongIndex, true);
      }
      updateProgress();
      syncLyricsToTime();
    }, 1000);
  }

  // HTML5 audio event listeners
  if (audioPlayer) {
    audioPlayer.addEventListener('timeupdate', () => {
      currentTime = audioPlayer.currentTime;
      if (audioPlayer.duration && !isNaN(audioPlayer.duration)) {
        DEMO_SONGS[currentSongIndex].duration = Math.floor(audioPlayer.duration);
        timeTotal.textContent = formatTime(Math.floor(audioPlayer.duration));
      }
      updateProgress();
      syncLyricsToTime();
    });

    audioPlayer.addEventListener('play', () => setPlayingState(true));
    audioPlayer.addEventListener('pause', () => setPlayingState(false));
    audioPlayer.addEventListener('ended', () => {
      currentSongIndex = (currentSongIndex + 1) % DEMO_SONGS.length;
      loadSong(currentSongIndex, true);
    });
  }

  function renderLyrics(lyrics) {
    if (!lyricsContainer) return;
    lyricsContainer.innerHTML = '';
    lyrics.forEach((item, idx) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'lyric-line';
      lineEl.dataset.time = item.time;
      lineEl.dataset.idx = idx;

      if (item.highlight) {
        lineEl.innerHTML = `<span class="highlight-syllable">${item.text}</span>`;
      } else {
        lineEl.textContent = item.text;
      }

      lineEl.addEventListener('click', () => {
        currentTime = item.time;
        const song = DEMO_SONGS[currentSongIndex];
        if (audioPlayer && song.audioSrc) {
          audioPlayer.currentTime = item.time;
          if (audioPlayer.paused) {
            audioPlayer.play().catch(e => console.log(e));
          }
        }
        updateProgress();
        syncLyricsToTime();
      });

      lyricsContainer.appendChild(lineEl);
    });
    syncLyricsToTime();
  }

  function syncLyricsToTime() {
    const lines = lyricsContainer.querySelectorAll('.lyric-line');
    let activeLine = null;

    lines.forEach(line => {
      const t = parseFloat(line.dataset.time);
      if (t <= currentTime) {
        activeLine = line;
      }
      line.classList.remove('active');
    });

    if (activeLine) {
      activeLine.classList.add('active');
      // Scroll smoothly to center active line in view
      const containerHeight = lyricsContainer.clientHeight;
      const lineTop = activeLine.offsetTop;
      const lineHeight = activeLine.clientHeight;
      lyricsContainer.scrollTo({
        top: lineTop - (containerHeight / 2) + (lineHeight / 2),
        behavior: 'smooth'
      });
    }
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function updateProgress() {
    const song = DEMO_SONGS[currentSongIndex];
    const pct = (currentTime / song.duration) * 100;
    scrubberProgress.style.width = `${Math.min(pct, 100)}%`;
    timeCurrent.textContent = formatTime(currentTime);
  }

  // Play / Pause Toggle
  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      const song = DEMO_SONGS[currentSongIndex];
      if (audioPlayer && song.audioSrc) {
        if (audioPlayer.paused) {
          audioPlayer.play()
            .then(() => setPlayingState(true))
            .catch(err => {
              console.warn('Playback error, falling back:', err);
              startVisualTimer();
            });
        } else {
          audioPlayer.pause();
          setPlayingState(false);
        }
      } else {
        if (isPlaying) {
          setPlayingState(false);
        } else {
          startVisualTimer();
        }
      }
    });
  }

  // Next & Prev
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      currentSongIndex = (currentSongIndex + 1) % DEMO_SONGS.length;
      loadSong(currentSongIndex, isPlaying);
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      currentSongIndex = (currentSongIndex - 1 + DEMO_SONGS.length) % DEMO_SONGS.length;
      loadSong(currentSongIndex, isPlaying);
    });
  }

  // Scrubber click to seek
  if (scrubberBar) {
    scrubberBar.addEventListener('click', (e) => {
      const rect = scrubberBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const fraction = Math.max(0, Math.min(1, clickX / width));
      const song = DEMO_SONGS[currentSongIndex];
      const targetTime = Math.floor(fraction * song.duration);
      currentTime = targetTime;
      if (audioPlayer && song.audioSrc) {
        audioPlayer.currentTime = targetTime;
      }
      updateProgress();
      syncLyricsToTime();
    });
  }

  // Favorite toggle
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', () => {
      favoriteBtn.classList.toggle('active');
      showToast(favoriteBtn.classList.contains('active') ? 'Added to Liked Songs' : 'Removed from Liked Songs');
    });
  }

  // Demo song chip switch
  switcherChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const idx = parseInt(chip.dataset.song, 10);
      currentSongIndex = idx;
      loadSong(idx, isPlaying);
    });
  });

  // Load Initial Song
  loadSong(currentSongIndex);

  // Share lyric card button
  if (btnShareLyrics) {
    btnShareLyrics.addEventListener('click', () => {
      const activeLine = lyricsContainer.querySelector('.lyric-line.active');
      const text = activeLine ? activeLine.textContent.trim() : DEMO_SONGS[currentSongIndex].lyrics[0].text;
      showToast(`Shared snippet: "${text}"`);
    });
  }

  // Showcase Tabs Toggle
  const showcaseTabs = document.querySelectorAll('.showcase-tab-btn');
  const showcasePanes = document.querySelectorAll('.showcase-tab-content');

  showcaseTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      showcaseTabs.forEach(t => t.classList.remove('active'));
      showcasePanes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.dataset.tab;
      const pane = document.getElementById(targetId);
      if (pane) {
        pane.classList.add('active');
      }
    });
  });
}

/* ============================================================== */
/* 4. VIRAL LISTENING RECEIPT GENERATOR (RECEIPTIFY / AYUSHMUZIC) */
/* ============================================================== */
const RECEIPT_DATASETS = {
  week: {
    periodLabel: "LAST 7 DAYS",
    itemCount: 182,
    totalSeconds: 38895, // 10h 48m 15s
    authCode: "849201",
    seed: 48921,
    tracks: [
      { plays: 42, item: "STARBOY - THE WEEKND", duration: "3:50" },
      { plays: 38, item: "BLINDING LIGHTS - THE WEEKND", duration: "3:20" },
      { plays: 29, item: "AS IT WAS - HARRY STYLES", duration: "2:47" },
      { plays: 24, item: "LEVITATING - DUA LIPA", duration: "3:23" },
      { plays: 19, item: "MIDNIGHT CITY - M83", duration: "4:03" },
      { plays: 16, item: "SAVE YOUR TEARS - THE WEEKND", duration: "3:35" },
      { plays: 14, item: "DIE FOR YOU - THE WEEKND", duration: "4:20" }
    ]
  },
  month: {
    periodLabel: "LAST 30 DAYS",
    itemCount: 642,
    totalSeconds: 137564, // 38h 12m 44s
    authCode: "294105",
    seed: 94123,
    tracks: [
      { plays: 114, item: "STARBOY - THE WEEKND", duration: "3:50" },
      { plays: 98, item: "BLINDING LIGHTS - THE WEEKND", duration: "3:20" },
      { plays: 87, item: "CREEPIN' - METRO BOOMIN", duration: "3:41" },
      { plays: 76, item: "AS IT WAS - HARRY STYLES", duration: "2:47" },
      { plays: 64, item: "ONE DANCE - DRAKE", duration: "2:54" },
      { plays: 59, item: "HEAT WAVES - GLASS ANIMALS", duration: "3:58" },
      { plays: 54, item: "LEVITATING - DUA LIPA", duration: "3:23" },
      { plays: 50, item: "MIDNIGHT CITY - M83", duration: "4:03" },
      { plays: 40, item: "FEATHER - SABRINA CARPENTER", duration: "3:05" }
    ]
  },
  all: {
    periodLabel: "ALL TIME",
    itemCount: 2890,
    totalSeconds: 621910, // 172h 45m 10s
    authCode: "991048",
    seed: 18274,
    tracks: [
      { plays: 480, item: "STARBOY - THE WEEKND", duration: "3:50" },
      { plays: 432, item: "BLINDING LIGHTS - THE WEEKND", duration: "3:20" },
      { plays: 365, item: "AFTER HOURS - THE WEEKND", duration: "6:01" },
      { plays: 320, item: "MIDNIGHT CITY - M83", duration: "4:03" },
      { plays: 295, item: "AS IT WAS - HARRY STYLES", duration: "2:47" },
      { plays: 270, item: "STARRY EYES - THE WEEKND", duration: "2:28" },
      { plays: 250, item: "THE LESS I KNOW - TAME IMPALA", duration: "3:36" },
      { plays: 242, item: "SWEATER WEATHER - THE NEIGHBOURHOOD", duration: "4:00" },
      { plays: 236, item: "NIGHTCALL - KAVINSKY", duration: "4:19" }
    ]
  }
};

function initReceiptEngine() {
  const periodBtns = document.querySelectorAll('.period-btn');
  const cardholderInput = document.getElementById('receiptCardholderInput');
  const periodLabel = document.getElementById('receiptPeriodLabel');
  const orderLine = document.getElementById('receiptOrderLine');
  const dateLine = document.getElementById('receiptDateLine');
  const itemsContainer = document.getElementById('receiptItemsContainer');
  const itemCountEl = document.getElementById('receiptItemCount');
  const totalDurationEl = document.getElementById('receiptTotalDuration');
  const authLine = document.getElementById('receiptAuthLine');
  const cardholderLine = document.getElementById('receiptCardholderLine');
  const barcodeSvg = document.getElementById('receiptBarcodeSvg');
  const btnDownloadReceipt = document.getElementById('btnDownloadReceipt');
  const btnCopyReceiptText = document.getElementById('btnCopyReceiptText');

  let currentPeriod = 'week';

  // Format today's date like the Kotlin app: "THURSDAY, OCTOBER 15, 2026"
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = now.toLocaleDateString('en-US', options).toUpperCase();
  if (dateLine) dateLine.textContent = formattedDate;

  function renderReceipt() {
    const data = RECEIPT_DATASETS[currentPeriod];
    const name = cardholderInput.value.trim().toUpperCase() || 'GUEST';

    if (periodLabel) periodLabel.textContent = data.periodLabel;
    if (orderLine) orderLine.textContent = `ORDER #0842 FOR ${name}`;
    if (cardholderLine) cardholderLine.textContent = `CARDHOLDER: ${name}`;
    if (authLine) authLine.textContent = `AUTH CODE: ${data.authCode}`;
    if (itemCountEl) itemCountEl.textContent = data.itemCount;

    // Format total time like receiptTotal() in ListeningReceipt.kt: "H:MM:SS"
    const totalH = Math.floor(data.totalSeconds / 3600);
    const totalM = Math.floor((data.totalSeconds % 3600) / 60);
    const totalS = data.totalSeconds % 60;
    const formattedTotal = `${totalH}:${totalM < 10 ? '0' : ''}${totalM}:${totalS < 10 ? '0' : ''}${totalS}`;
    if (totalDurationEl) totalDurationEl.textContent = formattedTotal;

    // Render Track Rows
    if (itemsContainer) {
      itemsContainer.innerHTML = '';
      data.tracks.forEach(track => {
        const row = document.createElement('div');
        row.className = 'receipt-item-row';
        row.innerHTML = `
          <span class="col-qty">${track.plays}</span>
          <span class="col-item item-name">${track.item}</span>
          <span class="col-amt">${track.duration}</span>
        `;
        itemsContainer.appendChild(row);
      });
    }

    // Render Barcode
    renderBarcode(data.seed);
  }

  function renderBarcode(seed) {
    if (!barcodeSvg) return;
    barcodeSvg.innerHTML = '';
    // Generate pseudo-random bar widths based on seed
    let state = seed;
    function next() {
      state = (state ^ (state << 13)) >>> 0;
      state = (state ^ (state >>> 17)) >>> 0;
      state = (state ^ (state << 5)) >>> 0;
      return (state % 1000) / 1000;
    }

    const totalBars = 48;
    for (let i = 0; i < totalBars; i++) {
      const bar = document.createElement('div');
      bar.className = 'barcode-bar';
      const widthUnits = 1 + Math.floor(next() * 3.5);
      bar.style.width = `${widthUnits * 2}px`;
      if (next() < 0.2) {
        bar.style.backgroundColor = 'transparent';
      }
      barcodeSvg.appendChild(bar);
    }
  }

  // Period switchers
  periodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      periodBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = btn.dataset.period;
      renderReceipt();
    });
  });

  // Name input listener
  if (cardholderInput) {
    cardholderInput.addEventListener('input', renderReceipt);
  }

  // Download Receipt image button (generates PNG canvas)
  if (btnDownloadReceipt) {
    btnDownloadReceipt.addEventListener('click', () => {
      exportReceiptAsImage();
    });
  }

  // Copy Receipt text button
  if (btnCopyReceiptText) {
    btnCopyReceiptText.addEventListener('click', () => {
      const data = RECEIPT_DATASETS[currentPeriod];
      const name = cardholderInput.value.trim().toUpperCase() || 'GUEST';
      let summary = `🧾 AYUSHMUZIC RECEIPT\n`;
      summary += `Period: ${data.periodLabel}\n`;
      summary += `Order: #0842 for ${name}\n`;
      summary += `Date: ${formattedDate}\n`;
      summary += `------------------------------\n`;
      data.tracks.forEach((t, i) => {
        summary += `${i + 1}. [${t.plays} plays] ${t.item} (${t.duration})\n`;
      });
      summary += `------------------------------\n`;
      summary += `Total Items: ${data.itemCount} | Total Time: ${totalDurationEl.textContent}\n`;
      summary += `Powered by AyushMuzic (ayushmuzic)`;

      navigator.clipboard.writeText(summary).then(() => {
        showToast('Receipt summary copied to clipboard!');
      }).catch(() => {
        showToast('Receipt details ready to share!');
      });
    });
  }

  // Initial render
  renderReceipt();
}

/**
 * Render printable receipt into an offscreen HTML5 canvas and trigger instant PNG download
 */
function exportReceiptAsImage() {
  const receiptEl = document.getElementById('printableReceipt');
  if (!receiptEl) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const width = 420;
  const height = 680;

  canvas.width = width * 2; // High-DPI
  canvas.height = height * 2;
  ctx.scale(2, 2);

  // Background
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, width, height);

  // Border outline
  ctx.strokeStyle = '#e0dad0';
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  // Typography
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('AYUSHMUZIC', width / 2, 45);

  const periodText = document.getElementById('receiptPeriodLabel').textContent;
  ctx.font = '12px monospace';
  ctx.fillText(periodText, width / 2, 65);

  ctx.textAlign = 'left';
  ctx.font = '11px monospace';
  const orderText = document.getElementById('receiptOrderLine').textContent;
  const dateText = document.getElementById('receiptDateLine').textContent;
  ctx.fillText(orderText, 25, 95);
  ctx.fillText(dateText, 25, 112);

  // Dashed divider helper
  function drawDashedLine(y) {
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(25, y);
    ctx.lineTo(width - 25, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawDashedLine(125);

  // Table Header
  ctx.font = 'bold 11px monospace';
  ctx.fillText('QTY', 25, 140);
  ctx.fillText('ITEM', 65, 140);
  ctx.textAlign = 'right';
  ctx.fillText('AMT', width - 25, 140);

  drawDashedLine(150);

  // Rows
  const rows = document.querySelectorAll('.receipt-items-list .receipt-item-row');
  let currentY = 170;
  ctx.font = '11px monospace';

  rows.forEach(r => {
    const qty = r.querySelector('.col-qty').textContent;
    const item = r.querySelector('.col-item').textContent;
    const amt = r.querySelector('.col-amt').textContent;

    ctx.textAlign = 'left';
    ctx.fillText(qty, 25, currentY);

    // Truncate long title
    const shortItem = item.length > 28 ? item.substring(0, 26) + '..' : item;
    ctx.fillText(shortItem, 65, currentY);

    ctx.textAlign = 'right';
    ctx.fillText(amt, width - 25, currentY);

    currentY += 22;
  });

  drawDashedLine(currentY + 5);

  // Totals
  currentY += 24;
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('ITEM COUNT:', 25, currentY);
  ctx.textAlign = 'right';
  ctx.fillText(document.getElementById('receiptItemCount').textContent, width - 25, currentY);

  currentY += 18;
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL:', 25, currentY);
  ctx.textAlign = 'right';
  ctx.fillText(document.getElementById('receiptTotalDuration').textContent, width - 25, currentY);

  drawDashedLine(currentY + 10);

  // Card details
  currentY += 28;
  ctx.textAlign = 'left';
  ctx.font = '10px monospace';
  ctx.fillText('CARD #: **** **** **** 2026', 25, currentY);
  currentY += 16;
  ctx.fillText(document.getElementById('receiptAuthLine').textContent, 25, currentY);
  currentY += 16;
  ctx.fillText(document.getElementById('receiptCardholderLine').textContent, 25, currentY);

  // Thank You
  currentY += 30;
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('THANK YOU FOR LISTENING!', width / 2, currentY);

  // Bottom brand
  currentY += 38;
  ctx.font = '12px monospace';
  ctx.fillText('ayushmuzic', width / 2, currentY);

  // Convert to image download
  const link = document.createElement('a');
  link.download = `AyushMuzic_Receipt_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();

  showToast('Receipt downloaded as high-resolution PNG!');
}

/* ============================================================== */
/* 5. EQUALIZER DEMO                                              */
/* ============================================================== */
const EQ_PRESETS = {
  bass: [6, 5, 3, 1, 0, 0, 2, 3, 4, 5],
  rock: [5, 4, 2, 0, -1, 1, 3, 4, 5, 5],
  pop: [2, 3, 4, 3, 1, 0, 2, 3, 4, 3],
  vocal: [-2, -1, 0, 2, 4, 4, 3, 2, 0, -1],
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

const FREQ_KEYS = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];

function initEqualizerDemo() {
  const presetBtns = document.querySelectorAll('.preset-btn');

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const preset = btn.dataset.preset;
      const values = EQ_PRESETS[preset];
      if (values) {
        FREQ_KEYS.forEach((key, idx) => {
          const slider = document.getElementById(`slider-${key}`);
          const label = document.getElementById(`db-${key}`);
          const val = values[idx];
          if (slider) slider.value = val;
          if (label) label.textContent = `${val > 0 ? '+' : ''}${val} dB`;
        });
      }
    });
  });

  // Dynamic slider adjustments
  FREQ_KEYS.forEach(key => {
    const slider = document.getElementById(`slider-${key}`);
    const label = document.getElementById(`db-${key}`);
    if (slider && label) {
      slider.addEventListener('input', () => {
        const val = slider.value;
        label.textContent = `${val > 0 ? '+' : ''}${val} dB`;
      });
    }
  });
}

/* ============================================================== */
/* 6. MULTI-PLATFORM DOWNLOAD TABS                                */
/* ============================================================== */
function initPlatformTabs() {
  const tabBtns = document.querySelectorAll('.platform-tab-btn');
  const tabPanes = document.querySelectorAll('.platform-tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const platform = btn.dataset.platform;
      const targetPane = document.getElementById(`pane-${platform}`);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });
}

/* ============================================================== */
/* 7. FAQ ACCORDION                                               */
/* ============================================================== */
function initFaqAccordion() {
  const faqCards = document.querySelectorAll('[data-faq]');

  faqCards.forEach(card => {
    const btn = card.querySelector('.faq-question-btn');
    const panel = card.querySelector('.faq-answer-panel');

    btn.addEventListener('click', () => {
      const isOpen = card.classList.contains('open');

      // Close other accordions
      faqCards.forEach(c => {
        c.classList.remove('open');
        c.querySelector('.faq-question-btn').setAttribute('aria-expanded', 'false');
        c.querySelector('.faq-answer-panel').style.maxHeight = null;
      });

      if (!isOpen) {
        card.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });
}

/* ============================================================== */
/* 8. SHA-256 CHECKSUM ONE-CLICK COPY                             */
/* ============================================================== */
function initChecksumCopy() {
  const copyBtns = document.querySelectorAll('.copy-hash-btn');

  copyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        const text = targetEl.textContent.trim();
        navigator.clipboard.writeText(text).then(() => {
          showToast('SHA-256 Checksum copied to clipboard!');
        }).catch(() => {
          showToast('Checksum ready to copy: ' + text.substring(0, 12) + '...');
        });
      }
    });
  });
}

/* ============================================================== */
/* 9. TOAST NOTIFICATION UTILITY                                  */
/* ============================================================== */
let toastTimeout = null;

function showToast(message) {
  const toast = document.getElementById('toastNotification');
  const toastMsg = document.getElementById('toastMessage');

  if (!toast || !toastMsg) return;

  toastMsg.textContent = message;
  toast.classList.add('show');

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}
