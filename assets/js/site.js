/* Ayaan & Mehboob Valet Parking — the whole script, replacing the 27 the old
   theme loaded. Everything here is an enhancement: with JavaScript off the
   pages still read, navigate, and let someone call or message. The FAQ uses
   native <details>, so it opens and closes without any script at all. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- mobile navigation ---- */
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', String(!open));
      burger.setAttribute('aria-expanded', String(!open));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.getAttribute('data-open') === 'true') {
        nav.setAttribute('data-open', 'false');
        burger.setAttribute('aria-expanded', 'false');
        burger.focus();
      }
    });
  }

  /* ---- reveal on scroll ----
     .reveal starts things hidden, so it is only applied when motion is welcome
     AND the observer exists. Otherwise the markup is untouched and visible. */
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
      // Anything already on screen at load is shown immediately. Without this a
      // section sitting at the fold stays blank until the reader happens to
      // scroll, which looks like a broken page rather than an animation.
      // Only skip the animation for things comfortably on screen. An element
      // just peeking in at the very bottom should still animate as it arrives.
      var box = el.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.85 && box.bottom > 0) {
        el.setAttribute('data-seen', 'true');
        return;
      }
      io.observe(el);
    });
  }

  /* ---- the three cards over the hero ----
     They overlap the bottom of the hero, so before any scrolling they would sit
     on top of the hero image. Hold them hidden until the reader scrolls, then
     let them rise into place. The attribute is only added here, so with
     JavaScript off the cards are plain and visible. */
  var trio = document.querySelector('.trio');
  if (trio) {
    trio.setAttribute('data-hold', 'true');
    var release = function () {
      if (window.scrollY > 30) {
        trio.setAttribute('data-hold', 'false');
        window.removeEventListener('scroll', release);
      }
    };
    window.addEventListener('scroll', release, { passive: true });
    // Covers a reload part-way down the page, where no scroll event fires.
    release();
  }

  /* ---- back to top ----
     Appears once the reader is a screen or so down, so it is not sitting there
     on arrival. Scroll behaviour follows the reduced-motion preference. */
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

  /* ---- enquiry form -------------------------------------------------------
     A static site cannot send email on its own, so the form posts to Web3Forms,
     which delivers it to TO_EMAIL. Only ACCESS_KEY needs filling in; the key is
     public by design and is tied to the destination address, so it cannot be
     used to send anywhere else.

     Until the key is set the form does NOT pretend to send. It hands the
     enquiry to WhatsApp with the text already written, which is how this
     business actually receives work. Quietly failing would be the worst
     outcome, because the customer would believe they had got through.

     To replace Web3Forms later with a handler that sends through the company's
     own mailbox, change ENDPOINT and the body built in send(). Nothing else
     in the page depends on the provider.                                    */
  var ACCESS_KEY = '';                                  // paste the Web3Forms key here
  var ENDPOINT = 'https://api.web3forms.com/submit';
  var TO_EMAIL = 'Info@ayaanvaletparking.com';
  var WHATSAPP = '971501309630';

  var forms = [].slice.call(document.querySelectorAll('form[data-enquiry]'));
  forms.forEach(function (form) {
    var out = form.querySelector('.msg');
    var btn = form.querySelector('button[type=submit]');
    var label = btn ? btn.textContent : 'Send Message';

    var say = function (text, ok) {
      out.textContent = text;
      out.className = 'msg ' + (ok ? 'msg--ok' : 'msg--bad');
      out.setAttribute('data-show', 'true');
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var val = function (k) { return (d.get(k) || '').toString().trim(); };
      var name = val('name'), phone = val('phone'), email = val('email'),
          service = val('service'), message = val('message');

      // Spam bots fill every field they find. A human never sees this one.
      if (val('company')) return;

      if (!name || !phone) {
        say('Please add your name and a phone number so we can reply.', false);
        return;
      }

      if (!ACCESS_KEY) {
        var lines = ['Valet enquiry', 'Name: ' + name, 'Phone: ' + phone,
                     email ? 'Email: ' + email : '', service ? 'Service: ' + service : '',
                     message ? 'Message: ' + message : ''].filter(Boolean).join('\n');
        window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lines), '_blank', 'noopener');
        say('Opening WhatsApp with your enquiry ready to send.', true);
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Sending…';

      var payload = {
        access_key: ACCESS_KEY,
        to: TO_EMAIL,
        subject: 'Valet enquiry from ' + name,
        from_name: 'Ayaan & Mehboob website',
        // So hitting reply in the inbox goes to the customer, not into a void.
        replyto: email || undefined,
        Name: name,
        Phone: phone,
        Email: email || '(not given)',
        Service: service || '(not given)',
        Message: message || '(none)',
        Page: location.pathname.split('/').pop() || 'index.html',
      };

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (r) { return r.json().catch(function () { return { success: r.ok }; }); })
        .then(function (j) {
          if (!j || !j.success) throw new Error((j && j.message) || 'rejected');
          form.reset();
          say('Thank you. We have your enquiry and will call you back shortly.', true);
        })
        .catch(function () {
          // Never claim it sent. Give them a route that works instead.
          say('That did not send. Please call +971 50 130 9630 or message us on WhatsApp.', false);
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = label;
        });
    });
  });
})();
