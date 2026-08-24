/* AYAAN Valet Parking — version 2.
   No framework. Everything here is an enhancement: with JavaScript off the
   pages still read, navigate, and let someone call or message. The FAQ uses
   native <details>, so it works with no script at all. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- navigation -------------------------------------------------------
     The old site's menu jumped: it appeared instantly, trapped no focus, and
     left the page scrolling underneath. This one slides, holds focus inside
     while open, closes on Escape, on a link, and on a click outside, and locks
     the page behind it. */
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('nav');

  if (burger && nav) {
    var setOpen = function (open) {
      nav.setAttribute('data-open', String(open));
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        var first = nav.querySelector('a');
        if (first) first.focus();
      }
    };
    var isOpen = function () { return nav.getAttribute('data-open') === 'true'; };

    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!isOpen());
    });

    // A link closes the menu; without this the panel stays over the new page
    // on browsers that restore scroll position.
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setOpen(false);
    });

    document.addEventListener('click', function (e) {
      if (isOpen() && !nav.contains(e.target) && e.target !== burger) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { setOpen(false); burger.focus(); return; }
      if (e.key !== 'Tab') return;
      // Keep tabbing inside the open panel rather than wandering behind it.
      var items = nav.querySelectorAll('a');
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // Returning to a wide window with the menu open leaves the body locked.
    window.addEventListener('resize', function () {
      if (window.innerWidth > 920 && isOpen()) setOpen(false);
    });
  }

  /* ---- header on scroll ----
     Slims once the reader moves, so the menu takes less room on the way down
     without animating on every frame. */
  var hdr = document.querySelector('.hdr');
  if (hdr) {
    // Two thresholds, not one. A single cutoff means a scroll position sitting
    // exactly on it can flip the state on every frame; the gap between 90 and 40
    // makes that impossible even if something else nudges the page.
    var lastState = false;
    var onScroll = function () {
      var y = window.scrollY;
      var state = lastState ? y > 40 : y > 90;
      if (state !== lastState) { hdr.setAttribute('data-scrolled', String(state)); lastState = state; }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- in-page anchors ----
     Smooth, and offset by the sticky header so a target does not land under it.
     Honours the reduced-motion preference. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (!id || id === '#') return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    var offset = (hdr ? hdr.offsetHeight : 0) + 12;
    var top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---- reveal on scroll ----
     Applied by JS only, so with scripting off nothing is hidden. Anything
     already on screen at load is shown at once rather than waiting for a
     scroll that may never come. */
  var targets = [].slice.call(document.querySelectorAll('[data-reveal]'));
  if (!reduced && 'IntersectionObserver' in window && targets.length) {
    targets.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute('data-seen', 'true');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
    targets.forEach(function (el) {
      var box = el.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.9 && box.bottom > 0) {
        el.setAttribute('data-seen', 'true');
        return;
      }
      io.observe(el);
    });
  }

  /* ---- back to top ---- */
  var toTop = document.querySelector('.totop');
  if (toTop) {
    var showAt = function () {
      toTop.setAttribute('data-show', String(window.scrollY > window.innerHeight * 0.8));
    };
    window.addEventListener('scroll', showAt, { passive: true });
    showAt();
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ---- enquiry form ----
     Posts to Web3Forms, which delivers to TO_EMAIL. Only ACCESS_KEY needs
     filling in. Until it is set the form does NOT pretend to send: it hands the
     enquiry to WhatsApp with the message already written, because a form that
     silently swallows an enquiry is worse than one that errors. */
  var ACCESS_KEY = '';
  var ENDPOINT = 'https://api.web3forms.com/submit';
  var TO_EMAIL = 'info@ayaanvaletparking.com';
  var WHATSAPP = '971501309630';

  [].slice.call(document.querySelectorAll('form[data-enquiry]')).forEach(function (form) {
    var out = form.querySelector('.msg');
    var btn = form.querySelector('button[type=submit]');
    var label = btn ? btn.textContent : 'Send';
    var say = function (text, ok) {
      out.textContent = text;
      out.className = 'msg ' + (ok ? 'msg--ok' : 'msg--bad');
      out.setAttribute('data-show', 'true');
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var v = function (k) { return (d.get(k) || '').toString().trim(); };
      var name = v('name'), phone = v('phone'), email = v('email'),
          service = v('service'), message = v('message');

      if (v('company')) return;              // honeypot: only bots fill this
      if (!name || !phone) {
        say('Please add your name and a phone number so we can reply.', false);
        return;
      }

      if (!ACCESS_KEY) {
        var lines = ['Valet enquiry', 'Name: ' + name, 'Phone: ' + phone,
                     email ? 'Email: ' + email : '', service ? 'Venue: ' + service : '',
                     message ? 'Details: ' + message : ''].filter(Boolean).join('\n');
        window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lines), '_blank', 'noopener');
        say('Opening WhatsApp with your enquiry ready to send.', true);
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Sending…';
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: ACCESS_KEY, to: TO_EMAIL,
          subject: 'Valet enquiry from ' + name,
          from_name: 'AYAAN website',
          replyto: email || undefined,
          Name: name, Phone: phone, Email: email || '(not given)',
          Venue: service || '(not given)', Message: message || '(none)',
          Page: location.pathname.split('/').pop() || 'index.html',
        }),
      })
        .then(function (r) { return r.json().catch(function () { return { success: r.ok }; }); })
        .then(function (j) {
          if (!j || !j.success) throw new Error('rejected');
          form.reset();
          say('Thank you. We have your enquiry and will come back to you shortly.', true);
        })
        .catch(function () {
          say('That did not send. Please call ' + '+971 50 130 9630' + ' or message us on WhatsApp.', false);
        })
        .finally(function () { btn.disabled = false; btn.textContent = label; });
    });
  });
})();
