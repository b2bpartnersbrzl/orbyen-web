(() => {
  const lens = document.querySelector('.lens');
  const world = lens.querySelector('.world');
  const sticky = lens.parentElement;
  const tour = sticky.parentElement;
  const mast = document.querySelector('.mast');
  const sky = document.querySelector('.intro-surface');
  const mobileOpening = sky.querySelector('.mobile-opening');
  const chapters = [...document.querySelectorAll('.chapter')];
  const spreads = chapters.map(chapter => chapter.querySelector('.spread'));
  const links = [...world.querySelectorAll('.facade-link')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const image = world.querySelector('img');
  const width = Number(image.getAttribute('width'));
  const height = Number(image.getAttribute('height'));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const districts = [.16,.60,.886];

  const menuToggle = mast.querySelector('.mast-menu-toggle');
  const menu = mast.querySelector('#mast-menu');
  const mobile = matchMedia('(max-width:800px), (max-width:980px) and (pointer:coarse)');
  const preview = new URLSearchParams(location.search).get('vista');
  const croppedPreview = preview === 'recorte';
  const menuIsOpen = () => menuToggle.getAttribute('aria-expanded') === 'true';
  function setMenu(open, restoreFocus = false) {
    menuToggle.setAttribute('aria-expanded', String(open));
    if (restoreFocus) menuToggle.focus({preventScroll:true});
  }
  menuToggle.hidden = false;
  document.documentElement.classList.add('menu-ready');
  menuToggle.addEventListener('click', () => setMenu(!menuIsOpen()));
  mobile.addEventListener('change', () => setMenu(false));
  document.addEventListener('click', event => {
    if (!menuIsOpen() || menuToggle.contains(event.target)) return;
    const link = event.target.closest('a');
    if (!menu.contains(event.target) || link) {
      setMenu(false, Boolean(link && menu.contains(link) && link.target === '_blank'));
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuIsOpen()) setMenu(false, true);
  });
  mast.addEventListener('focusout', event => {
    if (event.relatedTarget && !mast.contains(event.relatedTarget) && menuIsOpen()) setMenu(false);
  });

  // A tangent of zero at a turn avoids overshooting the frame at the stops.
  function tangent(before, after) {
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  }

  function poseAt(scroll) {
    const last = track.length - 1;
    if (scroll <= track[0].at) return track[0].pose;
    if (scroll >= track[last].at) return track[last].pose;

    const end = track.findIndex(stop => stop.at > scroll);
    const left = track[end - 1], right = track[end];
    const distance = right.at - left.at;
    const t = (scroll - left.at) / distance;
    const easing = t * t * (3 - 2 * t);
    return left.pose.map((start, key) => {
      const finish = right.pose[key];
      const slope = (finish - start) / distance;
      const prev = track[end - 2], next = track[end + 1];
      const inSlope = prev ? tangent((start - prev.pose[key]) / (left.at - prev.at), slope) : 0;
      const outSlope = next ? tangent(slope, (next.pose[key] - finish) / (next.at - right.at)) : 0;
      return start + (finish - start) * easing +
        distance * t * (1 - t) * ((1 - t) * inSlope - t * outSlope);
    });
  }

  let track, viewport, lensHeight, pinned, lensTop;
  let frame = 0, lastTime = 0, position, filtered, active = -1;
  let trip, renderedPose, handoff, dedicatedOpening;
  let previewIndex = 0, pan = 0, panGoal = 0, gesture, ignoreClickUntil = 0;

  function camera(x, y, zoom, hidden, verticalCenter = .53) {
    const visible = lensHeight - hidden;
    const scale = Math.max(viewport / width, visible / height) * zoom;
    const w = width * scale, h = height * scale;
    return [
      clamp(viewport / 2 - x * w, viewport - w, 0),
      hidden + clamp(visible * verticalCenter - y * h, visible - h, 0),
      scale
    ];
  }

  function serviceCamera(area, zoom, context) {
    const visible = lensHeight - pinned;
    const base = Math.max(viewport / width, visible / height);

    function fit([left, top, right, bottom]) {
      return Math.min((viewport - 12) / ((right - left) * width), visible / ((bottom - top) * height));
    }

    const [left, top, right, bottom] = context && fit(context) >= base ? context : area;
    const maxZoom = fit([left, top, right, bottom]) / base;
    return camera((left + right) / 2, (top + bottom) / 2, Math.max(1, Math.min(zoom,maxZoom)), pinned, .5);
  }

  function measure() {
    dedicatedOpening = mobile.matches && !croppedPreview;
    document.documentElement.classList.toggle('mobile-dedicated', dedicatedOpening);
    const desktopPaper = !mobile.matches;
    document.documentElement.classList.toggle('desktop-paper-sky', desktopPaper);
    const mastHeight = mast.offsetHeight;
    viewport = lens.clientWidth;
    const wide = viewport > 800;
    const sizes = [
      ['--service-copy-h', Math.max(...spreads.map(spread => spread.offsetHeight))],
      ['--intro-h', sky.offsetHeight],
      ['--opening-max', desktopPaper ? viewport * height / width : (wide ? viewport * height / (width * .885) : null)]
    ];
    for (const [property, height] of sizes) {
      if (height === null) tour.style.removeProperty(property);
      else {
        const value = Math.floor(height) + 'px';
        if (tour.style.getPropertyValue(property) !== value) tour.style.setProperty(property, value);
      }
    }
    lensHeight = lens.clientHeight;
    pinned = Math.max(0, mastHeight - parseFloat(getComputedStyle(sticky).top));
    const line = mastHeight + lensHeight - pinned;
    const scroll = window.scrollY;
    const chapterStarts = chapters.map(chapter => chapter.getBoundingClientRect().top + scroll - line);
    lensTop = chapterStarts[0] - pinned;
    const views = [
      serviceCamera([.118,.465,.202,.713], wide ? 1.55 : 1.42),
      serviceCamera([.519,.154,.670,.455], wide ? 1.39 : 1.32, [.519,.154,.739,.718]),
      serviceCamera([.822,document.documentElement.lang === 'en' ? .203 : .212,.987,.618], wide ? 1.95 : 1.68)
    ];
    const opening = dedicatedOpening ? camera(.52,.64,1,0) : camera(wide ? .552 : .19,0,1,0);
    sky.style.setProperty('--sky-width', width * opening[2] + 'px');
    if (desktopPaper) {
      // Share the same paper image from the headline to the skyline.
      const skyDepth = 184;
      const topTrim = sky.offsetHeight * .34;
      const introInWorld = (sky.offsetHeight + topTrim) / opening[2];
      const artHeight = introInWorld + skyDepth;
      sky.style.setProperty('--paper-sky-top', -topTrim + 'px');
      sky.style.setProperty('--paper-sky-height', artHeight * opening[2] + 'px');
      world.style.setProperty('--paper-sky-offset', -introInWorld + 'px');
      world.style.setProperty('--paper-sky-size', artHeight + 'px');
    }
    track = [
      {at:Math.max(0, lensTop), pose:opening},
      ...chapterStarts.map((at, i) => ({at,pose:views[i]}))
    ];
    if (!trip) previewFacade(previewIndex);
    if (position === undefined || !mobile.matches) position = filtered = scroll;
    schedule();
  }

  function paint(now) {
    frame = 0;
    const motion = trip;
    let progress;
    if (motion) {
      const t = clamp((now - motion.started) / motion.duration, 0, 1);
      progress = t ** 3 * (10 + t * (-15 + 6 * t));
      window.scrollTo({top:motion.from + (motion.to - motion.from) * progress, behavior:'instant'});
      if (t === 1) trip = undefined;
    }
    const scroll = window.scrollY;
    const dt = lastTime ? now - lastTime : 16;
    const isOpening = scroll <= track[0].at;
    const followFinger = gesture?.dragging || reduce.matches;
    pan += (panGoal - pan) * (followFinger ? 1 : 1 - Math.exp(-Math.min(dt,48) / 90));
    const panning = Math.abs(pan - panGoal) > .15;
    if (!panning) pan = panGoal;
    let settling = false;
    if (reduce.matches || (motion && mobile.matches)) {
      // A link trip already eases the page, so keep the image in step with it.
      position = filtered = scroll;
    } else {
      // Two damped stages preserve the camera route during fast scrolls and reversals.
      const time = mobile.matches ? Math.min(dt, 48) / 48 : Math.min(dt, 64) / 42;
      const decay = Math.exp(-time);
      position = scroll + (position - scroll + (filtered - scroll) * time) * decay;
      filtered = scroll + (filtered - scroll) * decay;
      settling = Math.abs(position - scroll) > .06 || Math.abs(filtered - scroll) > .06;
      if (!settling) position = filtered = scroll;
    }
    const hidden = clamp(scroll - lensTop, 0, pinned);
    let current = track.findIndex((stop, i) => i > 0 && position < (track[i - 1].at + stop.at) / 2) - 1;
    if (current < 0) current = track.length - 1;
    const openingDistance = Math.max(1, track[1].at - track[0].at);
    const departure = clamp((position - track[0].at) / openingDistance, 0, 1);
    const panWeight = 1 - departure * departure * (3 - 2 * departure);
    const [left, top, zoom] = reduce.matches ? track[current].pose : poseAt(position);
    let pose = [left + pan * panWeight, top, zoom];
    if (motion?.cameraFrom) {
      pose = motion.cameraFrom.map((start, i) => start + (motion.cameraTo[i] - start) * progress);
    } else if (handoff) {
      const remaining = 1 - clamp((now - handoff.started) / 210, 0, 1);
      pose = pose.map((value, i) => value + (handoff.pose[i] - value) * remaining ** 2);
      if (!remaining || reduce.matches) handoff = undefined;
    }
    const scale = Math.max(pose[2], viewport / width, (lensHeight - hidden) / height);
    const x = clamp(pose[0], Math.min(0,viewport - width * scale), 0);
    const y = clamp(pose[1], lensHeight - height * scale, hidden);
    if (isOpening) sky.style.setProperty('--sky-left', x + 'px');
    if (dedicatedOpening) {
      const fadeStart = track[0].at - 12;
      const fadeEnd = Math.max(fadeStart + 1, track[1].at);
      const blend = clamp((scroll - fadeStart) / (fadeEnd - fadeStart),0,1);
      const opacity = 1 - blend * blend * (3 - 2 * blend);
      sky.style.setProperty('--mobile-art-opacity', reduce.matches ? (blend < 1 ? '1' : '0') : String(opacity));
      mobileOpening.inert = blend > .96;
    }
    renderedPose = [x,y,scale];
    world.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) scale(' + scale + ')';

    if (current !== active) {
      links.forEach((link, i) => {
        if (i === current - 1) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      active = current;
    }
    lastTime = settling || panning || trip || handoff ? now : 0;
    if (lastTime) schedule();
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(paint);
  }
  function stopTrip() {
    if (trip?.cameraFrom && renderedPose) handoff = {pose:renderedPose,started:performance.now()};
    trip = undefined;
    if (handoff) schedule();
  }
  mast.querySelector('.mast-home').addEventListener('click', stopTrip);

  function previewFacade(index) {
    if (dedicatedOpening) {
      pan = panGoal = 0;
      return;
    }
    previewIndex = clamp(index,0,districts.length-1);
    const [left,,scale] = track[0].pose;
    const span = width * scale;
    panGoal = clamp(viewport / 2 - districts[previewIndex] * span, viewport - span, 0) - left;
    schedule();
  }
  lens.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || !event.isPrimary) return;
    const link = event.target.closest('.facade-link');
    const opening = mobile.matches && !dedicatedOpening && scrollY <= track[0].at;
    if (!opening && !link) return;
    gesture = {id:event.pointerId, x:event.clientX, y:event.clientY, opening, link, pan};
    if (link) event.preventDefault();
  });
  lens.addEventListener('pointermove', event => {
    if (!gesture?.opening || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      gesture.dragging = true;
    }
    if (!gesture.dragging) return;
    const [left,,scale] = track[0].pose;
    panGoal = clamp(left + gesture.pan + dx, viewport - width * scale, 0) - left;
    schedule();
  });
  lens.addEventListener('pointercancel', () => {
    if (gesture?.dragging) previewFacade(previewIndex);
    gesture = undefined;
  });
  lens.addEventListener('pointerup', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (gesture.dragging || (gesture.opening && Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy) * 1.4)) {
      const step = Math.abs(dx) > 38 ? (dx < 0 ? 1 : -1) : 0;
      previewFacade(previewIndex + step);
      ignoreClickUntil = performance.now() + 350;
    } else if (gesture.link && Math.hypot(dx,dy) < 12) {
      // Activate before the browser tries to scroll a moving facade into focus.
      event.preventDefault();
      ignoreClickUntil = performance.now() + 350;
      gesture.link.click();
    }
    gesture = undefined;
  });
  links.forEach((link, index) => {
    link.addEventListener('focus', () => {
      if (link.matches(':focus-visible') && scrollY <= track[0].at) previewFacade(index);
    });
  });
  lens.addEventListener('click', event => {
    if (event.detail && performance.now() < ignoreClickUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  },true);

  const serviceLinks = [
    ...links, ...mobileOpening.querySelectorAll('.mobile-city-link'),
    ...document.querySelectorAll('.service-nav a'), mast.querySelector('a[href="#endereco"]')
  ];
  serviceLinks.forEach(link => link.addEventListener('click', event => {
    if (reduce.matches || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    const index = chapters.findIndex(chapter => link.hash === '#' + chapter.id);
    const from = window.scrollY;
    const to = Math.min(track[index + 1].at, document.documentElement.scrollHeight - innerHeight);
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    chapters[index].focus({preventScroll:true});
    const direct = mobile.matches && (dedicatedOpening || previewIndex !== 0) && from <= track[0].at && renderedPose;
    handoff = undefined;
    trip = {
      from, to, started:performance.now(),
      duration:mobile.matches
        ? clamp(420 + Math.abs(to - from) * .65, 540, 1250)
        : clamp(480 + Math.abs(to - from) * .54, 520, 1600),
      cameraFrom:direct ? renderedPose : undefined,
      cameraTo:track[index + 1].pose
    };
    schedule();
  }));
  for (const type of ['wheel', 'touchstart', 'pointerdown', 'popstate', 'resize']) {
    addEventListener(type, stopTrip, {passive:true});
  }
  addEventListener('keydown', event => {
    if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) stopTrip();
  });
  reduce.addEventListener('change', stopTrip);
  const contactSection = document.getElementById('contato');
  let languagePosition;

  function scrollLandmarks() {
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    const contactTop = contactSection.getBoundingClientRect().top + scrollY - mast.offsetHeight;
    const offsets = [0, ...track.slice(1).map(stop => stop.at), contactTop, maxScroll];
    return offsets.map(offset => clamp(offset,0,maxScroll));
  }

  document.addEventListener('orbyen:antes-idioma', () => {
    stopTrip();
    const landmarks = scrollLandmarks();
    const next = landmarks.findIndex(offset => offset > scrollY);
    const index = next < 0 ? landmarks.length - 2 : next - 1;
    const interval = landmarks[index + 1] - landmarks[index];
    const fraction = next < 0 ? 1 : interval ? (scrollY - landmarks[index]) / interval : 0;
    languagePosition = {index,fraction};
  });
  document.addEventListener('orbyen:idioma', () => {
    measure();
    if (!languagePosition) return;
    const {index,fraction} = languagePosition;
    languagePosition = undefined;
    const landmarks = scrollLandmarks();
    const top = landmarks[index] + fraction * (landmarks[index + 1] - landmarks[index]);
    window.scrollTo({top,behavior:'instant'});
    handoff = undefined;
    position = filtered = window.scrollY;
    schedule();
  });
  document.documentElement.classList.add('live');
  measure();
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('pageshow', measure);
  addEventListener('resize', measure);
  reduce.addEventListener('change', measure);
  const resize = new ResizeObserver(measure);
  [mast, lens, sky, ...spreads].forEach(el => resize.observe(el));
})();
