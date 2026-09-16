/**
 * UNDANGAN WISUDA ELEGAN - JAVASCRIPT
 * Handles: Audio Player, Cover Gating, Recipient Param, Canvas Particles,
 * Scroll Animations, Countdown, Lightbox, Guestbook & Calendar ICS.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const coverGate = document.getElementById('cover-gate');
  const btnOpenInvite = document.getElementById('btn-open-invite');
  const bgAudio = document.getElementById('bg-audio');
  if (bgAudio) {
    bgAudio.volume = 0.75;
  }
  const musicToggle = document.getElementById('music-toggle');
  const discBtn = document.getElementById('disc-btn');
  const recipientNameEl = document.getElementById('recipient-name');
  const recipientCategoryEl = document.getElementById('recipient-category');
  const heroRecipientName = document.getElementById('hero-recipient-name');
  const wishesForm = document.getElementById('wishes-form');
  const wishesList = document.getElementById('wishes-list');
  const lightbox = document.getElementById('lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');

  let isPlaying = false;

  /* ==========================================================================
     1. PARSE URL PARAMETERS & CLEAN PATHS (No index.html needed)
     ========================================================================== */
  function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  function sanitize(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  }

  function parseGuestInfo() {
    let name = getUrlParam('to') || getUrlParam('guest') || getUrlParam('nama') || getUrlParam('u') || getUrlParam('id');
    let category = getUrlParam('cat') || getUrlParam('kategori');

    // If not in query string, extract from clean path (e.g. /Budi-Santoso or /to/Budi-Santoso)
    if (!name) {
      let path = window.location.pathname.replace(/^\/+|\/+$/g, '');
      if (path && path !== 'index.html' && path !== 'index' && path !== 'admin.html' && path !== 'admin' && !path.startsWith('assets/')) {
        // Handle /to/Name/Category or /u/Name/Category
        if (path.startsWith('to/') || path.startsWith('u/')) {
          const parts = path.split('/');
          name = decodeURIComponent(parts[1] || '').replace(/[-_+]/g, ' ');
          if (parts[2]) {
            category = decodeURIComponent(parts[2]).replace(/[-_+]/g, ' ');
          }
        } else if (!path.includes('.')) {
          // Handle direct slug: /Budi-Santoso or /Budi_Santoso or /Budi
          name = decodeURIComponent(path).replace(/[-_+]/g, ' ');
        }
      }
    }

    const hasValidAccess = Boolean(name && name.trim().length > 0);

    return {
      hasValidAccess,
      name: name ? name.trim() : '',
      category: category ? category.trim() : 'Keluarga & Sahabat'
    };
  }

  const guestData = parseGuestInfo();

  // STRICT ACCESS RESTRICTION: Only accessible via unique link, root domain is blank
  if (!guestData.hasValidAccess) {
    document.documentElement.classList.add('access-restricted');
    if (bgAudio) {
      bgAudio.pause();
      bgAudio.currentTime = 0;
    }
    return; // Exit main script completely so invitation does not run
  }

  const rawGuestName = guestData.name;
  const rawGuestCategory = guestData.category;

  const guestName = sanitize(rawGuestName);
  const guestCategory = sanitize(rawGuestCategory);

  if (recipientNameEl) recipientNameEl.textContent = guestName;
  if (recipientCategoryEl) recipientCategoryEl.textContent = guestCategory;
  if (heroRecipientName) heroRecipientName.textContent = guestName;

  // Pre-fill Guestbook name if present
  const wishNameInput = document.getElementById('wish-name');
  if (wishNameInput && rawGuestName) {
    wishNameInput.value = rawGuestName;
  }

  /* ==========================================================================
     2. AUDIO CONTROLLER & COVER GATE
     ========================================================================== */
  function playAudio() {
    if (!bgAudio) return;
    bgAudio.play().then(() => {
      isPlaying = true;
      if (discBtn) discBtn.classList.add('spinning');
      updateMusicIcon(true);
    }).catch(err => {
      console.warn('Browser audio autoplay blocked:', err);
      isPlaying = false;
      if (discBtn) discBtn.classList.remove('spinning');
      updateMusicIcon(false);
    });
  }

  function pauseAudio() {
    if (!bgAudio) return;
    bgAudio.pause();
    isPlaying = false;
    if (discBtn) discBtn.classList.remove('spinning');
    updateMusicIcon(false);
  }

  function updateMusicIcon(active) {
    if (!musicToggle) return;
    const playIcon = musicToggle.querySelector('.icon-play');
    const pauseIcon = musicToggle.querySelector('.icon-pause');
    if (playIcon && pauseIcon) {
      if (active) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
      } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
      }
    }
  }

  if (musicToggle) {
    musicToggle.addEventListener('click', () => {
      if (isPlaying) {
        pauseAudio();
      } else {
        playAudio();
      }
    });
  }

  const envelopeWrapper = document.getElementById('envelope-wrapper');
  const waxSeal = document.getElementById('wax-seal');
  const peekingVinyl = document.getElementById('peeking-vinyl');

  function openInvitation() {
    if (envelopeWrapper) {
      envelopeWrapper.classList.add('unsealed');
    }
    playAudio();

    // Allow the wax seal to pop and letter to slide upward gracefully before fading gate
    setTimeout(() => {
      if (coverGate) {
        coverGate.classList.add('opened');
      }
      triggerConfetti();

      // Smooth scroll to top of main content
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 550);
  }

  if (btnOpenInvite) {
    btnOpenInvite.addEventListener('click', (e) => {
      e.stopPropagation();
      openInvitation();
    });
  }

  if (waxSeal) {
    waxSeal.addEventListener('click', (e) => {
      e.stopPropagation();
      openInvitation();
    });
    waxSeal.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openInvitation();
      }
    });
  }

  if (peekingVinyl) {
    peekingVinyl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isPlaying) {
        pauseAudio();
        peekingVinyl.classList.remove('playing');
      } else {
        playAudio();
        peekingVinyl.classList.add('playing');
      }
    });
  }

  /* ==========================================================================
     3. LIVING BACKGROUND: FLOATING GOLDEN LEAVES & SHIMMERING STARDUST CANVAS
     ========================================================================== */
  const canvas = document.getElementById('sparkle-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const isMobile = width < 768;
    const leafCount = isMobile ? 12 : 22;
    const dustCount = isMobile ? 18 : 35;

    // --- 3A. Floating Golden Laurel Leaves / Petals ---
    class FloatingLeaf {
      constructor() {
        this.reset(true);
      }
      reset(initial = false) {
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : -20;
        this.size = Math.random() * 8 + 10; // length
        this.aspect = Math.random() * 0.35 + 0.35; // width ratio
        this.speedY = Math.random() * 0.7 + 0.4; // gentle downward drift
        this.swayAngle = Math.random() * Math.PI * 2;
        this.swaySpeed = Math.random() * 0.02 + 0.01;
        this.swayWidth = Math.random() * 0.8 + 0.4;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.025;
        this.opacity = Math.random() * 0.28 + 0.18; // soft translucent luxury
        // Warm golden shades
        const goldShades = [
          '212, 175, 55',  // Vibrant Gold
          '245, 224, 160', // Pale Gold
          '184, 134, 11'   // Deep Gold
        ];
        this.color = goldShades[Math.floor(Math.random() * goldShades.length)];
      }
      update() {
        this.swayAngle += this.swaySpeed;
        this.x += Math.sin(this.swayAngle) * this.swayWidth;
        this.y += this.speedY;
        this.rotation += this.rotSpeed;

        if (this.y > height + 25 || this.x < -30 || this.x > width + 30) {
          this.reset(false);
        }
      }
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.beginPath();
        const halfLen = this.size / 2;
        const halfWidth = (this.size * this.aspect) / 2;
        
        // Draw elegant curved leaf silhouette
        ctx.moveTo(0, -halfLen);
        ctx.quadraticCurveTo(halfWidth, 0, 0, halfLen);
        ctx.quadraticCurveTo(-halfWidth, 0, 0, -halfLen);
        
        ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = `rgba(${this.color}, 0.4)`;
        ctx.fill();

        // Delicate center leaf rib
        ctx.beginPath();
        ctx.moveTo(0, -halfLen * 0.75);
        ctx.lineTo(0, halfLen * 0.75);
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.6})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();

        ctx.restore();
      }
    }

    // --- 3B. Shimmering Golden Stardust Particles ---
    class GoldenDust {
      constructor() {
        this.reset(true);
      }
      reset(initial = false) {
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : height + 10;
        this.radius = Math.random() * 1.8 + 0.6;
        this.speedX = (Math.random() - 0.5) * 0.35;
        this.speedY = -Math.random() * 0.5 - 0.2; // drifting upward
        this.baseOpacity = Math.random() * 0.45 + 0.2;
        this.pulse = Math.random() * Math.PI * 2;
        this.pulseSpeed = Math.random() * 0.04 + 0.02;
        this.color = Math.random() > 0.4 ? '245, 224, 160' : '212, 175, 55';
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.pulse += this.pulseSpeed;

        if (this.y < -15 || this.x < -10 || this.x > width + 10) {
          this.reset(false);
        }
      }
      draw() {
        const currentOpacity = Math.max(0.1, this.baseOpacity + Math.sin(this.pulse) * 0.2);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${currentOpacity})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${this.color}, 0.8)`;
        ctx.fill();
      }
    }

    const leaves = [];
    const dusts = [];

    for (let i = 0; i < leafCount; i++) {
      leaves.push(new FloatingLeaf());
    }
    for (let i = 0; i < dustCount; i++) {
      dusts.push(new GoldenDust());
    }

    function animateBackground() {
      ctx.clearRect(0, 0, width, height);

      dusts.forEach(d => {
        d.update();
        d.draw();
      });

      leaves.forEach(leaf => {
        leaf.update();
        leaf.draw();
      });

      requestAnimationFrame(animateBackground);
    }
    animateBackground();
  }

  /* ==========================================================================
     4. COUNTDOWN TIMER
     ========================================================================== */
  // Target: Sabtu, 19 September 2026 08:00:00 WIB (Month is 8 for September in JS)
  const targetDate = new Date(2026, 8, 19, 8, 0, 0).getTime();

  function updateCountdown() {
    const now = new Date().getTime();
    const diff = targetDate - now;

    const daysEl = document.getElementById('cd-days');
    const hoursEl = document.getElementById('cd-hours');
    const minutesEl = document.getElementById('cd-minutes');
    const secondsEl = document.getElementById('cd-seconds');

    if (diff <= 0) {
      if (daysEl) daysEl.textContent = '00';
      if (hoursEl) hoursEl.textContent = '00';
      if (minutesEl) minutesEl.textContent = '00';
      if (secondsEl) secondsEl.textContent = '00';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* ==========================================================================
     4B. 21ST.DEV ANIMATED GALLERY 3D SCROLL & PARALLAX ENGINE
     ========================================================================== */
  const scrollTrack = document.getElementById('container-scroll-track');
  const gallery3D = document.getElementById('gallery-3d-container');
  const col1 = document.getElementById('gallery-col-1');
  const col2 = document.getElementById('gallery-col-2');
  const col3 = document.getElementById('gallery-col-3');

  if (scrollTrack && gallery3D && col1 && col2 && col3) {
    let ticking = false;

    function update3DGallery() {
      const rect = scrollTrack.getBoundingClientRect();
      const scrollHeight = scrollTrack.offsetHeight - window.innerHeight;

      let progress = 0;
      if (scrollHeight > 0) {
        progress = Math.max(0, Math.min(1, -rect.top / scrollHeight));
      }

      // 21st.dev template transform mapping:
      // rotateX: transforms from 42deg down to 0deg across progress [0, 0.6]
      const rotateX = progress <= 0.6 
        ? 42 - (progress / 0.6) * 42 
        : 0;

      // scale: transforms from 1.12 down to 1.0 across progress [0.3, 0.85]
      const scale = progress < 0.3 
        ? 1.12 
        : progress <= 0.85 
          ? 1.12 - ((progress - 0.3) / 0.55) * 0.12 
          : 1.0;

      // column yRange parallax mapping (gentle & centered so no empty voids or clipping):
      // col 1: -4% to 2%
      // col 2: 4% to -2%
      // col 3: -4% to 2%
      const pCol = progress < 0.3 ? 0 : (progress - 0.3) / 0.7;
      const y1 = -4 + (pCol * 6);
      const y2 = 4 - (pCol * 6);
      const y3 = -4 + (pCol * 6);

      gallery3D.style.transform = `rotateX(${rotateX.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      col1.style.transform = `translate3d(0, ${y1.toFixed(2)}%, 0)`;
      col2.style.transform = `translate3d(0, ${y2.toFixed(2)}%, 0)`;
      col3.style.transform = `translate3d(0, ${y3.toFixed(2)}%, 0)`;

      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(update3DGallery);
        ticking = true;
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      update3DGallery();
    }, { passive: true });

    update3DGallery();
  }

  /* ==========================================================================
     5. SCROLL REVEAL (IntersectionObserver)
     ========================================================================== */
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => observer.observe(el));
  } else {
    revealElements.forEach(el => el.classList.add('revealed'));
  }

  /* ==========================================================================
     6. PHOTO GALLERY & LIGHTBOX MODAL
     ========================================================================== */
  const galleryItems = document.querySelectorAll('.gallery-item');

  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('.gallery-thumb');
      if (img && lightbox && lightboxImg) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || 'Foto Wisuda';
        lightbox.classList.add('active');
        lightbox.setAttribute('aria-hidden', 'false');
      }
    });

    // Keyboard trigger
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });
  });

  function closeLightbox() {
    if (lightbox) {
      lightbox.classList.remove('active');
      lightbox.setAttribute('aria-hidden', 'true');
      if (lightboxImg) lightboxImg.src = '';
    }
  }

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }

  // Close on Escape key (R-32)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });

  /* ==========================================================================
     7. GUESTBOOK / WISHES (Local Storage)
     ========================================================================== */
  const STORAGE_KEY = 'wisuda_guestbook_wishes';

  function getStoredWishes() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [
        {
          id: 1,
          name: 'Budi Santoso',
          category: 'Sahabat Kampus',
          text: 'Selamat dan sukses selalu Dyah! Perjuangan dari Sempro sampai Sidang terbayar lunas. Berkah selalu gelarnya!',
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
        },
        {
          id: 2,
          name: 'Prof. Dr. Ir. Hendra',
          category: 'Dosen Pembimbing',
          text: 'Selamat atas kelulusannya Dyah Kusumaningrum, S.P. Bangga dengan ketekunan dan kerja keras Anda dalam menyelesaikan penelitian Agroteknologi.',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
        }
      ];
    } catch (e) {
      return [];
    }
  }

  function saveWishes(wishes) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  function formatRelativeTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Baru saja';
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hari yang lalu`;
  }

  function renderWishes() {
    if (!wishesList) return;
    const wishes = getStoredWishes();

    if (wishes.length === 0) {
      wishesList.innerHTML = `
        <div class="empty-state">
          <p>Belum ada ucapan. Jadilah yang pertama memberikan doa dan selamat!</p>
        </div>
      `;
      return;
    }

    wishesList.innerHTML = wishes.map(wish => `
      <div class="wish-item">
        <div class="wish-header">
          <span class="wish-author">${sanitize(wish.name)}</span>
          <span class="wish-time">${formatRelativeTime(wish.timestamp)}</span>
        </div>
        <div class="wish-text">${sanitize(wish.text)}</div>
      </div>
    `).join('');
  }

  if (wishesForm) {
    wishesForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('wish-name');
      const textInput = document.getElementById('wish-message');

      if (!nameInput || !textInput) return;

      const name = nameInput.value.trim();
      const text = textInput.value.trim();

      if (!name || !text) {
        alert('Mohon isi nama dan pesan ucapan Anda.');
        return;
      }

      const wishes = getStoredWishes();
      const newWish = {
        id: Date.now(),
        name: name,
        category: 'Tamu Undangan',
        text: text,
        timestamp: new Date().toISOString()
      };

      wishes.unshift(newWish);
      saveWishes(wishes);
      renderWishes();

      textInput.value = '';

      // Visual feedback
      const submitBtn = wishesForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span>Terkirim! Terima kasih</span>';
        submitBtn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
        setTimeout(() => {
          submitBtn.innerHTML = originalText;
          submitBtn.style.background = '';
        }, 2500);
      }
    });
  }

  renderWishes();

  /* ==========================================================================
     8. ADD TO CALENDAR (.ICS FILE GENERATOR)
     ========================================================================== */
  const btnCalendar = document.getElementById('btn-save-calendar');
  if (btnCalendar) {
    btnCalendar.addEventListener('click', (e) => {
      e.preventDefault();

      const title = 'Wisuda Sarjana Dyah Kusumaningrum, S.P';
      const description = 'Prosesi Wisuda Sarjana Dyah Kusumaningrum, S.P. Program Studi Agroteknologi Universitas Andalas.';
      const location = 'Auditorium Universitas Andalas, Kampus Limau Manis, Padang';
      const startDate = '20260919T080000';
      const endDate = '20260919T140000';

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Undangan Wisuda//ID',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `SUMMARY:${title}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'jadwal-wisuda.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  /* ==========================================================================
     9. CELEBRATORY CONFETTI SHOWER
     ========================================================================== */
  function triggerConfetti() {
    const confettiColors = ['#D4AF37', '#F5E0A0', '#AA771C', '#FFFFFF', '#60A5FA'];
    const confettiCount = 60;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.style.position = 'fixed';
      confetti.style.top = '-10px';
      confetti.style.left = `${Math.random() * 100}vw`;
      confetti.style.width = `${Math.random() * 8 + 4}px`;
      confetti.style.height = `${Math.random() * 12 + 6}px`;
      confetti.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      confetti.style.borderRadius = `${Math.random() > 0.5 ? '50%' : '2px'}`;
      confetti.style.zIndex = '9998';
      confetti.style.pointerEvents = 'none';
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

      document.body.appendChild(confetti);

      const fallDuration = Math.random() * 2500 + 2000;
      const horizontalDrift = (Math.random() - 0.5) * 120;

      confetti.animate([
        { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${horizontalDrift}px, 105vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }
      ], {
        duration: fallDuration,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
      }).onfinish = () => {
        confetti.remove();
      };
    }
  }

  /* ==========================================================================
     10. DYNAMIC AUTO-FIT FOR HERO GRADUATE NAME (Snug to border with 1em margin)
     ========================================================================== */
  function fitHeroTitle() {
    const titleEl = document.querySelector('.card-hero-title');
    if (!titleEl) return;
    const card = titleEl.closest('.bespoke-card');
    if (!card) return;

    // Requirement: Mepet ke border dengan margin 1em (1em pada tiap sisi kiri dan kanan)
    const emInPx = parseFloat(getComputedStyle(card).fontSize) || 16;
    // Lebar maksimum yang tersedia adalah lebar kartu dikurangi 1em di kiri dan 1em di kanan
    const maxAllowedWidth = Math.max(160, card.clientWidth - (2 * emInPx));

    titleEl.style.whiteSpace = 'nowrap';
    titleEl.style.display = 'inline-block';
    titleEl.style.maxWidth = 'none';

    // Baseline ukuran uji untuk pengukuran akurat
    const testSize = 28;
    titleEl.style.fontSize = `${testSize}px`;

    const renderedWidth = titleEl.scrollWidth;
    if (renderedWidth > 0) {
      // Skala langsung secara proporsional agar teks selebar mungkin sampai mepet ke batas 1em
      let targetSize = (maxAllowedWidth / renderedWidth) * testSize;
      
      // Maksimum 32px agar tetap proporsional dan elegan
      targetSize = Math.min(32, targetSize);
      // Pembulatan presisi 1 desimal
      targetSize = Math.floor(targetSize * 10) / 10;
      titleEl.style.fontSize = `${targetSize}px`;

      // Mikro-penyesuaian jika ada perbedaan subpixel rendering agar pas mepet di batas 1em
      while (titleEl.scrollWidth > maxAllowedWidth && targetSize > 12) {
        targetSize -= 0.2;
        titleEl.style.fontSize = `${targetSize}px`;
      }
    }
  }

  fitHeroTitle();
  window.addEventListener('resize', fitHeroTitle);
  window.addEventListener('orientationchange', fitHeroTitle);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitHeroTitle);
  }
});
