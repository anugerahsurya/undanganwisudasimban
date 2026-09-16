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
     1. PARSE URL PARAMETERS (Recipient Name & Category)
     ========================================================================== */
  function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  function sanitize(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  }

  const rawGuestName = getUrlParam('to') || getUrlParam('guest') || getUrlParam('nama') || 'Tamu Undangan';
  const rawGuestCategory = getUrlParam('cat') || getUrlParam('kategori') || 'Keluarga & Sahabat';

  const guestName = sanitize(rawGuestName);
  const guestCategory = sanitize(rawGuestCategory);

  if (recipientNameEl) recipientNameEl.textContent = guestName;
  if (recipientCategoryEl) recipientCategoryEl.textContent = guestCategory;
  if (heroRecipientName) heroRecipientName.textContent = guestName;

  // Pre-fill Guestbook name if present
  const wishNameInput = document.getElementById('wish-name');
  if (wishNameInput && rawGuestName !== 'Tamu Undangan') {
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

  if (btnOpenInvite) {
    btnOpenInvite.addEventListener('click', () => {
      if (coverGate) {
        coverGate.classList.add('opened');
      }
      playAudio();
      triggerConfetti();

      // Smooth scroll to top of main content
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  /* ==========================================================================
     3. GOLDEN SPARKLE PARTICLES CANVAS
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

    const particles = [];
    const particleCount = Math.min(width > 768 ? 45 : 20, 50);

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2.2 + 0.6;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = -Math.random() * 0.6 - 0.2;
        this.opacity = Math.random() * 0.6 + 0.2;
        this.fadeSpeed = Math.random() * 0.008 + 0.004;
        this.color = Math.random() > 0.3 ? '184, 134, 11' : '212, 160, 23';
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.opacity -= this.fadeSpeed;
        if (this.opacity <= 0 || this.y < 0) {
          this.reset();
          this.y = height + 10;
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${this.color}, 0.8)`;
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animateParticles() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animateParticles);
    }
    animateParticles();
  }

  /* ==========================================================================
     4. COUNTDOWN TIMER
     ========================================================================== */
  // Target: 24 Oktober 2026 08:00:00 WIB
  const targetDate = new Date(2026, 9, 24, 8, 0, 0).getTime();

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
          text: 'Selamat dan sukses selalu bro! Perjuangan dari Sempro sampai Sidang terbayar lunas. Berkah selalu gelarnya!',
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
        },
        {
          id: 2,
          name: 'Prof. Dr. Ir. Hendra',
          category: 'Dosen Pembimbing',
          text: 'Selamat atas kelulusannya. Bangga dengan ketekunan dan kerja keras Anda dalam menyelesaikan penelitian. Teruslah berkarya untuk bangsa.',
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

      const title = 'Wisuda Sarjana Anugerah Surya';
      const description = 'Prosesi Wisuda Sarjana Anugerah Surya, S.Tr.Stat. Bertempat di Auditorium Utama Universitas.';
      const location = 'Auditorium Utama Universitas Brawijaya / Kampus Tercinta';
      const startDate = '20261024T080000';
      const endDate = '20261024T120000';

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
});
