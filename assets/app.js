/* Amani Stays Hotel — shared site behaviour
   Every module below checks that its elements exist before wiring up,
   so this one file can be safely included on every page. */
(function(){
  "use strict";

  /* ---------------- helpers ---------------- */
  function fmtKSh(n){ return 'KSh ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function todayISO(){ return new Date().toISOString().slice(0,10); }
  function addDays(iso, days){ var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + days); return d; }
  function fmtDate(d){ return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
  window.AmaniHelpers = { fmtKSh: fmtKSh, todayISO: todayISO, addDays: addDays, fmtDate: fmtDate };

  function sendBookingEmail(data){
    var body = new URLSearchParams();
    Object.keys(data).forEach(function(key){ body.append(key, data[key]); });
    body.append('_subject', 'New Amani Stays booking request - ' + data.booking_reference);
    body.append('_replyto', data.guest_email);
    body.append('_cc', data.guest_email);
    body.append('_template', 'table');
    body.append('_captcha', 'false');
    return fetch('https://formsubmit.co/ajax/amanistayshotel@gmail.com', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    }).then(function(response){
      if(!response.ok) throw new Error('Booking email failed');
      return response.json();
    });
  }

  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function showToast(msg){
    if(!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, 3200);
  }
  window.showToast = showToast;

  /* ---------------- mobile nav ---------------- */
  (function(){
    var toggle = document.getElementById('menuToggle');
    var panel = document.getElementById('mobilePanel');
    if(!toggle || !panel) return;
    toggle.addEventListener('click', function(){
      var open = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    panel.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ panel.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); });
    });
  })();

  /* ---------------- generic stepper wiring ---------------- */
  function wireStepper(container, onChange){
    var min = Number(container.getAttribute('data-min') || 0);
    var max = Number(container.getAttribute('data-max') || 99);
    var out = container.querySelector('output');
    var dec = container.querySelector('[data-action="dec"]');
    var inc = container.querySelector('[data-action="inc"]');
    if(!out || !dec || !inc) return null;
    var val = Number(out.textContent);
    function render(){
      out.textContent = val;
      dec.disabled = (val <= min);
      inc.disabled = (val >= max);
      onChange(val);
    }
    dec.addEventListener('click', function(){ if(val > min){ val--; render(); } });
    inc.addEventListener('click', function(){ if(val < max){ val++; render(); } });
    render();
    return { get: function(){ return val; }, set: function(v){ val = Math.min(max, Math.max(min, v)); render(); } };
  }

  /* ---------------- hero search widget (home) ---------------- */
  (function(){
    var form = document.getElementById('search');
    var checkinInput = document.getElementById('widgetCheckin');
    var nightsInput = document.getElementById('widgetNights');
    var guestsBtn = document.getElementById('widgetGuestsBtn');
    var popover = document.getElementById('guestPopover');
    if(!form || !checkinInput || !guestsBtn || !popover) return;

    var widgetState = { adults: 2, children: 0, rooms: 1 };
    checkinInput.min = todayISO();

    function updateGuestLabel(){
      guestsBtn.textContent = widgetState.adults + (widgetState.adults === 1 ? ' adult' : ' adults') + ', ' +
        widgetState.children + (widgetState.children === 1 ? ' child' : ' children') + ', ' +
        widgetState.rooms + (widgetState.rooms === 1 ? ' room' : ' rooms');
    }
    guestsBtn.addEventListener('click', function(){
      var open = popover.classList.toggle('open');
      guestsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function(e){
      if(!popover.contains(e.target) && e.target !== guestsBtn && popover.classList.contains('open')){
        popover.classList.remove('open');
        guestsBtn.setAttribute('aria-expanded', 'false');
      }
    });
    popover.querySelectorAll('[data-stepper]').forEach(function(el){
      var key = el.getAttribute('data-stepper');
      wireStepper(el, function(v){ widgetState[key] = v; updateGuestLabel(); });
    });
    updateGuestLabel();

    form.addEventListener('submit', function(e){
      e.preventDefault();
      try{
        sessionStorage.setItem('amaniSearch', JSON.stringify({
          checkin: checkinInput.value,
          nights: Number(nightsInput.value) || 2,
          adults: widgetState.adults,
          children: widgetState.children,
          rooms: widgetState.rooms
        }));
      }catch(err){}
      window.location.href = 'amani-stays-rooms.html';
    });
  })();

  /* ---------------- filter + sort (rooms grid) ---------------- */
  (function(){
    var grid = document.getElementById('propGrid');
    if(!grid) return;
    var props = Array.prototype.slice.call(grid.querySelectorAll('.prop'));
    var pills = document.querySelectorAll('.filter-pill');
    var emptyMsg = document.getElementById('filterEmpty');
    var currentFilter = 'all';

    function applyFilterAndSort(){
      var visibleCount = 0;
      props.forEach(function(card){
        var match = (currentFilter === 'all') || (card.getAttribute('data-location') === currentFilter);
        card.classList.toggle('hide-filtered', !match);
        if(match) visibleCount++;
      });
      if(emptyMsg) emptyMsg.classList.toggle('show', visibleCount === 0);
    }
    function applyFilter(loc){
      currentFilter = loc;
      pills.forEach(function(p){ p.setAttribute('aria-pressed', p.getAttribute('data-filter') === loc ? 'true' : 'false'); });
      applyFilterAndSort();
    }
    pills.forEach(function(p){ p.addEventListener('click', function(){ applyFilter(p.getAttribute('data-filter')); }); });

    var sortSelect = document.getElementById('sortSelect');
    if(sortSelect){
      sortSelect.addEventListener('change', function(){
        var mode = this.value;
        var sorted = props.slice();
        if(mode === 'price-asc') sorted.sort(function(a,b){ return Number(a.dataset.price) - Number(b.dataset.price); });
        if(mode === 'price-desc') sorted.sort(function(a,b){ return Number(b.dataset.price) - Number(a.dataset.price); });
        sorted.forEach(function(card){ grid.appendChild(card); });
      });
    }

    /* Restore a search made from the homepage widget */
    try{
      var saved = sessionStorage.getItem('amaniSearch');
      if(saved){
        var s = JSON.parse(saved);
        if(s && s.rooms > 1) showToast('Showing rooms for ' + s.rooms + ' rooms, ' + s.adults + ' adults');
        sessionStorage.removeItem('amaniSearch');
      }
    }catch(err){}
  })();

  /* ---------------- lightbox gallery (any page) ---------------- */
  (function(){
    var lbOverlay = document.getElementById('lightboxOverlay');
    if(!lbOverlay) return;
    var lbImg = document.getElementById('lightboxImg');
    var lbCaption = document.getElementById('lightboxCaption');
    var lbCount = document.getElementById('lightboxCount');
    var lbClose = document.getElementById('lightboxClose');
    var lbPrev = document.getElementById('lightboxPrev');
    var lbNext = document.getElementById('lightboxNext');
    var lbLastFocused = null;
    var gallery = [];
    var galleryIdx = 0;

    function renderSlide(){
      var item = gallery[galleryIdx];
      if(!item) return;
      lbImg.src = item.src;
      lbImg.alt = item.caption;
      lbCaption.textContent = item.caption;
      lbCount.textContent = gallery.length > 1 ? (galleryIdx + 1) + ' / ' + gallery.length : '';
    }
    function openFromItems(items, startIdx){
      gallery = items;
      galleryIdx = startIdx || 0;
      lbLastFocused = document.activeElement;
      renderSlide();
      lbOverlay.classList.add('open');
      lbOverlay.setAttribute('aria-hidden', 'false');
    }
    window.openLightboxGallery = openFromItems;

    function openGallery(triggerEl){
      var group = triggerEl.closest('[data-gallery-group]') || triggerEl.closest('.prop');
      var name = group ? (group.getAttribute('data-gallery-group') || (group.querySelector('h3') && group.querySelector('h3').textContent)) : '';
      var imgs = group ? Array.prototype.slice.call(group.querySelectorAll('img')) : [triggerEl.tagName === 'IMG' ? triggerEl : triggerEl.querySelector('img')].filter(Boolean);
      if(!imgs.length) return;
      var clickedImg = triggerEl.tagName === 'IMG' ? triggerEl : triggerEl.querySelector('img');
      var items = imgs.map(function(img){ return { src: img.currentSrc || img.src, caption: img.getAttribute('alt') || name || '' }; });
      openFromItems(items, Math.max(0, imgs.indexOf(clickedImg)));
    }
    document.querySelectorAll('[data-gallery-open]').forEach(function(el){
      el.addEventListener('click', function(){ openGallery(el); });
    });

    function showPrev(){ if(gallery.length < 2) return; galleryIdx = (galleryIdx - 1 + gallery.length) % gallery.length; renderSlide(); }
    function showNext(){ if(gallery.length < 2) return; galleryIdx = (galleryIdx + 1) % gallery.length; renderSlide(); }
    function closeLightbox(){
      lbOverlay.classList.remove('open');
      lbOverlay.setAttribute('aria-hidden', 'true');
      if(lbLastFocused) lbLastFocused.focus();
    }
    if(lbClose) lbClose.addEventListener('click', closeLightbox);
    if(lbPrev) lbPrev.addEventListener('click', showPrev);
    if(lbNext) lbNext.addEventListener('click', showNext);
    lbOverlay.addEventListener('click', function(e){ if(e.target === lbOverlay) closeLightbox(); });
    document.addEventListener('keydown', function(e){
      if(!lbOverlay.classList.contains('open')) return;
      if(e.key === 'Escape') closeLightbox();
      if(e.key === 'ArrowLeft') showPrev();
      if(e.key === 'ArrowRight') showNext();
    });
  })();

  /* ---------------- gallery category filter ---------------- */
  (function(){
    var grid = document.getElementById('galleryGrid');
    if(!grid) return;
    var figs = Array.prototype.slice.call(grid.querySelectorAll('figure'));
    var pills = document.querySelectorAll('.gallery-filters .filter-pill');
    var emptyMsg = document.getElementById('galleryEmpty');
    pills.forEach(function(p){
      p.addEventListener('click', function(){
        var cat = p.getAttribute('data-filter');
        pills.forEach(function(o){ o.setAttribute('aria-pressed', o === p ? 'true' : 'false'); });
        var visible = 0;
        figs.forEach(function(f){
          var match = cat === 'all' || f.getAttribute('data-category') === cat;
          f.style.display = match ? '' : 'none';
          if(match) visible++;
        });
        if(emptyMsg) emptyMsg.classList.toggle('show', visible === 0);
      });
    });
  })();

  /* ---------------- details modal (rooms) ---------------- */
  (function(){
    var overlay = document.getElementById('detailsOverlay');
    if(!overlay) return;
    var closeBtn = document.getElementById('detailsCloseBtn');
    var bookBtn = document.getElementById('detailsBookBtn');
    var detailsImg = document.getElementById('detailsImg');
    var detailsCount = document.getElementById('detailsCount');
    var detailsThumbs = document.getElementById('detailsThumbs');
    var detailsPrev = document.getElementById('detailsPrev');
    var detailsNext = document.getElementById('detailsNext');
    var lastFocused = null;
    var currentCard = null;
    var detailImages = [];
    var detailIdx = 0;

    function renderDetailPhoto(){
      var item = detailImages[detailIdx];
      if(!item) return;
      detailsImg.src = item.src;
      detailsImg.alt = item.caption;
      detailsCount.textContent = detailImages.length > 1 ? (detailIdx + 1) + ' / ' + detailImages.length : '';
      var multi = detailImages.length > 1;
      if(detailsPrev) detailsPrev.style.display = multi ? 'flex' : 'none';
      if(detailsNext) detailsNext.style.display = multi ? 'flex' : 'none';
      if(detailsThumbs) detailsThumbs.querySelectorAll('button').forEach(function(btn, i){ btn.classList.toggle('active', i === detailIdx); });
    }
    function openDetails(card){
      currentCard = card;
      lastFocused = document.activeElement;
      var imgs = Array.prototype.slice.call(card.querySelectorAll('.art img, .thumbs img'));
      detailImages = imgs.map(function(img){ return { src: img.src, caption: img.getAttribute('alt') || '' }; });
      detailIdx = 0;

      document.getElementById('detailsTierLoc').textContent = (card.querySelector('.tag') ? card.querySelector('.tag').textContent : '') + ', ' + (card.querySelector('.loc') ? card.querySelector('.loc').textContent : '');
      document.getElementById('detailsName').textContent = card.querySelector('h3').textContent;
      document.getElementById('detailsDesc').textContent = card.querySelector('.body p').textContent;
      document.getElementById('detailsPrice').textContent = card.querySelector('.price b').textContent;

      var amenities = (card.getAttribute('data-amenities') || '').split(',').map(function(a){ return a.trim(); }).filter(Boolean);
      var amenitiesList = document.getElementById('detailsAmenities');
      amenitiesList.innerHTML = '';
      amenities.forEach(function(a){ var li = document.createElement('li'); li.textContent = a; amenitiesList.appendChild(li); });

      if(detailsThumbs){
        detailsThumbs.innerHTML = '';
        detailImages.forEach(function(item, i){
          var btn = document.createElement('button');
          btn.type = 'button';
          var img = document.createElement('img');
          img.src = item.src; img.alt = '';
          btn.appendChild(img);
          btn.addEventListener('click', function(){ detailIdx = i; renderDetailPhoto(); });
          detailsThumbs.appendChild(btn);
        });
      }
      renderDetailPhoto();
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
    }
    function closeDetails(){
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      if(lastFocused) lastFocused.focus();
    }
    document.querySelectorAll('[data-details]').forEach(function(btn){
      btn.addEventListener('click', function(){ openDetails(btn.closest('.prop')); });
    });
    if(closeBtn) closeBtn.addEventListener('click', closeDetails);
    if(detailsPrev) detailsPrev.addEventListener('click', function(){ detailIdx = (detailIdx - 1 + detailImages.length) % detailImages.length; renderDetailPhoto(); });
    if(detailsNext) detailsNext.addEventListener('click', function(){ detailIdx = (detailIdx + 1) % detailImages.length; renderDetailPhoto(); });
    if(detailsImg) detailsImg.addEventListener('click', function(){ window.openLightboxGallery && window.openLightboxGallery(detailImages, detailIdx); });
    overlay.addEventListener('click', function(e){ if(e.target === overlay) closeDetails(); });
    if(bookBtn) bookBtn.addEventListener('click', function(){
      closeDetails();
      if(currentCard){
        var b = currentCard.querySelector('.book');
        if(b) b.click();
      }
    });
    document.addEventListener('keydown', function(e){
      if(!overlay.classList.contains('open')) return;
      if(e.key === 'Escape') closeDetails();
    });
  })();

  /* ---------------- booking modal (rooms / packages) ---------------- */
  (function(){
    var overlay = document.getElementById('bookingOverlay');
    if(!overlay) return;
    var closeBtn = document.getElementById('closeModalBtn');
    var form = document.getElementById('bookingForm');
    var confirmPanel = document.getElementById('confirmPanel');
    var bookAnotherBtn = document.getElementById('bookAnotherBtn');
    var checkinInput = document.getElementById('checkinInput');
    var nightsInput = document.getElementById('nightsInput');
    var checkoutPreview = document.getElementById('checkoutPreview');
    var nameInput = document.getElementById('nameInput');
    var emailInput = document.getElementById('emailInput');
    var lastFocused = null;
    var modalState = { rooms: 1, adults: 2, children: 0, price: 0 };

    if(checkinInput) checkinInput.min = todayISO();

    function currentBase(){
      var nights = Number(nightsInput.value) || 1;
      return modalState.price * nights * modalState.rooms;
    }
    function servicesTotal(){
      var total = 0;
      document.querySelectorAll('.service-option input:checked').forEach(function(cb){ total += Number(cb.dataset.price) || 0; });
      return total;
    }
    function updateBreakdown(){
      var nights = Number(nightsInput.value) || 1;
      var base = currentBase();
      var services = servicesTotal();
      var rowServices = document.getElementById('rowServices');
      if(rowServices){
        rowServices.style.display = services ? 'flex' : 'none';
        rowServices.querySelector('span:last-child').textContent = fmtKSh(services);
      }
      var rowBase = document.getElementById('rowBase');
      if(rowBase) rowBase.querySelector('span:last-child').textContent = fmtKSh(base);
      var nightsLabel = document.getElementById('nightsLabel');
      if(nightsLabel) nightsLabel.textContent = nights + (nights === 1 ? ' night total' : ' nights total');
      var totalPrice = document.getElementById('totalPrice');
      if(totalPrice) totalPrice.textContent = fmtKSh(base + services);

      if(checkinInput && checkinInput.value && checkoutPreview){
        var checkout = addDays(checkinInput.value, nights);
        checkoutPreview.textContent = 'Check-out ' + fmtDate(checkout);
      } else if(checkoutPreview){
        checkoutPreview.textContent = 'Check-out —';
      }
    }
    if(nightsInput) nightsInput.addEventListener('input', updateBreakdown);
    if(checkinInput) checkinInput.addEventListener('input', updateBreakdown);
    document.querySelectorAll('.service-option input').forEach(function(cb){ cb.addEventListener('change', updateBreakdown); });
    document.querySelectorAll('[data-modal-stepper]').forEach(function(el){
      var key = el.getAttribute('data-modal-stepper');
      wireStepper(el, function(v){ modalState[key] = v; updateBreakdown(); });
    });

    function openBooking(trigger){
      lastFocused = trigger || document.activeElement;
      var name = trigger.getAttribute('data-name') || 'Amani Stays';
      var loc = trigger.getAttribute('data-loc') || 'Naivasha';
      var tier = trigger.getAttribute('data-tier') || '';
      modalState.price = Number(trigger.getAttribute('data-price')) || 0;
      document.getElementById('modalPropName').textContent = name;
      document.getElementById('modalPropSub').textContent = (tier ? tier + ', ' : '') + loc;
      form.classList.remove('hide');
      confirmPanel.classList.remove('show');
      updateBreakdown();
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      if(checkinInput) checkinInput.focus();
    }
    document.querySelectorAll('[data-book]').forEach(function(btn){
      btn.addEventListener('click', function(){ openBooking(btn); });
    });
    function closeBooking(){
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      if(lastFocused) lastFocused.focus();
    }
    if(closeBtn) closeBtn.addEventListener('click', closeBooking);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) closeBooking(); });
    document.addEventListener('keydown', function(e){ if(overlay.classList.contains('open') && e.key === 'Escape') closeBooking(); });

    if(form){
      form.addEventListener('submit', function(e){
        e.preventDefault();
        var valid = true;
        [checkinInput, nameInput, emailInput].forEach(function(input){
          if(!input) return;
          var field = input.closest('.field');
          var ok = input.checkValidity();
          if(field) field.classList.toggle('invalid', !ok);
          if(!ok) valid = false;
        });
        if(!valid) return;

        var submitBtn = form.querySelector('button[type="submit"]');
        if(submitBtn) submitBtn.disabled = true;
        var nights = Number(nightsInput.value) || 1;
        var checkoutDate = addDays(checkinInput.value, nights);
        var ref = 'AS-' + Math.random().toString(36).slice(2,7).toUpperCase();
        var extraNames = [];
        document.querySelectorAll('.service-option input:checked').forEach(function(cb){ extraNames.push(cb.dataset.label || cb.value); });

        var subParts = document.getElementById('modalPropSub').textContent.split(', ');
        var propertyName = document.getElementById('modalPropName').textContent;
        var propertyLocation = subParts[subParts.length - 1];
        var datesText = fmtDate(new Date(checkinInput.value + 'T00:00:00')) + ' to ' + fmtDate(checkoutDate) + ', ' +
          modalState.adults + ' adults, ' + modalState.children + ' children, ' + modalState.rooms + (modalState.rooms === 1 ? ' room' : ' rooms') +
          (extraNames.length ? ', extras: ' + extraNames.join(', ') : '');
        sendBookingEmail({
          booking_reference: ref,
          property: propertyName,
          location: propertyLocation,
          dates: datesText,
          guest_name: nameInput.value,
          guest_email: emailInput.value,
          total: document.getElementById('totalPrice').textContent
        }).then(function(){
          document.getElementById('confirmProp').textContent = propertyName + ', ' + propertyLocation;
          document.getElementById('confirmDates').textContent = datesText;
          document.getElementById('confirmRef').textContent = ref;
          form.classList.add('hide');
          confirmPanel.classList.add('show');
        }).catch(function(){
          showToast('We could not send your booking. Please try again.');
        }).then(function(){
          if(submitBtn) submitBtn.disabled = false;
        });
      });
    }
    if(bookAnotherBtn) bookAnotherBtn.addEventListener('click', closeBooking);
  })();

  /* ---------------- faq accordion ---------------- */
  (function(){
    var items = document.querySelectorAll('.faq-item button');
    if(!items.length) return;
    items.forEach(function(btn){
      var panel = btn.nextElementSibling;
      btn.addEventListener('click', function(){
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        document.querySelectorAll('.faq-item button').forEach(function(other){
          other.setAttribute('aria-expanded', 'false');
          if(other.nextElementSibling) other.nextElementSibling.style.maxHeight = null;
        });
        if(!isOpen){
          btn.setAttribute('aria-expanded', 'true');
          if(panel) panel.style.maxHeight = panel.scrollHeight + 'px';
        }
      });
    });
  })();

  /* ---------------- faq search filter (questions page) ---------------- */
  (function(){
    var input = document.getElementById('faqSearch');
    if(!input) return;
    var items = Array.prototype.slice.call(document.querySelectorAll('.faq .faq-item'));
    var noResults = document.getElementById('faqNoResults');
    input.addEventListener('input', function(){
      var q = input.value.trim().toLowerCase();
      var visible = 0;
      items.forEach(function(item){
        var text = item.textContent.toLowerCase();
        var match = !q || text.indexOf(q) !== -1;
        item.classList.toggle('hide', !match);
        if(match) visible++;
      });
      if(noResults) noResults.classList.toggle('show', visible === 0);
    });
  })();

  /* ---------------- newsletter (footer, every page) ---------------- */
  (function(){
    var form = document.getElementById('newsletterForm');
    if(!form) return;
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var emailInput = document.getElementById('newsletterEmail');
      var email = emailInput ? emailInput.value : '';
      if(!/^\S+@\S+\.\S+$/.test(email)) return;
      showToast('Subscribed with ' + email);
      form.reset();
    });
  })();

  /* ---------------- contact form ---------------- */
  (function(){
    var form = document.getElementById('contactForm');
    if(!form) return;
    var success = document.getElementById('contactSuccess');
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var valid = true;
      form.querySelectorAll('[required]').forEach(function(input){
        var field = input.closest('.field');
        var ok = input.checkValidity();
        if(field) field.classList.toggle('invalid', !ok);
        if(!ok) valid = false;
      });
      if(!valid) return;
      var submitBtn = form.querySelector('button[type="submit"]');
      if(submitBtn) submitBtn.disabled = true;
      var fields = {};
      new FormData(form).forEach(function(value, key){ fields[key] = value; });
      fields._subject = 'New Amani Stays contact enquiry';
      fields._replyto = fields.email;
      fields._template = 'table';
      fields._captcha = 'false';
      fetch('https://formsubmit.co/ajax/amanistayshotel@gmail.com', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(fields).toString()
      }).then(function(response){
        if(!response.ok) throw new Error('Contact email failed');
        return response.json();
      }).then(function(){
        form.reset();
        form.style.display = 'none';
        if(success) success.classList.add('show');
      }).catch(function(){
        var replyTo = form.querySelector('[name="_replyto"]');
        if(replyTo) replyTo.value = fields.email;
        showToast('Opening the email service to finish sending your enquiry.');
        HTMLFormElement.prototype.submit.call(form);
      }).then(function(){
        if(submitBtn) submitBtn.disabled = false;
      });
    });
  })();

  /* ---------------- sticky mobile cta ---------------- */
  (function(){
    var bar = document.getElementById('stickyCta');
    if(!bar) return;
    var hero = document.querySelector('.hero, .page-hero');
    if(!hero){ bar.classList.add('show'); return; }
    var shown = false;
    function onScroll(){
      var pastHero = window.scrollY > hero.offsetHeight * 0.6;
      if(pastHero !== shown){
        shown = pastHero;
        bar.classList.toggle('show', shown);
      }
    }
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

})();
